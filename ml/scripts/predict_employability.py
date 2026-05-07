"""
Employability Prediction Script
================================
Called by the Node.js server to predict employability for a single student.
Reads JSON from stdin, loads model artifacts, and outputs JSON to stdout.

Compatible with: LogisticRegression, RandomForestClassifier, VotingClassifier
"""
import sys
import json
import pandas as pd
import joblib
from pathlib import Path
import warnings

warnings.filterwarnings("ignore")

MODEL_DIR = Path(__file__).resolve().parent.parent / "models" / "employability"

FEATURE_COLS = [
    'CGPA', 'Average Prof Grade', 'Average Elec Grade', 'OJT Grade',
    'Leadership POS', 'Act Member POS', 'Soft Skills Ave', 'Hard Skills Ave',
    'Board Exam', 'Internship Experience', 'Certifications'
]

BINARY_COLS = ['Leadership POS', 'Act Member POS']


def load_artifacts():
    """Load saved model artifacts."""
    # New unified model path
    model_path = MODEL_DIR / "model.pkl"

    # Fallback to legacy paths for backward compatibility
    if not model_path.exists():
        for legacy_name in ["logistic_regression.pkl", "random_forest.pkl"]:
            legacy_path = MODEL_DIR / legacy_name
            if legacy_path.exists():
                model_path = legacy_path
                break

    if not model_path.exists():
        raise FileNotFoundError(f"No model found in {MODEL_DIR}")

    model = joblib.load(model_path)
    scaler = joblib.load(MODEL_DIR / "scaler.pkl")
    label_encoder = joblib.load(MODEL_DIR / "label_encoder.pkl")

    # Load feature names (fallback to hardcoded if missing)
    feature_names_path = MODEL_DIR / "feature_names.pkl"
    if feature_names_path.exists():
        feature_names = joblib.load(feature_names_path)
    else:
        feature_names = FEATURE_COLS

    return model, scaler, label_encoder, feature_names


def prepare_input(data, feature_names):
    """
    Convert raw input dict into a model-ready DataFrame.
    Handles unit conversions for grades and skill scales.
    """
    df = pd.DataFrame([data])

    # Ensure all expected columns exist
    for col in feature_names:
        if col not in df.columns:
            df[col] = 0.0

    # Select and reorder
    df = df[feature_names]

    # --- Binary columns (Yes/No -> 1/0) ---
    for col in BINARY_COLS:
        if col in df.columns:
            val = str(df[col].iloc[0]).strip().lower()
            df[col] = 1 if val in ('yes', 'true', '1') else 0

    # --- Numeric coercion ---
    numeric_cols = [c for c in feature_names if c not in BINARY_COLS]
    for col in numeric_cols:
        df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0.0)

    # NOTE: No scale conversions applied here. The model was trained on raw
    # values (Philippine 1-5 GPA scale, raw skill averages), so predictions
    # must use the same scale to match the scaler's training distribution.

    return df


def predict():
    try:
        input_raw = sys.stdin.read()
        if not input_raw.strip():
            return

        data = json.loads(input_raw)
        model, scaler, label_encoder, feature_names = load_artifacts()

        if isinstance(data, list):
            data = data[0]

        df = prepare_input(data, feature_names)

        # Scale and predict
        X_scaled = scaler.transform(df)
        prediction_idx = model.predict(X_scaled)[0]
        probabilities = model.predict_proba(X_scaled)[0]

        # Decode
        prediction_label = label_encoder.inverse_transform([prediction_idx])[0]
        classes = list(label_encoder.classes_)
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
