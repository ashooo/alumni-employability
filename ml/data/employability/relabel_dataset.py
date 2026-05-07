"""
Relabel Dataset — Employability Pipeline v2
============================================
Reads combined_employability.csv and produces combined_employability_v2.csv with:

1. Board Exam relabeled per-program with realistic PRC pass rates + noise
2. Skills rescaled from 1-3 to 1-10 with program-specific boosts + noise
3. Synthetic "Internship Experience" feature (1-5 scale)
4. Synthetic "Certifications" feature (1-5 scale)
5. Employability relabeled to a 75/25 split using composite score + noise
6. Employability Reason blanked out (stale after relabeling)

Original CSV is NEVER modified. All randomness is seeded for reproducibility.

Usage:
    python relabel_dataset.py
    python relabel_dataset.py --dry-run   # Preview stats without writing
"""

import argparse
import numpy as np
import pandas as pd
from pathlib import Path

SEED = 42
DATA_DIR = Path(__file__).parent
INPUT_CSV = DATA_DIR / "combined_employability.csv"
OUTPUT_CSV = DATA_DIR / "combined_employability_v2.csv"

# ---------------------------------------------------------------------------
# Board Exam: per-program realistic pass rates
# ---------------------------------------------------------------------------
BOARD_EXAM_RATES = {
    "BSN":          0.97,   # Almost 100%
    "BSA":          0.80,   # 80%
    "BSECE":        0.75,   # 70-80% (midpoint)
    "BSED ENGLISH": 0.60,   # 60%
    "BSED FILIPINO": 0.60,  # 60%
}
NOISE_BAND = 0.05  # ±5% of students near the cutoff can flip

# ---------------------------------------------------------------------------
# Skill rescaling: 1-3 → 1-10 with program-specific boosts
# ---------------------------------------------------------------------------
# Programs where hard/technical skills matter more get a boost
PROGRAM_SKILL_BOOSTS = {
    # program: (hard_skills_boost, soft_skills_boost)
    # Boost is added BEFORE noise, so top students in these programs
    # will naturally score higher in their strong areas
    "BSIT":                 (0.8, 0.0),   # IT: strong tech skills
    "BSCS":                 (1.0, 0.0),   # CS: strongest tech skills
    "BSECE":                (0.7, 0.0),   # ECE: technical + engineering
    "BSN":                  (0.0, 0.6),   # Nursing: strong soft/clinical skills
    "BSED ENGLISH":         (0.0, 0.8),   # Education: strong communication/soft
    "BSED FILIPINO":        (0.0, 0.8),   # Education: strong communication/soft
    "BSA":                  (0.3, 0.3),   # Accounting: balanced
    "BSBA ENTREPRENEURSHIP": (0.2, 0.5),  # Business: more soft-skill oriented
    "BSBA MARKETING":       (0.2, 0.5),   # Marketing: more soft-skill oriented
}


def relabel_board_exam(df: pd.DataFrame, rng: np.random.Generator) -> pd.Series:
    """
    Relabel Board Exam per program using realistic pass rates.
    Students are ranked by academic performance within each program.
    A noise band flips ~5% of borderline students.
    """
    board_exam = pd.Series(0, index=df.index, dtype=int)

    for program, target_rate in BOARD_EXAM_RATES.items():
        mask = df["Program"] == program
        if mask.sum() == 0:
            continue

        subset = df.loc[mask].copy()

        # Academic composite: lower GPA = better (Philippine 1-5 scale)
        cgpa = pd.to_numeric(subset["CGPA"], errors="coerce").fillna(3.0)
        prof = pd.to_numeric(subset["Average Prof Grade"], errors="coerce").fillna(3.0)
        elec = pd.to_numeric(subset["Average Elec Grade"], errors="coerce").fillna(3.0)
        ojt = pd.to_numeric(subset["OJT Grade"], errors="coerce").fillna(3.0)

        def norm_invert(s):
            mn, mx = s.min(), s.max()
            if mx == mn:
                return pd.Series(0.5, index=s.index)
            return 1 - (s - mn) / (mx - mn)

        academic_score = (
            0.30 * norm_invert(cgpa) +
            0.25 * norm_invert(prof) +
            0.25 * norm_invert(elec) +
            0.20 * norm_invert(ojt)
        )

        # Add small noise to break ties and create natural variance
        noise = rng.normal(0, 0.02, size=len(academic_score))
        academic_score = academic_score + noise

        # Rank: top target_rate% pass
        threshold = np.percentile(academic_score, (1 - target_rate) * 100)

        # Base assignment
        passed = academic_score >= threshold

        # Noise band: flip ~NOISE_BAND of students near the threshold
        distance_to_threshold = np.abs(academic_score - threshold)
        band_width = np.percentile(distance_to_threshold, NOISE_BAND * 100 * 2)
        near_threshold = distance_to_threshold <= band_width

        # Randomly flip some borderline students
        flip_mask = near_threshold & (rng.random(len(subset)) < 0.3)
        passed = passed.copy()
        passed[flip_mask] = ~passed[flip_mask]

        board_exam.loc[subset.index] = passed.astype(int)

    return board_exam


