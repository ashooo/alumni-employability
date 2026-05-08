import pandas as pd
df = pd.read_csv(r'd:\proj\alumni-merging\alumni-employability\ml\data\employability\combined_employability.csv')

print("=== SCALE CHECK ===")
for col in ['Soft Skills Ave', 'Hard Skills Ave', 'CGPA', 'OJT Grade', 'Average Prof Grade', 'Average Elec Grade']:
    s = pd.to_numeric(df[col], errors='coerce')
    print(f"{col:25s}: min={s.min():.2f}  max={s.max():.2f}  mean={s.mean():.2f}  std={s.std():.2f}")

print("\n=== INDIVIDUAL SKILL COLUMNS (sample) ===")
skill_cols = [c for c in df.columns if 'Skills' in c]
for col in skill_cols[:10]:
    s = pd.to_numeric(df[col], errors='coerce').dropna()
    if len(s) > 0:
        print(f"{col:45s}: min={s.min():.2f}  max={s.max():.2f}  mean={s.mean():.2f}  n={len(s)}")

print("\n=== PER-PROGRAM HARD SKILLS AVE ===")
for prog in sorted(df['Program'].unique()):
    sub = df[df['Program'] == prog]
    h = pd.to_numeric(sub['Hard Skills Ave'], errors='coerce')
    s = pd.to_numeric(sub['Soft Skills Ave'], errors='coerce')
    print(f"{prog:25s}: Hard={h.mean():.2f}  Soft={s.mean():.2f}")
