import pandas as pd
import numpy as np

# Set random seed for reproducibility of the noise
np.random.seed(42)

FILE_PATH = 'ml/data/processed/student-dataset-merged.csv'

def convert_cgpa(cgpa):
    """
    Converts 1.0 - 5.0 scale to a 50-100 percentage.
    1.0 -> 100%
    3.0 -> 75%
    5.0 -> 50%
    """
    # Clip values just in case
    cgpa = max(1.0, min(5.0, cgpa))
    return 100.0 - (cgpa - 1.0) * 12.5

def calculate_employability():
    print(f"Reading {FILE_PATH}...")
    df = pd.read_csv(FILE_PATH)
    
    # Store original values
    original_labels = df['Employability'].copy()
    
    # Weights based on user request: CGPA ~30%, Skills ~50%, Others ~20%
    W_CGPA = 0.30
    W_PROF = 0.05
    W_ELEC = 0.05
    W_OJT = 0.08
    
    W_HARD = 0.30
    W_SOFT = 0.20
    
    W_LEAD = 0.01
    W_ACT = 0.01
    
    final_scores = []
    
    for _, row in df.iterrows():
        # 1. Academic Performance
        cgpa_score = convert_cgpa(row['CGPA'])
        prof_score = row['Average Prof Grade']
        elec_score = row['Average Elec Grade']
        ojt_score = row['OJT Grade']
        
        # 2. Skills
        hard_score = row['Hard Skills Ave']
        soft_score = row['Soft Skills Ave']
        
        # 3. Experience (Scale to 0-100)
        lead_score = 100 if row['Leadership POS'] == 'Yes' else 0
        act_score = 100 if row['Act Member POS'] == 'Yes' else 0
        
        # Base Score
        final_score = (
            (cgpa_score * W_CGPA) + 
            (prof_score * W_PROF) + 
            (elec_score * W_ELEC) + 
            (ojt_score * W_OJT) + 
            (hard_score * W_HARD) + 
            (soft_score * W_SOFT) + 
            (lead_score * W_LEAD) + 
            (act_score * W_ACT)
        )
        
        final_scores.append(final_score)
        
    df['RawScore'] = final_scores
    
    # Determine Threshold to keep a realistic class balance (e.g., top 45% are employable)
    threshold = np.percentile(final_scores, 55) # 55th percentile means 45% will be >= threshold

    
    print(f"Calculated Threshold: {threshold:.2f}")
    
    # Assign new labels
    df['Employability'] = df['RawScore'].apply(lambda x: 'Employable' if x >= threshold else 'Not Employable')
    
    # Drop the temporary RawScore column
    df = df.drop(columns=['RawScore'])
    
    # Print stats
    old_counts = original_labels.value_counts().to_dict()
    new_counts = df['Employability'].value_counts().to_dict()
    
    print("\n--- Relabeling Complete ---")
    print(f"Old Distribution: {old_counts}")
    print(f"New Distribution: {new_counts}")
    
    df.to_csv(FILE_PATH, index=False)
    print(f"Saved relabeled data to {FILE_PATH}")

if __name__ == "__main__":
    calculate_employability()
