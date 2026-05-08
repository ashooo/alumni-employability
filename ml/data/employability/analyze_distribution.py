"""
Analyze the combined_employability.csv to understand feature distributions
and propose realistic relabeling thresholds.
"""
import pandas as pd
import numpy as np
from pathlib import Path

CSV_PATH = Path(__file__).parent / "combined_employability.csv"
df = pd.read_csv(CSV_PATH)

print(f"Total rows: {len(df)}")
print(f"\nCurrent class distribution:")
print(df['Employability'].value_counts())
print()

# Key numeric features
features = ['CGPA', 'Average Prof Grade', 'Average Elec Grade', 'OJT Grade',
            'Leadership POS', 'Act Member POS', 'Soft Skills Ave', 'Hard Skills Ave', 'Board Exam']

print("=" * 80)
print("FEATURE STATISTICS (All students)")
print("=" * 80)
for f in features:
    if f in df.columns:
        vals = pd.to_numeric(df[f], errors='coerce')
        print(f"\n{f}:")
        print(f"  min={vals.min():.2f}  max={vals.max():.2f}  mean={vals.mean():.2f}  median={vals.median():.2f}  std={vals.std():.2f}")
        # Show percentiles
        for p in [10, 25, 50, 75, 90]:
            print(f"  P{p}: {vals.quantile(p/100):.2f}")

print("\n" + "=" * 80)
print("FEATURE STATISTICS BY CLASS")
print("=" * 80)
for label in df['Employability'].unique():
    subset = df[df['Employability'] == label]
    print(f"\n--- {label} ({len(subset)} rows) ---")
    for f in features:
        if f in df.columns:
            vals = pd.to_numeric(subset[f], errors='coerce')
            print(f"  {f}: mean={vals.mean():.2f}  median={vals.median():.2f}  std={vals.std():.2f}")

print("\n" + "=" * 80)
print("DISTRIBUTION BY PROGRAM")
print("=" * 80)
print(df.groupby(['Program', 'Employability']).size().unstack(fill_value=0))

# Simulate different thresholds for relabeling
print("\n" + "=" * 80)
print("RELABELING SIMULATION")
print("=" * 80)

# The idea: students with weak academics should be "Less Employable"
# On a 1-5 GPA scale (1=best), higher values = worse
# For skills (seems to be 1-5 or 1-10 scale), lower values = worse

cgpa = pd.to_numeric(df['CGPA'], errors='coerce')
soft = pd.to_numeric(df['Soft Skills Ave'], errors='coerce')
hard = pd.to_numeric(df['Hard Skills Ave'], errors='coerce')
ojt = pd.to_numeric(df['OJT Grade'], errors='coerce')
prof = pd.to_numeric(df['Average Prof Grade'], errors='coerce')

# Check if GPA scale is 1-5 (Philippine style, 1=best) or percentage
print(f"\nCGPA range: {cgpa.min():.2f} - {cgpa.max():.2f}")
print(f"OJT range: {ojt.min():.2f} - {ojt.max():.2f}")
print(f"Soft Skills range: {soft.min():.2f} - {soft.max():.2f}")
print(f"Hard Skills range: {hard.min():.2f} - {hard.max():.2f}")

# Composite score: lower CGPA is better (1-5 scale), higher skills are better
# Normalize to 0-1 scale
cgpa_norm = 1 - (cgpa - cgpa.min()) / (cgpa.max() - cgpa.min())  # invert: 1=best
soft_norm = (soft - soft.min()) / (soft.max() - soft.min())
hard_norm = (hard - hard.min()) / (hard.max() - hard.min())
ojt_norm = 1 - (ojt - ojt.min()) / (ojt.max() - ojt.min())  # invert: 1=best

composite = 0.25 * cgpa_norm + 0.20 * ojt_norm + 0.30 * hard_norm + 0.25 * soft_norm

for target_pct in [20, 25, 30]:
    threshold = np.percentile(composite, target_pct)
    less_emp_count = (composite <= threshold).sum()
    print(f"\nTarget ~{target_pct}% Less Employable:")
    print(f"  Composite threshold: {threshold:.4f}")
    print(f"  Would mark {less_emp_count} as Less Employable ({less_emp_count/len(df)*100:.1f}%)")
    print(f"  Remaining Employable: {len(df) - less_emp_count} ({(len(df)-less_emp_count)/len(df)*100:.1f}%)")
    
    # Show the feature means for each group
    mask = composite <= threshold
    print(f"  Less Employable group means: CGPA={cgpa[mask].mean():.2f}, Soft={soft[mask].mean():.2f}, Hard={hard[mask].mean():.2f}, OJT={ojt[mask].mean():.2f}")
    print(f"  Employable group means:      CGPA={cgpa[~mask].mean():.2f}, Soft={soft[~mask].mean():.2f}, Hard={hard[~mask].mean():.2f}, OJT={ojt[~mask].mean():.2f}")
