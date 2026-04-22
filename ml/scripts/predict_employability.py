import sys
import json
import pandas as pd
import joblib
from pathlib import Path
import warnings

# Suppress warnings for clean output
warnings.filterwarnings("ignore")

# Path to artifacts
MODEL_DIR = Path(__file__).resolve().parent.parent / "models" / "employability"

def load_artifacts():
    # Find the pkl file (might be random_forest.pkl or logistic_regression.pkl)
    model_paths = list(MODEL_DIR.glob("*.pkl"))
    model_path = next((p for p in model_paths if p.name in ["logistic_regression.pkl", "random_forest.pkl"]), None)
    
    if not model_path:
        raise FileNotFoundError(f"Model file not found in {MODEL_DIR}")
        
    model = joblib.load(model_path)
    scaler = joblib.load(MODEL_DIR / "scaler.pkl")
    target_le = joblib.load(MODEL_DIR / "label_encoder.pkl")
    cat_encoders = joblib.load(MODEL_DIR / "categorical_encoders.pkl")
    feature_names = joblib.load(MODEL_DIR / "feature_names.pkl")
    return model, scaler, target_le, cat_encoders, feature_names

def predict():
    try:
        # Read from stdin
        input_raw = sys.stdin.read()
        if not input_raw.strip():
            return
            
        data = json.loads(input_raw)
        model, scaler, target_le, cat_encoders, feature_names = load_artifacts()
        
        # Expecting a dictionary or list of one dictionary
        if isinstance(data, list):
            data = data[0]
            
        # Create DataFrame
        df = pd.DataFrame([data])
        
        # Reorder columns to match training features exactly
        df = df[feature_names]
        
        # Convert 1.0-5.0 grades to 50-100% scale for model compatibility
        # Conversion: 1.0 -> 100%, 3.0 -> 75%, 5.0 -> 50%
        # Formula: percentage = 100 - (grade - 1.0) * 12.5
        grade_cols = ['Average Prof Grade', 'Average Elec Grade', 'OJT Grade']
        for col in grade_cols:
            if col in df.columns:
                # Only convert if the value looks like it's on the 1.0-5.0 scale
                df[col] = df[col].apply(lambda x: 100.0 - (x - 1.0) * 12.5 if x <= 5.0 else x)
                
        # Scale 1-10 skills to 10-100 scale for model compatibility
        skill_cols = ['Soft Skills Ave', 'Hard Skills Ave']
        for col in skill_cols:
            if col in df.columns:
                # Only convert if the value is <= 10.0
                df[col] = df[col].apply(lambda x: x * 10.0 if x <= 10.0 else x)

        # Apply Categorical Encoders saved during training
        for col, le in cat_encoders.items():
            if col in df.columns:
                val = str(df[col].iloc[0])
                try:
                    df[col] = le.transform([val])[0]
                except ValueError:
                    # Fallback to the most frequent class or first class if unseen
                    df[col] = le.transform([le.classes_[0]])[0]

        # Apply Scaler
        X_scaled = scaler.transform(df)
        
        # Run Model
        prediction_idx = model.predict(X_scaled)[0]
        probabilities = model.predict_proba(X_scaled)[0]
        
        # Decode result
        prediction_label = target_le.inverse_transform([prediction_idx])[0]
        
        # Check index of 'Employable' class for specific probability
        classes = list(target_le.classes_)
        employable_idx = classes.index("Employable") if "Employable" in classes else 0
        
        result = {
            "status": "success",
            "employable": bool(prediction_label == "Employable"),
            "probability": float(probabilities[employable_idx]),
            "label": prediction_label,
            "confidence": float(max(probabilities)),
            "model_type": type(model).__name__
        }
        
        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({
            "status": "error",
            "message": str(e)
        }))

if __name__ == "__main__":
    predict()
