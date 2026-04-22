"""
matcher.py - Production Runtime Matcher

This is the deployment-ready version that uses the prebuilt FAISS index
and ONNX model for optimized performance.

Usage:
    from matcher import JobMatcher
    
    matcher = JobMatcher()
    results = matcher.match(['Critical Thinking', 'Leadership'], top_n=10)
"""

import json
import numpy as np
import faiss
from pathlib import Path
from typing import List, Dict, Optional

class JobMatcher:
    """
    Production job matcher using ONNX for optimized inference.
    
    This class loads prebuilt assets and provides fast matching without
    requiring sentence-transformers at runtime.
    """
    
    def __init__(self, models_dir: str = "models", use_onnx: bool = True):
        """
        Initialize the matcher with prebuilt models.
        
        Args:
            models_dir: Directory containing the prebuilt models
            use_onnx: If True, use ONNX runtime (faster). If False, use standard PyTorch.
        """
        self.models_dir = Path(models_dir)
        self.use_onnx = use_onnx
        
        print("Loading FAISS index...")
        self.index = faiss.read_index(str(self.models_dir / "onet_embeddings.faiss"))
        print(f"✓ Loaded index with {self.index.ntotal} occupations")
        
        print("Loading occupation metadata...")
        with open(self.models_dir / "occupation_metadata.json", "r", encoding="utf-8") as f:
            self.metadata = json.load(f)
        print(f"✓ Loaded metadata for {len(self.metadata)} occupations")
        
        print("Loading embedding model...")
        if use_onnx:
            self._load_onnx_model()
        else:
            self._load_standard_model()
        print("✓ Model loaded successfully")
    
    def _load_onnx_model(self):
        """Load the ONNX optimized model."""
        try:
            from optimum.onnxruntime import ORTModelForFeatureExtraction
            from transformers import AutoTokenizer
            
            model_path = self.models_dir / "jobbert_v2_onnx"
            self.model = ORTModelForFeatureExtraction.from_pretrained(str(model_path))
            self.tokenizer = AutoTokenizer.from_pretrained(str(model_path))
            self.is_onnx = True
            
        except ImportError:
            print("⚠ optimum not installed, falling back to standard model")
            print("  Install with: pip install optimum[onnxruntime]")
            self._load_standard_model()
    
    def _load_standard_model(self):
        """Load the standard SentenceTransformer model."""
        try:
            from sentence_transformers import SentenceTransformer
            import torch
            
            self.model = SentenceTransformer("TechWolf/JobBERT-v2", device="cpu")
            self.model.eval()
            
            # Optimize for CPU inference
            torch.set_num_threads(4)
            self.is_onnx = False
            
        except ImportError:
            raise ImportError(
                "Neither optimum nor sentence-transformers is installed. "
                "Install one of:\n"
                "  - optimum: pip install optimum[onnxruntime]\n"
                "  - sentence-transformers: pip install sentence-transformers"
            )
    
    def _embed_candidate(self, skills: List[str]) -> np.ndarray:
        """
        Generate embedding for a candidate's skills.
        
        Args:
            skills: List of candidate skills/competencies
            
        Returns:
            Normalized embedding vector
        """
        # Build natural language text
        skills_text = ", ".join(skills)
        text = f"Candidate with experience in {skills_text}."
        
        if self.is_onnx:
            # ONNX path - manual encoding
            inputs = self.tokenizer(
                text,
                return_tensors="pt",
                padding=True,
                truncation=True,
                max_length=512
            )
            outputs = self.model(**inputs)
            
            # Mean pooling
            attention_mask = inputs["attention_mask"]

            token_embeddings = outputs.last_hidden_state

            input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()

            embedding = (token_embeddings * input_mask_expanded).sum(1) / input_mask_expanded.sum(1)

            embedding = embedding.detach().numpy()
        else:
            # SentenceTransformer path - built-in encoding
            embedding = self.model.encode([text])
        
        # Normalize for cosine similarity
        embedding = embedding.astype(np.float32)
        faiss.normalize_L2(embedding)
        
        return embedding
    
    def _compute_overlap(
        self,
        candidate_skills: List[str],
        occupation_competencies: List[str]
    ) -> Dict[str, List[str]]:
        """
        Compute matched and missing competencies.
        
        Args:
            candidate_skills: List of candidate skills
            occupation_competencies: List of required competencies
            
        Returns:
            Dict with 'matched' and 'missing' competency lists
        """
        # Case-insensitive matching
        candidate_set = {s.lower().strip() for s in candidate_skills}
        occ_set = {c.lower().strip() for c in occupation_competencies}
        
        matched = candidate_set & occ_set
        missing = occ_set - candidate_set
        
        return {
            "matched": sorted(list(matched)),
            "missing": sorted(list(missing))
        }
    
    def match(
        self,
        candidate_skills: List[str],
        top_n: int = 10,
        include_overlap: bool = True
    ) -> List[Dict]:
        """
        Find matching occupations for a candidate.
        
        Args:
            candidate_skills: List of candidate's skills/competencies
            top_n: Number of top matches to return
            include_overlap: If True, compute competency overlap
            
        Returns:
            List of occupation matches with scores and details
        """
        if not candidate_skills:
            raise ValueError("candidate_skills cannot be empty")
        
        # Generate candidate embedding
        embedding = self._embed_candidate(candidate_skills)

        print("DEBUG:")
        print("Embedding shape:", embedding.shape)
        print("Index dimension:", self.index.d)

        scores, indices = self.index.search(embedding, top_n)
        
        # Build results
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx >= len(self.metadata):
                continue  # Skip invalid indices
            
            occ = self.metadata[idx]
            result = {
                "title": occ["title"],
                "cosine_score": float(score),
                "all_competencies": occ["competencies"]
            }
            
            # Optionally compute overlap
            if include_overlap:
                overlap = self._compute_overlap(
                    candidate_skills,
                    occ["competencies"]
                )
                result["matched_competencies"] = overlap["matched"]
                result["missing_competencies"] = overlap["missing"]
                result["match_percentage"] = (
                    len(overlap["matched"]) / len(occ["competencies"]) * 100
                    if occ["competencies"] else 0
                )
            
            results.append(result)
        
        return results
    
    def batch_match(
        self,
        candidates: List[Dict[str, List[str]]],
        top_n: int = 10
    ) -> List[List[Dict]]:
        """
        Match multiple candidates efficiently.
        
        Args:
            candidates: List of dicts with 'skills' key
            top_n: Number of matches per candidate
            
        Returns:
            List of result lists, one per candidate
        """
        all_results = []
        
        for candidate in candidates:
            skills = candidate.get("skills", [])
            results = self.match(skills, top_n=top_n, include_overlap=True)
            all_results.append(results)
        
        return all_results


