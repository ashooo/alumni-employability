from pathlib import Path
import pandas as pd

ML_DIR = Path(__file__).resolve().parents[2]
RAW_INPUT = ML_DIR / "data" / "raw" / "student1000.csv"
LABELED_OUTPUT = ML_DIR / "data" / "raw" / "student1000-labeled.csv"

df = pd.read_csv(RAW_INPUT)

def label_with_rubric(row):
    # CGPA
    cgpa_score = (5 - row['CGPA']) * 25
    
    # academic grades
    avg_grade = (row['Average Prof Grade'] + row['Average Elec Grade'] + row['OJT Grade']) / 3
    
    # skills ave
    skills_avg = (row['Soft Skills Ave'] + row['Hard Skills Ave']) / 2
    
    # acitivities
    involvement = 10 if (row['Leadership POS'] == 'Yes' or row['Act Member POS'] == 'Yes') else 0
    
    # Composite (cap at 100)
    composite = (cgpa_score * 0.25) + (avg_grade * 0.25) + (skills_avg * 0.30) + involvement
    composite = min(composite, 100)
    
    return composite, 'Yes' if composite >= 65 else 'No'

df[['Composite_Score', 'Employable']] = df.apply(
    lambda row: label_with_rubric(row), axis=1, result_type='expand'
)

LABELED_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
df.to_csv(LABELED_OUTPUT, index=False)
print(f"Labeled data saved to {LABELED_OUTPUT}")
