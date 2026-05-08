"""
Deployment runtime matcher with ONNX-first inference and domain-aware reranking.

Why this version:
- Keeps ONNX as the default runtime backend.
- Enforces embedding/index dimension consistency with clear errors.
- Reduces false cross-domain neighbors by reranking FAISS candidates using
  domain-centric overlap signals from occupation metadata.
"""

import csv
import json
import re
from pathlib import Path
from typing import Dict, List, Set

import faiss
import numpy as np

TOKEN_ALIASES = {
    "cybersecurity": {"cyber", "security", "information", "computer", "network"},
    "cyber": {"cybersecurity", "security", "information", "computer", "network"},
    "network": {"network", "system", "telecommunication", "infrastructure", "computer"},
    "soc": {"security", "operation", "monitoring", "incident", "cyber"},
    "threat": {"security", "risk", "incident", "detection"},
    "detection": {"monitoring", "analysis", "security", "incident"},
    "incident": {"security", "response", "monitoring", "threat"},
    "response": {"incident", "security", "operation"},
    "python": {"python", "programming", "software", "developer", "computer"},
    "javascript": {"javascript", "web", "programming", "software", "developer"},
    "database": {"database", "sql", "data", "programming", "computer"},
    "programming": {"programming", "programmer", "developer", "software", "computer"},
    "programmer": {"programming", "programmer", "developer", "software", "computer"},
    "developer": {"developer", "programming", "software", "web", "computer"},
    "web": {"web", "developer", "javascript", "software", "programming"},
    "software": {"software", "developer", "programming", "computer", "application"},
    "validation": {"validation", "quality", "testing", "verification"},
}

CYBER_HINTS = {
    "cyber", "cybersecurity", "security", "network", "soc", "threat",
    "detection", "incident", "response", "information", "computer",
    "telecommunication", "system", "risk",
}

SOFTWARE_HINTS = {
    "python", "javascript", "database", "sql", "developer", "programming",
    "programmer", "software", "web", "computer", "application", "architect",
}

ROLE_HINTS = {"analyst", "engineer", "architect", "developer", "programmer", "administrator"}
PHYSICAL_SECURITY_HINTS = {"guard", "patrol", "police", "officer", "watch"}
TRANSPORT_HINTS = {"bridge", "lock", "tender", "traffic", "controller", "dispatcher"}
MANUFACTURING_HINTS = {"validation", "quality", "production", "processing", "mechanical"}
COMMON_STOPWORDS = {"and", "or", "the", "for", "with", "into", "from", "that", "this"}