# ----------------------------------------------------------------------
# Example usage and testing
# ----------------------------------------------------------------------
def main():
    """Example usage of the JobMatcher."""
    
    # Initialize matcher
    print("\nInitializing Job Matcher...")
    matcher = JobMatcher(models_dir="../../models", use_onnx=False)
    
    # Example candidate 1: Business leadership
    print("\n" + "="*70)
    print("EXAMPLE 1: Business Leadership Candidate")
    print("="*70)
    
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
    
    print(f"\nCandidate skills: {', '.join(candidate_1_skills)}")
    print("\nFinding matches...")
    
    results_1 = matcher.match(candidate_1_skills, top_n=5, include_overlap=True)
    
    print(f"\nTop 5 Matches:\n")
    for i, result in enumerate(results_1, 1):
        print(f"{i}. {result['title']}")
        print(f"   Score: {result['cosine_score']:.3f}")
        print(f"   Match: {result['match_percentage']:.1f}% ({len(result['matched_competencies'])}/{len(result['all_competencies'])} competencies)")
        print(f"   Matched: {', '.join(result['matched_competencies'][:5])}")
        if len(result['matched_competencies']) > 5:
            print(f"            ... and {len(result['matched_competencies']) - 5} more")
        print()
    
    # Example candidate 2: Software developer
    print("\n" + "="*70)
    print("EXAMPLE 2: Software Development Candidate")
    print("="*70)
    
    candidate_2_skills = [
        "Python",
        "JavaScript",
        "Critical Thinking",
        "Problem Solving",
        "Database Management"
    ]
    
    print(f"\nCandidate skills: {', '.join(candidate_2_skills)}")
    print("\nFinding matches...")
    
    results_2 = matcher.match(candidate_2_skills, top_n=5, include_overlap=True)
    
    print(f"\nTop 5 Matches:\n")
    for i, result in enumerate(results_2, 1):
        print(f"{i}. {result['title']}")
        print(f"   Score: {result['cosine_score']:.3f}")
        print(f"   Match: {result['match_percentage']:.1f}%")
        print()
    
    # Batch processing example
    print("\n" + "="*70)
    print("EXAMPLE 3: Batch Processing")
    print("="*70)
    
    candidates = [
        {"id": 1, "skills": candidate_1_skills},
        {"id": 2, "skills": candidate_2_skills}
    ]
    
    batch_results = matcher.batch_match(candidates, top_n=3)
    
    for i, results in enumerate(batch_results):
        print(f"\nCandidate {i+1} - Top 3:")
        for j, result in enumerate(results, 1):
            print(f"  {j}. {result['title']} (score: {result['cosine_score']:.3f})")


if __name__ == "__main__":
    main()