import pandas as pd
import numpy as np
import mysql.connector
import joblib
from pathlib import Path
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.linear_model import LogisticRegression
from dotenv import load_dotenv
import os

# Load Environment Variables
ENV_PATH = Path(__file__).resolve().parent.parent.parent.parent / "server" / ".env"
load_dotenv(dotenv_path=ENV_PATH)

# Path setup
ML_DIR = Path(__file__).resolve().parent.parent.parent
MODEL_DIR = ML_DIR / "models" / "employability"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "alumni_tracer"),
        port=int(os.getenv("DB_PORT", 3307))
    )

def fetch_training_data():
    """
    LEAKAGE-PROOF DATA COLLECTION:
    Only fetch features from StudentAcademic snapshots where we have an actual 
    outcome (employment_status) from a FOLLOW-UP survey.
    """
    conn = get_db_connection()
    
    # Query: Match FOLLOW-UP responses with their corresponding academic features
    query = """
    SELECT 
        sa.gender as Gender,
        sa.age as Age,
        d.name as Degree,
        sa.year_graduated as `Year Graduated`,
        sa.cgpa as CGPA,
        sa.prof_grade as `Average Prof Grade`,
        sa.elec_grade as `Average Elec Grade`,
        sa.ojt_grade as `OJT Grade`,
        IF(sa.leader_pos, 'Yes', 'No') as `Leadership POS`,
        IF(sa.act_member_pos, 'Yes', 'No') as `Act Member POS`,
        sr.soft_skills_ave as `Soft Skills Ave`,
        sr.hard_skills_ave as `Hard Skills Ave`,
        sr.employment_status as Employability
    FROM surveyresponse sr
    JOIN studentacademic sa ON sr.student_academic_id = sa.id
    JOIN degree d ON sa.degree_id = d.id
    WHERE sr.template_id = 2 -- Follow-up template
      AND sr.employment_status IS NOT NULL
    """
    
    df = pd.read_sql(query, conn)
    conn.close()
    return df

def retrain():
    print("Starting continuous retraining pipeline...")
    
    df = fetch_training_data()
    
    if len(df) < 50:
        print(f"Aborting retraining: Only {len(df)} samples available. Need at least 50.")
        return
    
    print(f"Retraining on {len(df)} fresh samples...")
    
    # Standardize Target (Employability)
    # The model expects 'Employable' and 'Not Employable'
    # er.status: 'Employed', 'Unemployed', 'Self-Employed', 'Freelancer', 'Further Studies'
    df['Employability'] = df['Employability'].map({
        'Employed': 'Employable',
        'Freelancer': 'Employable',
        'Self-Employed': 'Employable',
        'Unemployed': 'Not Employable',
        'Further Studies': 'Not Employable'
    })
    
    df = df.dropna(subset=['Employability'])
    
    feature_cols = [
        'Gender', 'Age', 'Degree', 'Year Graduated', 'CGPA',
        'Average Prof Grade', 'Average Elec Grade', 'OJT Grade',
        'Leadership POS', 'Act Member POS', 'Soft Skills Ave', 'Hard Skills Ave'
    ]
    
    X = df[feature_cols].copy()
    y = df['Employability'].copy()
    
    # Encoders
    target_le = LabelEncoder()
    y_encoded = target_le.fit_transform(y)
    
    categorical_cols = ['Gender', 'Degree', 'Leadership POS', 'Act Member POS']
    categorical_encoders = {}
    for col in categorical_cols:
        le_cat = LabelEncoder()
        X[col] = le_cat.fit_transform(X[col].astype(str))
        categorical_encoders[col] = le_cat
        
    # Scale
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Model
    model = LogisticRegression(max_iter=1000, class_weight='balanced')
    model.fit(X_scaled, y_encoded)
    
    # Save Artifacts (Overwrites current production model)
    joblib.dump(model, MODEL_DIR / "logistic_regression.pkl")
    joblib.dump(scaler, MODEL_DIR / "scaler.pkl")
    joblib.dump(target_le, MODEL_DIR / "label_encoder.pkl")
    joblib.dump(categorical_encoders, MODEL_DIR / "categorical_encoders.pkl")
    joblib.dump(feature_cols, MODEL_DIR / "feature_names.pkl")
    
    print("✅ Model retraining complete. Production artifacts updated.")

if __name__ == "__main__":
    retrain()