def _normalize_text(value: str) -> str:
    value = str(value).lower()
    value = re.sub(r"[^a-z0-9+#/&\-\s]", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def _normalize_title_list(values) -> List[str]:
    if not isinstance(values, list):
        return []
    normalized = []
    seen = set()
    for value in values:
        text = _normalize_text(value)
        if not text:
            continue
        if text in seen:
            continue
        seen.add(text)
        normalized.append(text)
    return normalized


def _normalize_set(values: List[str]) -> set:
    normalized = {_normalize_text(v) for v in values if str(v).strip()}
    return {v for v in normalized if v}


def _safe_list(value) -> List[str]:
    if isinstance(value, list):
        return value
    return []


def _canonicalize_token(token: str) -> str:
    token = _normalize_text(token)
    if token.endswith("sis") or token.endswith("ics"):
        return token
    if token.endswith("ies") and len(token) > 4:
        return token[:-3] + "y"
    if token.endswith("es") and len(token) > 4:
        return token[:-2]
    if token.endswith("s") and len(token) > 3 and not token.endswith("ss"):
        return token[:-1]
    return token


def _expand_token(token: str) -> set:
    canonical = _canonicalize_token(token)
    if not canonical or canonical in COMMON_STOPWORDS:
        return set()
    expanded = {canonical}
    expanded.update(TOKEN_ALIASES.get(canonical, set()))
    return {_canonicalize_token(item) for item in expanded if _canonicalize_token(item)}


def _tokenize_values(values: List[str]) -> set:
    tokens = set()
    for value in values:
        normalized = _normalize_text(value)
        for piece in normalized.split():
            tokens.update(_expand_token(piece))
    return tokens


def _mean_pool_numpy(last_hidden_state: np.ndarray, attention_mask: np.ndarray) -> np.ndarray:
    """
    Mean-pool token embeddings using attention mask.
    Shapes:
      - last_hidden_state: [batch, seq_len, hidden]
      - attention_mask:    [batch, seq_len]
    """
    expanded_mask = np.expand_dims(attention_mask.astype(np.float32), axis=-1)
    summed = (last_hidden_state * expanded_mask).sum(axis=1)
    denom = np.clip(expanded_mask.sum(axis=1), a_min=1e-9, a_max=None)
    return summed / denom


class JobMatcher:
    def __init__(
        self,
        models_dir: str = "models",
        use_onnx: bool = True,
        rerank_multiplier: int = 3
    ):
        self.models_dir = self._resolve_models_dir(models_dir)
        self.use_onnx = use_onnx
        self.rerank_multiplier = max(1, int(rerank_multiplier))

        index_path = self.models_dir / "onet_embeddings.faiss"
        meta_path = self.models_dir / "occupation_metadata.json"
        if not index_path.exists():
            raise FileNotFoundError(f"FAISS index not found: {index_path}")
        if not meta_path.exists():
            raise FileNotFoundError(f"Metadata not found: {meta_path}")

        self.index = faiss.read_index(str(index_path))
        self.embedding_dim = int(self.index.d)

        with open(meta_path, "r", encoding="utf-8") as f:
            self.metadata = json.load(f)

        self._build_rerank_profiles()
        self._load_alternate_titles()

        if use_onnx:
            self._load_onnx_model()
        else:
            self._load_standard_model()

    @staticmethod
    def _resolve_models_dir(models_dir: str) -> Path:
        """
        Resolve model directory robustly regardless of current working directory.
        Priority:
        1) absolute path
        2) path relative to this script directory
        3) path relative to ml root
        """
        raw = Path(models_dir)
        if raw.is_absolute():
            return raw

        script_dir = Path(__file__).resolve().parent
        ml_root = Path(__file__).resolve().parents[2]

        candidate_script = (script_dir / raw).resolve()
        if candidate_script.exists():
            return candidate_script

        candidate_ml = (ml_root / raw).resolve()
        return candidate_ml

    def _build_rerank_profiles(self):
        self.occupation_profiles = []
        token_document_frequency = {}

        for occ in self.metadata:
            title = occ.get("title", "")
            title_tokens = _tokenize_values([title])
            domain_values = (
                _safe_list(occ.get("core_competencies")) +
                _safe_list(occ.get("knowledge")) +
                _safe_list(occ.get("technology_skills"))
            )
            domain_tokens = _tokenize_values(domain_values + [title])
            tech_tokens = domain_tokens & (CYBER_HINTS | SOFTWARE_HINTS)

            profile = {
                "title_tokens": title_tokens,
                "domain_tokens": domain_tokens,
                "core_phrases": _normalize_set(_safe_list(occ.get("core_competencies"))),
                "is_tech_security": bool(domain_tokens & {"information", "computer", "network", "telecommunication", "cyber", "system", "security"}),
                "is_software": bool(domain_tokens & {"database", "developer", "programmer", "programming", "software", "web", "application", "computer", "architect"}),
                "is_role_professional": bool(title_tokens & ROLE_HINTS),
                "is_physical_security": bool(title_tokens & PHYSICAL_SECURITY_HINTS),
                "is_transport": bool(title_tokens & TRANSPORT_HINTS),
                "is_manufacturing": bool(title_tokens & MANUFACTURING_HINTS),
                "tech_tokens": tech_tokens,
            }
            self.occupation_profiles.append(profile)

            for token in domain_tokens:
                token_document_frequency[token] = token_document_frequency.get(token, 0) + 1

        total_docs = max(1, len(self.occupation_profiles))
        self.token_idf = {
            token: float(np.log((1 + total_docs) / (1 + freq)) + 1.0)
            for token, freq in token_document_frequency.items()
        }

    def _load_alternate_titles(self):
        """
        Load alternate_titles.csv and index by standard title.
        Expected headers: O*NET-SOC Code, Title, Alternate Title, Short Title, Source(s)
        """
        self.alternate_titles_map = {}
        csv_path = self.models_dir.parent / "data" / "alternate_titles.csv"
        
        if not csv_path.exists():
            # Fallback to local check if not in data dir
            csv_path = self.models_dir / "alternate_titles.csv"

        if not csv_path.exists():
            return

        try:
            with open(csv_path, mode='r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    std_title = row.get("Title")
                    alt_title = row.get("Alternate Title")
                    sources = row.get("Source(s)", "")
                    
                    if not std_title or not alt_title:
                        continue
                        
                    source_count = len([s for s in sources.split(',') if s.strip()])
                    
                    if std_title not in self.alternate_titles_map:
                        self.alternate_titles_map[std_title] = []
                    
                    self.alternate_titles_map[std_title].append({
                        "title": alt_title,
                        "source_count": source_count,
                        "tokens": _tokenize_values([alt_title])
                    })
        except Exception as e:
            print(f"Warning: Failed to load alternate titles: {e}")

    def _select_top_alternates(self, std_title: str, candidate_tokens: Set[str], top_k: int = 5) -> List[str]:
        alternates = self.alternate_titles_map.get(std_title, [])
        if not alternates:
            return []

        scored = []
        for alt in alternates:
            # Score based on token overlap with candidate skills (primary)
            overlap = len(alt["tokens"] & candidate_tokens)
            # Popularity bonus (secondary)
            popularity = alt["source_count"] * 0.1
            # Penalty for very long titles to keep UI clean
            length_penalty = len(alt["title"]) * 0.005
            
            score = overlap + popularity - length_penalty
            scored.append((score, alt["title"]))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [item[1] for item in scored[:top_k]]

    def _weighted_token_overlap(self, query_tokens: set, doc_tokens: set) -> float:
        if not query_tokens:
            return 0.0
        intersection = query_tokens & doc_tokens
        if not intersection:
            return 0.0

        numerator = sum(self.token_idf.get(token, 1.0) for token in intersection)
        denominator = sum(self.token_idf.get(token, 1.0) for token in query_tokens)
        if denominator <= 0:
            return 0.0
        return float(numerator / denominator)

    def _load_onnx_model(self):
        from optimum.onnxruntime import ORTModelForFeatureExtraction
        from transformers import AutoTokenizer

        model_path = self.models_dir / "jobbert_v2_onnx"
        self.model = ORTModelForFeatureExtraction.from_pretrained(str(model_path))
        self.tokenizer = AutoTokenizer.from_pretrained(str(model_path))
        self.is_onnx = True

    def _load_standard_model(self):
        from sentence_transformers import SentenceTransformer

        self.model = SentenceTransformer("TechWolf/JobBERT-v2", device="cpu")
        self.model.eval()
        self.is_onnx = False

    def _build_candidate_text(self, skills: List[str]) -> str:
        skills_text = ", ".join(skills)
        return (
            f"Candidate profile. Core competencies: {skills_text}. "
            f"Primary domain skills: {skills_text}."
        )

    def _embed_candidate(self, skills: List[str]) -> np.ndarray:
        text = self._build_candidate_text(skills)

        if self.is_onnx:
            max_len = getattr(self.tokenizer, "model_max_length", 128)
            if not isinstance(max_len, int) or max_len <= 0 or max_len > 2048:
                max_len = 128

            inputs = self.tokenizer(
                [text],
                return_tensors="np",
                padding=True,
                truncation=True,
                max_length=min(max_len, 256)
            )
            outputs = self.model(**inputs)
            token_embeddings = np.asarray(outputs.last_hidden_state, dtype=np.float32)
            attention_mask = np.asarray(inputs["attention_mask"])
            embedding = _mean_pool_numpy(token_embeddings, attention_mask)
        else:
            embedding = self.model.encode([text], convert_to_numpy=True, normalize_embeddings=False)
            embedding = np.asarray(embedding, dtype=np.float32)

        if embedding.ndim == 1:
            embedding = embedding.reshape(1, -1)

        if embedding.shape[1] != self.embedding_dim:
            raise RuntimeError(
                "Embedding dimension mismatch. "
                f"FAISS index expects {self.embedding_dim}, but query embedding is {embedding.shape[1]}. "
                "Rebuild the FAISS index and ONNX artifacts with the same embedding backend."
            )

        faiss.normalize_L2(embedding)
        return embedding

    def _compute_overlap(self, candidate_skills: List[str], occupation_competencies: List[str]) -> Dict[str, List[str]]:
        candidate_set = _normalize_set(candidate_skills)
        occ_set = _normalize_set(occupation_competencies)
        matched = candidate_set & occ_set
        missing = occ_set - candidate_set
        return {
            "matched": sorted(list(matched)),
            "missing": sorted(list(missing))
        }

    def _rerank_score(self, candidate_skills: List[str], occ: Dict, profile: Dict, cosine_score: float) -> Dict[str, float]:
        candidate_terms = _normalize_set(candidate_skills)
        candidate_tokens = _tokenize_values(candidate_skills)
        ability_set = _normalize_set(_safe_list(occ.get("abilities")))

        denom = max(1, len(candidate_terms))
        core_overlap = len(candidate_terms & profile["core_phrases"]) / denom
        ability_overlap = len(candidate_terms & ability_set) / denom
        token_overlap = self._weighted_token_overlap(candidate_tokens, profile["domain_tokens"])
        title_overlap = self._weighted_token_overlap(candidate_tokens, profile["title_tokens"])

        candidate_is_cyber = bool(candidate_tokens & CYBER_HINTS)
        candidate_is_software = bool(candidate_tokens & SOFTWARE_HINTS)
        tech_alignment = self._weighted_token_overlap(candidate_tokens & (CYBER_HINTS | SOFTWARE_HINTS), profile["tech_tokens"])

        # Penalize "generic cognition only" matches with no domain-core signal.
        domain_penalty = 0.08 if core_overlap == 0 and title_overlap == 0 and ability_overlap > 0 else 0.0

        final_score = cosine_score + (0.12 * core_overlap) + (0.28 * token_overlap) + (0.16 * title_overlap) + (0.12 * tech_alignment) - domain_penalty

        if candidate_is_cyber:
            if profile["is_tech_security"]:
                final_score += 0.10
            if profile["is_role_professional"]:
                final_score += 0.04
            if profile["is_physical_security"]:
                final_score -= 0.08
            if profile["is_transport"]:
                final_score -= 0.12

        if candidate_is_software:
            if profile["is_software"]:
                final_score += 0.10
            if profile["is_role_professional"]:
                final_score += 0.04
            if profile["is_manufacturing"] and not profile["is_software"]:
                final_score -= 0.06

        return {
            "final_score": float(final_score),
            "core_overlap": float(core_overlap),
            "ability_overlap": float(ability_overlap),
            "title_overlap": float(title_overlap),
            "token_overlap": float(token_overlap),
            "tech_alignment": float(tech_alignment),
            "domain_penalty": float(domain_penalty),
        }

    def match(
        self,
        candidate_skills: List[str],
        top_n: int = 10,
        include_overlap: bool = True,
        candidate_titles: List[str] = None
    ) -> List[Dict]:
        if not candidate_skills:
            raise ValueError("candidate_skills cannot be empty")

        top_n = max(1, int(top_n))
        candidate_embedding = self._embed_candidate(candidate_skills)

        normalized_candidate_titles = _normalize_title_list(candidate_titles)
        has_title_constraint = len(normalized_candidate_titles) > 0
        # In constrained in-field mode, search the full index so mapped titles
        # are not accidentally excluded by a narrow ANN pre-candidate window.
        if has_title_constraint:
            initial_k = self.index.ntotal
        else:
            initial_k = min(self.index.ntotal, max(top_n, top_n * self.rerank_multiplier))
        scores, indices = self.index.search(candidate_embedding, initial_k)

        results = []
        for cosine_score, idx in zip(scores[0], indices[0]):
            if idx < 0 or idx >= len(self.metadata):
                continue

            occ = self.metadata[idx]
            occ_title_normalized = _normalize_text(occ.get("title", ""))
            if has_title_constraint:
                title_match = False
                for candidate_title in normalized_candidate_titles:
                    if occ_title_normalized == candidate_title:
                        title_match = True
                        break
                    if occ_title_normalized in candidate_title or candidate_title in occ_title_normalized:
                        title_match = True
                        break
                if not title_match:
                    continue

            profile = self.occupation_profiles[idx]
            rerank = self._rerank_score(candidate_skills, occ, profile, float(cosine_score))

            all_comp = _safe_list(occ.get("competencies"))
            if not all_comp:
                all_comp = _safe_list(occ.get("core_competencies"))

            result = {
                "title": occ.get("title", "Unknown"),
                "cosine_score": float(cosine_score),
                "score": rerank["final_score"],
                "final_score": rerank["final_score"],
                "all_competencies": all_comp,
                "core_overlap": rerank["core_overlap"],
                "token_overlap": rerank["token_overlap"],
                "title_overlap": rerank["title_overlap"],
                "tech_alignment": rerank["tech_alignment"],
                "domain_penalty": rerank["domain_penalty"],
            }

            if include_overlap:
                overlap = self._compute_overlap(candidate_skills, all_comp)
                result["matched_competencies"] = overlap["matched"]
                result["missing_competencies"] = overlap["missing"]
                result["match_percentage"] = (
                    len(overlap["matched"]) / len(all_comp) * 100
                    if all_comp else 0
                )

            # Add Top 3 Alternate Titles
            candidate_tokens = _tokenize_values(candidate_skills)
            result["top_alternates"] = self._select_top_alternates(result["title"], candidate_tokens, top_k=5)

            results.append(result)

        results.sort(key=lambda r: r["final_score"], reverse=True)
        return results[:top_n]

    def batch_match(self, candidates: List[Dict[str, List[str]]], top_n: int = 10) -> List[List[Dict]]:
        all_results = []
        for candidate in candidates:
            skills = candidate.get("skills", [])
            all_results.append(self.match(skills, top_n=top_n, include_overlap=True))
        return all_results


def main():
    default_models_dir = Path(__file__).resolve().parents[2] / "models"
    matcher = JobMatcher(models_dir=str(default_models_dir), use_onnx=True)

    candidate_1_skills = [
        "Cybersecurity Monitoring",
        "Threat Detection & Response",
        "Network Security",
        "Security Operations (SOC)",
        "Risk Management",
        "Active Listening",
        "Critical Thinking",
        "Speaking",
        "Reading Comprehension",
        "Judgment and Decision Making",
        "Artistic",
        "Social",
        "Mathematical Reasoning",
        "Oral Expression",
        "Problem Sensitivity",
        "Oral Comprehension",
        "Deductive Reasoning",
        "Written Comprehension",
    ]

    candidate_2_skills = [
        "Python",
        "JavaScript",
        "Critical Thinking",
        "Problem Solving",
        "Database Management"
    ]

    candidates = [
        {"id": 1, "skills": candidate_1_skills},
        {"id": 2, "skills": candidate_2_skills}
    ]

    batch_results = matcher.batch_match(candidates, top_n=3)
    for i, results in enumerate(batch_results):
        print(f"\nCandidate {i+1} - Top 3:")
        for j, result in enumerate(results, 1):
            print(f"  {j}. {result['title']} (score: {result['score']:.3f}, cosine: {result['cosine_score']:.3f})")


if __name__ == "__main__":
    main()
