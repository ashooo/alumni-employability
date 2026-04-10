import pandas as pd
from pathlib import Path

def merge_student_datasets(df1_path, df2_path, output_path=None):
    """
    Merge two student datasets, keeping only specified columns and removing Student Number.
    """
    df1 = pd.read_csv(df1_path)
    df2 = pd.read_csv(df2_path)

    # standardize employability header
    df2 = df2.rename(columns={'Employable': 'Employability'})

    columns_to_keep = [
        'Gender', 'Age', 'Degree', 'Year Graduated', 'CGPA',
        'Average Prof Grade', 'Average Elec Grade', 'OJT Grade',
        'Leadership POS', 'Act Member POS', 'Soft Skills Ave',
        'Hard Skills Ave', 'Employability'
    ]

    merged = pd.concat([df1[columns_to_keep], df2[columns_to_keep]], ignore_index=True)

    if output_path:
        merged.to_csv(output_path, index=False)
        print(f"Merged data saved to {output_path}")

    return merged

if __name__ == "__main__":
    # Example usage when script is run directly
    # Assuming raw data lives in ml/data/raw/
    base_dir = Path(__file__).parent.parent  # goes up to ml/
    raw_dir = base_dir / "data" / "raw"
    processed_dir = base_dir / "data" / "processed"
    processed_dir.mkdir(parents=True, exist_ok=True)

    merge_student_datasets(
        df1_path=raw_dir / "student500.csv",
        df2_path=raw_dir / "student1000-labeled.csv",
        output_path=processed_dir / "student-dataset-merged.csv"
    )