# ---------------------------------------------------------------------------
# Skills rescaling: 1-3 → 1-10 with program boosts and noise
# ---------------------------------------------------------------------------
def rescale_skills(df: pd.DataFrame, rng: np.random.Generator) -> pd.DataFrame:
    """
    Rescale Soft Skills Ave, Hard Skills Ave, and all individual skill columns
    from their current 1-3 range to a 1-10 range.

    Adds program-specific boosts so that e.g. BSIT/BSCS students tend to have
    higher hard skills, BSN students have higher soft/clinical skills, etc.
    """
    df = df.copy()

    # Identify all skill columns (Soft/Hard Skills Ave + individual skills)
    skill_columns = ["Soft Skills Ave", "Hard Skills Ave"]
    for col in df.columns:
        if col.endswith("Skills") and col not in skill_columns:
            skill_columns.append(col)

    # Classify columns as hard-skill-like or soft-skill-like
    soft_keywords = {"Communication", "Leadership", "Teaching", "Classroom",
                     "Patient Care", "Clinical", "Educational", "Soft Skills"}
    hard_keywords = {"Programming", "Data", "Software", "Networking", "Cloud",
                     "Cybersecurity", "Circuit", "System", "Database", "Web",
                     "Machine Learning", "Artificial Intelligence", "Hard Skills",
                     "Auditing", "Financial", "Budgeting", "Taxation", "Risk",
                     "Marketing", "Strategic", "Innovation", "Sales", "Consumer",
                     "Health Assessment", "Emergency", "Problem-Solving",
                     "Curriculum", "Communication Systems"}

    def is_soft_skill(col_name):
        return any(kw in col_name for kw in soft_keywords)

    # Rescale each skill column
    for col in skill_columns:
        vals = pd.to_numeric(df[col], errors="coerce")
        has_data = vals.notna()

        if has_data.sum() == 0:
            continue

        # Linear rescale 1-3 → 1-10
        # old_range = 3-1 = 2, new_range = 10-1 = 9
        # new_val = 1 + (old_val - 1) * 9/2
        rescaled = 1 + (vals - 1) * (9 / 2)

        # Add per-program boost
        col_is_soft = is_soft_skill(col)
        for program, (hard_boost, soft_boost) in PROGRAM_SKILL_BOOSTS.items():
            prog_mask = (df["Program"] == program) & has_data
            if prog_mask.sum() == 0:
                continue
            boost = soft_boost if col_is_soft else hard_boost
            rescaled[prog_mask] += boost

        # Add noise (uniform ±0.5 for natural variance)
        noise = rng.uniform(-0.5, 0.5, size=len(rescaled))
        rescaled = rescaled + noise

        # Clamp to [1, 10] and round to 2 decimals
        rescaled = rescaled.clip(1, 10).round(2)

        # Only update rows that had data (keep NaN for programs without that skill)
        df.loc[has_data, col] = rescaled[has_data]

    return df


