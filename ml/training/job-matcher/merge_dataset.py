# job-matching/merge_dataset.py
"""
O*NET Data Preprocessing Script

Processes raw O*NET CSV files into a unified occupation profile JSON.
Includes a helper to flatten competencies for JobBERT-v2 embedding.
"""

import pandas as pd
import numpy as np
from pathlib import Path
import logging

# ----------------------------------------------------------------------
# Setup
# ----------------------------------------------------------------------
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).parent.parent.parent
RAW_DIR = BASE_DIR / "data" / "raw" / "job-matching"
PROCESSED_DIR = BASE_DIR / "data" / "processed"
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

IMPORTANCE_THRESHOLD = 3.0
INTEREST_THRESHOLD = 3.0


# ----------------------------------------------------------------------
# Utility functions
# ----------------------------------------------------------------------
def load_and_clean(filepath, filter_not_relevant=True):
    """Load CSV and optionally remove rows marked 'Not Relevant'."""
    df = pd.read_csv(filepath)
    if filter_not_relevant and "Not Relevant" in df.columns:
        df = df[df["Not Relevant"] != "Y"]
    return df


def safe_list_normalize(x):
    """Ensure x is a list, handling NaN/None gracefully."""
    if isinstance(x, list):
        return x
    if pd.isna(x) or x is None:
        return []
    return [x]  # fallback for unexpected scalar


# ----------------------------------------------------------------------
# Dataset extractors
# ----------------------------------------------------------------------
def extract_skills_dataset():
    logger.info("Extracting Skills...")
    df = load_and_clean(RAW_DIR / "skills.csv")
    im = df[(df["Scale ID"] == "IM") & (df["Data Value"] >= IMPORTANCE_THRESHOLD)]
    lv = df[df["Scale ID"] == "LV"]
    merged = pd.merge(im, lv, on=["O*NET-SOC Code", "Element Name"], suffixes=("_im", "_lv"))
    grouped = merged.groupby("Title_im").apply(
        lambda x: [
            {"name": row["Element Name"], "importance": row["Data Value_im"], "level": row["Data Value_lv"]}
            for _, row in x.iterrows()
        ]
    ).reset_index(name="skills")
    return grouped.rename(columns={"Title_im": "Title"})


def extract_knowledge_dataset():
    logger.info("Extracting Knowledge...")
    df = load_and_clean(RAW_DIR / "knowledge.csv")
    im = df[(df["Scale ID"] == "IM") & (df["Data Value"] >= IMPORTANCE_THRESHOLD)]
    lv = df[df["Scale ID"] == "LV"]
    merged = pd.merge(im, lv, on=["O*NET-SOC Code", "Element Name"], suffixes=("_im", "_lv"))
    grouped = merged.groupby("Title_im").apply(
        lambda x: [
            {"name": row["Element Name"], "importance": row["Data Value_im"], "level": row["Data Value_lv"]}
            for _, row in x.iterrows()
        ]
    ).reset_index(name="knowledge")
    return grouped.rename(columns={"Title_im": "Title"})


def extract_abilities_dataset():
    logger.info("Extracting Abilities...")
    df = load_and_clean(RAW_DIR / "abilities.csv")
    im = df[(df["Scale ID"] == "IM") & (df["Data Value"] >= IMPORTANCE_THRESHOLD)]
    grouped = im.groupby("Title")["Element Name"].apply(list).reset_index(name="abilities")
    return grouped


def extract_technology_skills_dataset():
    logger.info("Extracting Technology Skills...")
    df = pd.read_csv(RAW_DIR / "technology-skills.csv")
    filtered = df[(df["In Demand"] == "Y") & (df["Hot Technology"] == "Y")]
    grouped = filtered.groupby("Title")["Example"].apply(lambda x: list(x.dropna().unique())).reset_index(name="technology_skills")
    return grouped


def extract_interests_dataset():
    logger.info("Extracting Interests...")
    df = pd.read_csv(RAW_DIR / "interests.csv")
    df = df[df["Domain Source"].notna()]

    # Occupational Interests (OI) – actual interest categories with scores
    oi = df[(df["Scale ID"] == "OI") & (df["Data Value"] >= INTEREST_THRESHOLD)]
    oi_grouped = oi.groupby("Title")["Element Name"].apply(list).reset_index(name="interests")

    # Top 3 interests by OI score (real names, not placeholder labels)
    oi_sorted = oi.sort_values(["Title", "Data Value"], ascending=[True, False])
    ih_grouped = oi_sorted.groupby("Title").head(3).groupby("Title")["Element Name"].apply(list).reset_index(name="interest_high_points")

    merged = pd.merge(oi_grouped, ih_grouped, on="Title", how="outer")
    for col in ["interests", "interest_high_points"]:
        merged[col] = merged[col].apply(safe_list_normalize)
    return merged


def merge_all():
    """Combine all processed datasets into a single occupation profile."""
    skills = extract_skills_dataset()
    knowledge = extract_knowledge_dataset()
    abilities = extract_abilities_dataset()
    tech = extract_technology_skills_dataset()
    interests = extract_interests_dataset()

    df = skills.merge(knowledge, on="Title", how="outer")
    df = df.merge(abilities, on="Title", how="outer")
    df = df.merge(tech, on="Title", how="outer")
    df = df.merge(interests, on="Title", how="outer")

    list_cols = ["skills", "knowledge", "abilities", "technology_skills", "interests", "interest_high_points"]
    for col in list_cols:
        if col in df.columns:
            df[col] = df[col].apply(safe_list_normalize)
    logger.info(f"Merged dataset size: {len(df)} occupations")
    return df


# ----------------------------------------------------------------------
# Embedding helper (aligned with JobBERT pipeline)
# ----------------------------------------------------------------------
def flatten_occupation_for_embedding(occ: dict) -> str:
    """
    Convert an occupation profile into a deduplicated natural‑language string
    suitable for JobBERT‑v2 embedding.

    Excludes interests (they are personality signals, not competencies).
    """
    title = occ.get("Title", "")

    # Extract competency names (safe access)
    skill_names = [s["name"] for s in occ.get("skills", []) if isinstance(s, dict) and "name" in s]
    knowledge_names = [k["name"] for k in occ.get("knowledge", []) if isinstance(k, dict) and "name" in k]
    ability_names = occ.get("abilities", [])
    tech_names = occ.get("technology_skills", [])

    # Combine and deduplicate
    all_competencies = skill_names + knowledge_names + ability_names + tech_names
    all_competencies = sorted(set(all_competencies))  # deduplication + stable order

    comp_text = ", ".join(all_competencies) if all_competencies else "None specified"
    return f"{title}. Skills include {comp_text}."


# ----------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------
if __name__ == "__main__":
    unified = merge_all()

    # Save to CSV and JSON
    unified.to_csv(PROCESSED_DIR / "occupation_profiles.csv", index=False)
    unified.to_json(PROCESSED_DIR / "occupation_profiles.json", orient="records", indent=2)
    logger.info(f"Saved processed files to {PROCESSED_DIR}")

    # Print an example embedding string
    sample = unified.iloc[0].to_dict()
    logger.info("Example flattened text for JobBERT:")
    print(flatten_occupation_for_embedding(sample))