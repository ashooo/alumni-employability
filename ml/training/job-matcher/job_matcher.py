"""
Skill-based Job Matching System
--------------------------------
Converts jobs and candidates into binary skill vectors and ranks jobs by cosine similarity.
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import MultiLabelBinarizer
from sklearn.metrics.pairwise import cosine_similarity
import pickle
import ast
from typing import List, Dict, Any, Optional

# ==============================
# 1. Normalization Layer
# ==============================

def normalize_skill(skill: str, synonym_map: Optional[Dict[str, str]] = None) -> str:
    """
    Normalize a single skill: lowercase, strip, apply synonym mapping.
    """
    skill = skill.lower().strip()
    if synonym_map and skill in synonym_map:
        skill = synonym_map[skill]
    return skill

def normalize_skill_list(skills: List[str], synonym_map: Optional[Dict[str, str]] = None) -> List[str]:
    """
    Normalize a list of skills, remove duplicates.
    """
    normalized = [normalize_skill(s, synonym_map) for s in skills]
    # Remove duplicates while preserving order (optional)
    seen = set()
    unique = []
    for s in normalized:
        if s not in seen:
            seen.add(s)
            unique.append(s)
    return unique

# Example synonym map – extend as needed
DEFAULT_SYNONYM_MAP = {
    "recruitment": "talent acquisition",
    "recruiting": "talent acquisition",
    "hr laws": "employment laws and regulations",
    "employment law": "employment laws and regulations",
    "benefits": "compensation and benefits",
    "payroll administration": "payroll",
    "comm": "communication",
    "comm skills": "communication",
    "employee performance": "performance management",
    "performance review": "performance management",
    "fmla": "FMLA",
    "ada": "ADA",
    "interpersonal": "interpersonal skills",
    "collab": "collaboration"
}

# ==============================
# 2. Data Loading & Preparation
# ==============================

def load_jobs_from_csv(filepath: str, skill_column: str = "job_skill_set") -> pd.DataFrame:
    """
    Load jobs CSV. Assumes skill column contains a string representation of a list.
    """
    df = pd.read_csv(filepath)
    # Convert string to list (e.g., "['a', 'b']" -> ['a', 'b'])
    df['skill_list'] = df[skill_column].apply(ast.literal_eval)
    return df

def prepare_job_skills(df: pd.DataFrame, synonym_map: Optional[Dict[str, str]] = None) -> List[List[str]]:
    """
    Extract and normalize job skills from DataFrame.
    """
    return [normalize_skill_list(skills, synonym_map) for skills in df['skill_list']]

# ==============================
# 3. Vectorizer (MultiLabelBinarizer)
# ==============================

class SkillVectorizer:
    def __init__(self, synonym_map: Optional[Dict[str, str]] = None):
        self.mlb = MultiLabelBinarizer()
        self.synonym_map = synonym_map or DEFAULT_SYNONYM_MAP
        self.is_fitted = False

    def fit(self, job_skill_lists: List[List[str]]):
        """
        Fit the binarizer on all job skills.
        """
        # Normalize job skills before fitting
        normalized_job_skills = [normalize_skill_list(skills, self.synonym_map) for skills in job_skill_lists]
        self.mlb.fit(normalized_job_skills)
        self.is_fitted = True
        return self

    def transform_jobs(self, job_skill_lists: List[List[str]]) -> np.ndarray:
        """
        Transform job skills into binary matrix.
        """
        if not self.is_fitted:
            raise ValueError("Vectorizer not fitted. Call fit() first.")
        normalized = [normalize_skill_list(skills, self.synonym_map) for skills in job_skill_lists]
        return self.mlb.transform(normalized)

    def transform_candidate(self, candidate_skills: List[str]) -> np.ndarray:
        """
        Transform a single candidate's skills.
        """
        if not self.is_fitted:
            raise ValueError("Vectorizer not fitted. Call fit() first.")
        normalized = normalize_skill_list(candidate_skills, self.synonym_map)
        return self.mlb.transform([normalized])

    def save(self, path: str):
        """
        Save the vectorizer (mlb + synonym_map) to disk.
        """
        with open(path, 'wb') as f:
            pickle.dump({'mlb': self.mlb, 'synonym_map': self.synonym_map}, f)

    def load(self, path: str):
        """
        Load a previously saved vectorizer.
        """
        with open(path, 'rb') as f:
            data = pickle.load(f)
        self.mlb = data['mlb']
        self.synonym_map = data['synonym_map']
        self.is_fitted = True

# ==============================
# 4. Matching Engine
# ==============================

class JobMatcher:
    def __init__(self, vectorizer: SkillVectorizer, job_vectors: np.ndarray, jobs_df: pd.DataFrame):
        self.vectorizer = vectorizer
        self.job_vectors = job_vectors
        self.jobs_df = jobs_df.reset_index(drop=True)  # ensure index alignment

    def match(self, candidate_skills: List[str], top_k: int = 5, penalty_for_missing: float = 0.0) -> List[Dict[str, Any]]:
        """
        Match a candidate against all jobs.

        Args:
            candidate_skills: List of raw skill strings.
            top_k: Number of top jobs to return.
            penalty_for_missing: Factor (0 to 1) to reduce score based on fraction of missing job skills.
                                0 = no penalty, 1 = full penalty (score * (1 - missing_fraction)).
        Returns:
            List of dicts with job_id, score, matched_skills, missing_skills.
        """
        # Vectorize candidate
        cand_vec = self.vectorizer.transform_candidate(candidate_skills)

        # Compute cosine similarities
        similarities = cosine_similarity(cand_vec, self.job_vectors).flatten()

        # Prepare results
        results = []
        for idx, score in enumerate(similarities):
            job_skills_raw = self.jobs_df.loc[idx, 'skill_list']
            job_skills_norm = normalize_skill_list(job_skills_raw, self.vectorizer.synonym_map)
            cand_skills_norm = normalize_skill_list(candidate_skills, self.vectorizer.synonym_map)

            matched = list(set(cand_skills_norm) & set(job_skills_norm))
            missing = list(set(job_skills_norm) - set(cand_skills_norm))

            # Apply penalty if requested
            if penalty_for_missing > 0 and len(job_skills_norm) > 0:
                missing_frac = len(missing) / len(job_skills_norm)
                score = score * (1 - penalty_for_missing * missing_frac)

            results.append({
                "job_id": self.jobs_df.loc[idx, 'job_id'],
                "score": round(score, 4),
                "matched_skills": matched,
                "missing_skills": missing
            })

        # Sort by score descending
        results.sort(key=lambda x: x['score'], reverse=True)
        return results[:top_k]

# ==============================
# 5. End-to-End Example
# ==============================

def build_system(jobs_csv_path: str, skill_column: str = "job_skill_set", 
                 synonym_map: Optional[Dict[str, str]] = None) -> JobMatcher:
    """
    Build the full matching system from a jobs CSV.
    """
    # Load and prepare data
    df = load_jobs_from_csv(jobs_csv_path, skill_column)
    job_skill_lists = prepare_job_skills(df, synonym_map)

    # Fit vectorizer
    vectorizer = SkillVectorizer(synonym_map=synonym_map)
    vectorizer.fit(job_skill_lists)

    # Transform jobs
    job_vectors = vectorizer.transform_jobs(job_skill_lists)

    # Create matcher
    matcher = JobMatcher(vectorizer, job_vectors, df)
    return matcher

# ==============================
# Usage (when script is run directly)
# ==============================

if __name__ == "__main__":
    # Example: create a sample CSV from your snippet
    sample_data = {
        "job_id": [3902668440, 3905823748],
        "category": ["HR", "HR"],
        "job_title": ["Sr Human Resource Generalist", "Human Resources Manager"],
        "job_description": ["...", "..."],
        "job_skill_set": [
            "['employee relations', 'talent acquisition', 'performance management', 'compensation and benefits', 'employment laws and regulations', 'analytical skills', 'employee benefits administration', 'HR policies and procedures', 'recruitment strategies', 'FMLA', 'ADA', 'communication', 'interpersonal skills', 'collaboration']",
            "['Talent Acquisition', 'Employee Performance Management', 'Legal Compliance', 'Payroll']"
        ]
    }
    df_sample = pd.DataFrame(sample_data)
    df_sample.to_csv("sample_jobs.csv", index=False)
    print("Created sample_jobs.csv")

    # Build the system
    matcher = build_system("sample_jobs.csv", synonym_map=DEFAULT_SYNONYM_MAP)

    # Test with a candidate
    candidate = {
        "candidate_id": 123,
        "skills": ["recruitment", "employee relations", "communication", "payroll"]
    }

    matches = matcher.match(candidate["skills"], top_k=3, penalty_for_missing=0.2)

    print("\n=== Candidate Skills ===")
    print(candidate["skills"])
    print("\n=== Top Job Matches ===")
    for m in matches:
        print(f"\nJob ID: {m['job_id']} | Score: {m['score']}")
        print(f"  Matched: {m['matched_skills']}")
        print(f"  Missing: {m['missing_skills']}")