# ---------------------------------------------------------------------------
# Synthetic Feature: Internship Experience (1-5 scale)
# ---------------------------------------------------------------------------
def generate_internship_experience(df: pd.DataFrame,
                                   rng: np.random.Generator) -> pd.Series:
    """
    Derive internship experience from OJT grade + leadership + activity.
    Scale: 1 (minimal) to 5 (excellent).
    """
    ojt = pd.to_numeric(df["OJT Grade"], errors="coerce").fillna(3.0)
    leadership = pd.to_numeric(df["Leadership POS"], errors="coerce").fillna(0)
    activity = pd.to_numeric(df["Act Member POS"], errors="coerce").fillna(0)

    # Base score from OJT performance (lower grade = better on 1-3 scale)
    # Map OJT grade to internship quality
    base = pd.Series(2.0, index=df.index)  # Default: below average
    base[ojt <= 1.3] = 4.5    # Excellent OJT
    base[(ojt > 1.3) & (ojt <= 1.6)] = 4.0  # Very good OJT
    base[(ojt > 1.6) & (ojt <= 1.9)] = 3.5  # Good OJT
    base[(ojt > 1.9) & (ojt <= 2.2)] = 3.0  # Average OJT
    base[(ojt > 2.2) & (ojt <= 2.5)] = 2.5  # Below average
    base[ojt > 2.5] = 1.5     # Poor OJT

    # Bonus for leadership and activity involvement
    base = base + (leadership >= 3).astype(float) * 0.4
    base = base + (activity >= 2).astype(float) * 0.3

    # Add continuous noise
    noise = rng.uniform(-0.4, 0.4, size=len(base))
    result = base + noise

    # Clamp to [1, 5] and round to 1 decimal
    result = result.clip(1, 5).round(1)

    return result


# ---------------------------------------------------------------------------
# Synthetic Feature: Certifications (1-5 scale)
# ---------------------------------------------------------------------------
def generate_certifications(df: pd.DataFrame, board_exam: pd.Series,
                            rng: np.random.Generator) -> pd.Series:
    """
    Derive certification score from board exam + skills + program.
    Scale: 1 (none/minimal) to 5 (many certifications).
    """
    hard = pd.to_numeric(df["Hard Skills Ave"], errors="coerce").fillna(5.0)
    soft = pd.to_numeric(df["Soft Skills Ave"], errors="coerce").fillna(5.0)

    tech_programs = {"BSCS", "BSIT", "BSECE"}

    # Start everyone at baseline 1
    base = pd.Series(1.0, index=df.index)

    # Board exam passers likely have professional certifications
    base = base + board_exam.astype(float) * 1.2

    # Strong hard skills (now on 1-10 scale, higher = better) → industry certs
    base[hard >= 8.0] += 1.0
    base[(hard >= 6.0) & (hard < 8.0)] += 0.5

    # Tech program students → more likely to get online certs (Coursera, etc.)
    is_tech = df["Program"].isin(tech_programs)
    base = base + is_tech.astype(float) * 0.6

    # Strong soft skills → professional development certs
    base[soft >= 8.0] += 0.5

    # Random variance — some people just take more courses
    base = base + rng.uniform(0, 0.8, size=len(base))

    # Clamp to [1, 5] and round to nearest integer
    result = base.clip(1, 5).round(0).astype(int)

    return result


# ---------------------------------------------------------------------------
# Employability: 75/25 composite score with noise
# ---------------------------------------------------------------------------
EMPLOYABILITY_TARGET = 0.75
COMPOSITE_WEIGHTS = {
    "cgpa": 0.20,
    "ojt": 0.15,
    "hard_skills": 0.25,
    "soft_skills": 0.20,
    "internship": 0.10,
    "certifications": 0.10,
}
BOARD_EXAM_BOOST = 0.04
EMPLOYABILITY_NOISE_STD = 0.03


