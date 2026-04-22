"""
Offline preprocessing for Job Matcher.

This version is ONNX-first to ensure runtime parity:
- Builds occupation embeddings using the same ONNX encoder + mean pooling logic
  used by deployment runtime.
- Writes FAISS index + rich metadata for domain-aware reranking.
- Exports ONNX model files for deployment.
"""

import json
from pathlib import Path
from typing import Dict, List

import faiss
import numpy as np


BASE_DIR = Path(__file__).resolve().parents[2]
PROCESSED_DIR = BASE_DIR / "data" / "processed"
MODELS_DIR = BASE_DIR / "models"

INPUT_JSON = PROCESSED_DIR / "occupation_profiles.json"
INDEX_PATH = MODELS_DIR / "onet_embeddings.faiss"
META_PATH = MODELS_DIR / "occupation_metadata.json"
ONNX_MODEL_DIR = MODELS_DIR / "jobbert_v2_onnx"
RUNTIME_CONFIG_PATH = MODELS_DIR / "job_matcher_config.json"

MODEL_NAME = "TechWolf/JobBERT-v2"
BATCH_SIZE = 32
MAX_LEN_CAP = 256


def _extract_names(items: List[Dict]) -> List[str]:
    return [str(x.get("name")).strip() for x in items if isinstance(x, dict) and str(x.get("name", "")).strip()]


def _safe_list(value) -> List[str]:
    if isinstance(value, list):
        return value
    return []


def _build_sections(occ: Dict) -> Dict[str, List[str]]:
    skills = sorted(set(_extract_names(_safe_list(occ.get("skills")))))
    knowledge = sorted(set(_extract_names(_safe_list(occ.get("knowledge")))))
    abilities = sorted(set(str(x).strip() for x in _safe_list(occ.get("abilities")) if str(x).strip()))
    tech = sorted(set(str(x).strip() for x in _safe_list(occ.get("technology_skills")) if str(x).strip()))

    core = sorted(set(skills + knowledge + tech))
    all_comp = sorted(set(core + abilities))

    return {
        "skills": skills,
        "knowledge": knowledge,
        "abilities": abilities,
        "technology_skills": tech,
        "core_competencies": core,
        "competencies": all_comp,
    }


def flatten_occupation_for_embedding(occ: Dict) -> str:
    title = str(occ.get("Title", "")).strip()
    sections = _build_sections(occ)

    core = ", ".join(sections["core_competencies"][:80]) or "None specified"
    knowledge = ", ".join(sections["knowledge"][:50]) or "None specified"
    tech = ", ".join(sections["technology_skills"][:40]) or "None specified"
    abilities = ", ".join(sections["abilities"][:40]) or "None specified"

    # Weighted template: emphasize core/domain signal; keep abilities as secondary.
    return (
        f"Occupation: {title}. "
        f"Core domain competencies: {core}. "
        f"Primary knowledge areas: {knowledge}. "
        f"Tools and technologies: {tech}. "
        f"Transferable abilities (secondary): {abilities}."
    )


def _mean_pool_numpy(last_hidden_state: np.ndarray, attention_mask: np.ndarray) -> np.ndarray:
    expanded_mask = np.expand_dims(attention_mask.astype(np.float32), axis=-1)
    summed = (last_hidden_state * expanded_mask).sum(axis=1)
    denom = np.clip(expanded_mask.sum(axis=1), a_min=1e-9, a_max=None)
    return summed / denom


def build_embeddings_with_onnx(texts: List[str], batch_size: int = BATCH_SIZE) -> np.ndarray:
    from optimum.onnxruntime import ORTModelForFeatureExtraction
    from transformers import AutoTokenizer

    print("Loading ONNX encoder for embedding generation...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    model = ORTModelForFeatureExtraction.from_pretrained(MODEL_NAME, export=True)

    model_max_len = getattr(tokenizer, "model_max_length", 128)
    if not isinstance(model_max_len, int) or model_max_len <= 0 or model_max_len > 2048:
        model_max_len = 128

    all_embeddings = []
    total = len(texts)
    print(f"Generating ONNX embeddings for {total} occupations...")

    for start in range(0, total, batch_size):
        batch_texts = texts[start:start + batch_size]
        inputs = tokenizer(
            batch_texts,
            return_tensors="np",
            padding=True,
            truncation=True,
            max_length=min(model_max_len, MAX_LEN_CAP)
        )
        outputs = model(**inputs)
        token_embeddings = np.asarray(outputs.last_hidden_state, dtype=np.float32)
        attention_mask = np.asarray(inputs["attention_mask"])
        pooled = _mean_pool_numpy(token_embeddings, attention_mask)
        all_embeddings.append(pooled.astype(np.float32))

        done = min(start + batch_size, total)
        if done % (batch_size * 10) == 0 or done == total:
            print(f"  processed {done}/{total}")

    return np.vstack(all_embeddings)


def export_runtime_onnx():
    from optimum.onnxruntime import ORTModelForFeatureExtraction
    from transformers import AutoTokenizer

    print("Exporting deployment ONNX artifacts...")
    ONNX_MODEL_DIR.mkdir(parents=True, exist_ok=True)

    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    ort_model = ORTModelForFeatureExtraction.from_pretrained(MODEL_NAME, export=True)

    tokenizer.save_pretrained(str(ONNX_MODEL_DIR))
    ort_model.save_pretrained(str(ONNX_MODEL_DIR))

    print(f"ONNX artifacts saved to {ONNX_MODEL_DIR}")


def main():
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    print("Loading occupation profiles...")
    with open(INPUT_JSON, "r", encoding="utf-8") as f:
        occupations = json.load(f)

    texts = [flatten_occupation_for_embedding(occ) for occ in occupations]
    print(f"Loaded {len(texts)} occupations.")

    embeddings = build_embeddings_with_onnx(texts)
    print(f"Embeddings shape: {embeddings.shape}")

    vectors = embeddings.astype(np.float32)
    faiss.normalize_L2(vectors)

    dim = int(vectors.shape[1])
    index = faiss.IndexFlatIP(dim)
    index.add(vectors)
    faiss.write_index(index, str(INDEX_PATH))
    print(f"FAISS index saved to {INDEX_PATH} (dim={dim})")

    metadata = []
    for occ in occupations:
        sections = _build_sections(occ)
        metadata.append({
            "title": str(occ.get("Title", "Unknown")),
            "skills": sections["skills"],
            "knowledge": sections["knowledge"],
            "abilities": sections["abilities"],
            "technology_skills": sections["technology_skills"],
            "core_competencies": sections["core_competencies"],
            "competencies": sections["competencies"],
            "interests": _safe_list(occ.get("interests")),
            "interest_high_points": _safe_list(occ.get("interest_high_points")),
        })

    with open(META_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    print(f"Metadata saved to {META_PATH}")

    runtime_config = {
        "model_name": MODEL_NAME,
        "embedding_backend": "onnx_mean_pool",
        "embedding_dim": dim,
        "max_length_cap": MAX_LEN_CAP,
    }
    with open(RUNTIME_CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(runtime_config, f, indent=2)
    print(f"Runtime config saved to {RUNTIME_CONFIG_PATH}")

    export_runtime_onnx()

    print("\nBuild complete.")
    print("Generated files:")
    print(f"  - {INDEX_PATH}")
    print(f"  - {META_PATH}")
    print(f"  - {RUNTIME_CONFIG_PATH}")
    print(f"  - {ONNX_MODEL_DIR}")


if __name__ == "__main__":
    main()