def relabel_employability(df: pd.DataFrame, board_exam: pd.Series,
                          rng: np.random.Generator) -> pd.Series:
    """
    Relabel Employability to ~75/25 split using composite score + noise.
    Now incorporates the new synthetic features in the composite.
    """
    cgpa = pd.to_numeric(df["CGPA"], errors="coerce").fillna(3.0)
    ojt = pd.to_numeric(df["OJT Grade"], errors="coerce").fillna(3.0)
    soft = pd.to_numeric(df["Soft Skills Ave"], errors="coerce").fillna(5.0)
    hard = pd.to_numeric(df["Hard Skills Ave"], errors="coerce").fillna(5.0)
    internship = pd.to_numeric(df["Internship Experience"], errors="coerce").fillna(1.0)
    certs = pd.to_numeric(df["Certifications"], errors="coerce").fillna(1.0)

    def norm_invert(s):
        mn, mx = s.min(), s.max()
        if mx == mn:
            return pd.Series(0.5, index=s.index)
        return 1 - (s - mn) / (mx - mn)

    def norm_regular(s):
        mn, mx = s.min(), s.max()
        if mx == mn:
            return pd.Series(0.5, index=s.index)
        return (s - mn) / (mx - mn)

    # CGPA and OJT: lower is better (Philippine scale) → invert
    cgpa_norm = norm_invert(cgpa)
    ojt_norm = norm_invert(ojt)

    # Skills are now on 1-10 scale (higher = better) → regular normalize
    hard_norm = norm_regular(hard)
    soft_norm = norm_regular(soft)

    # New features: 1-5 scale (higher = better) → regular normalize
    intern_norm = norm_regular(internship)
    cert_norm = norm_regular(certs)

    composite = (
        COMPOSITE_WEIGHTS["cgpa"] * cgpa_norm +
        COMPOSITE_WEIGHTS["ojt"] * ojt_norm +
        COMPOSITE_WEIGHTS["hard_skills"] * hard_norm +
        COMPOSITE_WEIGHTS["soft_skills"] * soft_norm +
        COMPOSITE_WEIGHTS["internship"] * intern_norm +
        COMPOSITE_WEIGHTS["certifications"] * cert_norm
    )

    # Board exam boost
    composite = composite + board_exam * BOARD_EXAM_BOOST

    # Add Gaussian noise
    noise = rng.normal(0, EMPLOYABILITY_NOISE_STD, size=len(composite))
    composite = composite + noise

    # Threshold at 25th percentile (bottom 25% = Less Employable)
    threshold = np.percentile(composite, (1 - EMPLOYABILITY_TARGET) * 100)

    labels = pd.Series("Less Employable", index=df.index)
    labels[composite >= threshold] = "Employable"

    return labels


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="Relabel employability dataset v2")
    parser.add_argument("--dry-run", action="store_true", help="Preview stats only")
    parser.add_argument("--seed", type=int, default=SEED, help="Random seed")
    args = parser.parse_args()

    rng = np.random.default_rng(args.seed)

    print("=" * 70)
    print("RELABEL DATASET - Employability Pipeline v2")
    print("=" * 70)

    # Load
    df = pd.read_csv(INPUT_CSV)
    print(f"\nLoaded {len(df)} rows from {INPUT_CSV.name}")
    print(f"Programs: {sorted(df['Program'].unique())}")

    # --- Original stats ---
    print(f"\n--- ORIGINAL STATS ---")
    print(f"Employability: {df['Employability'].value_counts().to_dict()}")
    print(f"Board Exam: {df['Board Exam'].value_counts(dropna=False).to_dict()}")
    print(f"Soft Skills Ave: min={df['Soft Skills Ave'].min():.2f}  max={df['Soft Skills Ave'].max():.2f}  (1-3 scale)")
    print(f"Hard Skills Ave: min={df['Hard Skills Ave'].min():.2f}  max={df['Hard Skills Ave'].max():.2f}  (1-3 scale)")

    # 1. Relabel Board Exam
    print(f"\n{'=' * 70}")
    print("STEP 1: Relabeling Board Exam")
    print("=" * 70)
    df["Board Exam"] = relabel_board_exam(df, rng)

    for program in sorted(BOARD_EXAM_RATES.keys()):
        prog_mask = df["Program"] == program
        if prog_mask.sum() == 0:
            continue
        rate = df.loc[prog_mask, "Board Exam"].mean()
        target = BOARD_EXAM_RATES[program]
        print(f"  {program:20s}: {rate*100:5.1f}% pass (target: {target*100:.0f}%)")

    no_license = df[~df["Program"].isin(BOARD_EXAM_RATES.keys())]
    print(f"  {'(no licensure)':20s}: {no_license['Board Exam'].mean()*100:.1f}% (should be 0%)")

    # 2. Rescale skills from 1-3 -> 1-10 with program boosts
    print(f"\n{'=' * 70}")
    print("STEP 2: Rescaling Skills (1-3 -> 1-10) with Program Boosts")
    print("=" * 70)

    df = rescale_skills(df, rng)

    print(f"\n  Overall skill stats after rescaling:")
    print(f"  {'Soft Skills Ave':25s}: min={df['Soft Skills Ave'].min():.2f}  max={df['Soft Skills Ave'].max():.2f}  mean={df['Soft Skills Ave'].mean():.2f}")
    print(f"  {'Hard Skills Ave':25s}: min={df['Hard Skills Ave'].min():.2f}  max={df['Hard Skills Ave'].max():.2f}  mean={df['Hard Skills Ave'].mean():.2f}")

    print(f"\n  Per-program skill averages (after boosts):")
    for program in sorted(df["Program"].unique()):
        sub = df[df["Program"] == program]
        h = pd.to_numeric(sub["Hard Skills Ave"], errors="coerce").mean()
        s = pd.to_numeric(sub["Soft Skills Ave"], errors="coerce").mean()
        boost = PROGRAM_SKILL_BOOSTS.get(program, (0, 0))
        print(f"    {program:25s}: Hard={h:.2f}  Soft={s:.2f}  (boost: +{boost[0]:.1f}H, +{boost[1]:.1f}S)")

    # 3. Generate synthetic features
    print(f"\n{'=' * 70}")
    print("STEP 3: Generating Synthetic Features (1-5 scales)")
    print("=" * 70)

    df["Internship Experience"] = generate_internship_experience(df, rng)
    df["Certifications"] = generate_certifications(df, df["Board Exam"], rng)

    print(f"  Internship Experience (1-5): min={df['Internship Experience'].min()}, "
          f"max={df['Internship Experience'].max()}, "
          f"mean={df['Internship Experience'].mean():.2f}, "
          f"median={df['Internship Experience'].median():.1f}")
    print(f"  Certifications (1-5):        min={df['Certifications'].min()}, "
          f"max={df['Certifications'].max()}, "
          f"mean={df['Certifications'].mean():.2f}, "
          f"median={df['Certifications'].median():.0f}")

    print(f"\n  Internship Experience distribution:")
    bins = pd.cut(df["Internship Experience"], bins=[0.5, 1.5, 2.5, 3.5, 4.5, 5.5],
                  labels=["1", "2", "3", "4", "5"])
    print(f"  {bins.value_counts().sort_index().to_dict()}")

    print(f"\n  Certifications distribution:")
    print(f"  {df['Certifications'].value_counts().sort_index().to_dict()}")

    # 4. Relabel Employability
    print(f"\n{'=' * 70}")
    print("STEP 4: Relabeling Employability (target: 75/25)")
    print("=" * 70)

    df["Employability"] = relabel_employability(df, df["Board Exam"], rng)

    emp_counts = df["Employability"].value_counts()
    total = len(df)
    for label, count in emp_counts.items():
        print(f"  {label:20s}: {count:6d} ({count/total*100:.1f}%)")

    print(f"\n  Per-program employability rates:")
    for program in sorted(df["Program"].unique()):
        prog_df = df[df["Program"] == program]
        emp_rate = (prog_df["Employability"] == "Employable").mean()
        print(f"    {program:25s}: {emp_rate*100:5.1f}% employable ({len(prog_df)} students)")

    # 5. Blank out Employability Reason
    df["Employability Reason"] = ""

    # 6. Feature separation check
    print(f"\n{'=' * 70}")
    print("STEP 5: Feature Separation Check")
    print("=" * 70)

    features_to_check = ["CGPA", "OJT Grade", "Soft Skills Ave", "Hard Skills Ave",
                         "Board Exam", "Internship Experience", "Certifications"]
    for label in ["Employable", "Less Employable"]:
        subset = df[df["Employability"] == label]
        print(f"\n  {label} ({len(subset)} rows):")
        for f in features_to_check:
            vals = pd.to_numeric(subset[f], errors="coerce")
            print(f"    {f:25s}: mean={vals.mean():.3f}  std={vals.std():.3f}")

    if args.dry_run:
        print(f"\n[DRY RUN] No file written.")
        return

    # Move new columns to be right after Board Exam
    cols = list(df.columns)
    for new_col in ["Internship Experience", "Certifications"]:
        if new_col in cols:
            cols.remove(new_col)
    insert_at = cols.index("Board Exam") + 1
    cols.insert(insert_at, "Internship Experience")
    cols.insert(insert_at + 1, "Certifications")
    df = df[cols]

    # Write
    df.to_csv(OUTPUT_CSV, index=False)
    print(f"\n[OK] Written {len(df)} rows to {OUTPUT_CSV.name}")
    print(f"     Original preserved at {INPUT_CSV.name}")


if __name__ == "__main__":
    main()
