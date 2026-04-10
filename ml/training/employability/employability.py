"""
Train an employability classification model and save artifacts.
Usage: python employability.py
"""
import pandas as pd
import numpy as np
from pathlib import Path
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score

# ---------------------------
# Paths (robust to script location)
# ---------------------------
# Assume this script is somewhere inside 'ml/training/employability/'
# Navigate up until we find the project root (contains 'ml' folder)
current_file = Path(__file__).resolve()
BASE_DIR = current_file
while BASE_DIR.name != "ml" and BASE_DIR.parent != BASE_DIR:
    BASE_DIR = BASE_DIR.parent
# Now BASE_DIR should be the 'ml' directory
ML_DIR = BASE_DIR
PROJECT_ROOT = ML_DIR.parent  # alumni-employability root

DATA_DIR = ML_DIR / "data"
PROCESSED_DATA = DATA_DIR / "processed" / "student-dataset-merged.csv"
MODEL_DIR = ML_DIR / "models" / "employability"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------
# Load Data
# ---------------------------
df = pd.read_csv(PROCESSED_DATA)
print(f"Loaded {len(df)} rows from {PROCESSED_DATA}")

# ---------------------------
# Data Cleaning: Standardize Target Labels
# ---------------------------
target_col = 'Employability'

# Print unique values before cleaning
print(f"Unique target values BEFORE cleaning: {df[target_col].unique()}")

# Map inconsistent labels to binary classes
label_mapping = {
    'Yes': 'Employable',
    'Employable': 'Employable',
    'No': 'Not Employable',
    'Not Employable': 'Not Employable'
}
df[target_col] = df[target_col].map(label_mapping)

# Drop rows where target is NaN (if any unexpected values existed)
df = df.dropna(subset=[target_col])

print(f"Unique target values AFTER cleaning: {df[target_col].unique()}")
print(f"Dataset size after cleaning: {len(df)} rows")

# ---------------------------
# Preprocessing
# ---------------------------
# Feature columns (exclude derived composite score and student ID)
feature_cols = [
    'Gender', 'Age', 'Degree', 'Year Graduated', 'CGPA',
    'Average Prof Grade', 'Average Elec Grade', 'OJT Grade',
    'Leadership POS', 'Act Member POS', 'Soft Skills Ave', 'Hard Skills Ave'
]

X = df[feature_cols].copy()
y = df[target_col].copy()

# Encode target to 0/1 (order: alphabetical, so 'Employable' -> 0, 'Not Employable' -> 1)
le = LabelEncoder()
y_encoded = le.fit_transform(y)
print(f"Label encoding mapping: {dict(zip(le.classes_, le.transform(le.classes_)))}")

# Encode categorical features
categorical_cols = ['Gender', 'Degree', 'Leadership POS', 'Act Member POS']
for col in categorical_cols:
    X[col] = LabelEncoder().fit_transform(X[col])

# Train/Test Split (stratified to preserve class ratio)
X_train, X_test, y_train, y_test = train_test_split(
    X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
)

# Scale numeric features
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# ---------------------------
# Model Selection (Toggle below)
# ---------------------------
USE_RANDOM_FOREST = False  # Set to True to use Random Forest instead of Logistic Regression

if USE_RANDOM_FOREST:
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        random_state=42,
        class_weight='balanced'  # Helps with imbalanced data
    )
    model_name = "random_forest"
else:
    model = LogisticRegression(
        max_iter=1000,
        random_state=42,
        class_weight='balanced'   # Helps with imbalanced data
    )
    model_name = "logistic_regression"

print(f"\nTraining model: {model_name.upper()}")

# Train
model.fit(X_train_scaled, y_train)

# ---------------------------
# Evaluation
# ---------------------------
y_pred = model.predict(X_test_scaled)
accuracy = accuracy_score(y_test, y_pred)
print(f"\nTest Accuracy: {accuracy:.4f}")
print("\nClassification Report:")
print(classification_report(y_test, y_pred, target_names=le.classes_))
print("\nConfusion Matrix:")
print(confusion_matrix(y_test, y_pred))

# Feature importance (if available)
if hasattr(model, 'feature_importances_'):
    importances = model.feature_importances_
elif hasattr(model, 'coef_'):
    importances = np.abs(model.coef_[0])
else:
    importances = None

if importances is not None:
    feature_imp = pd.DataFrame({
        'Feature': feature_cols,
        'Importance': importances
    }).sort_values('Importance', ascending=False)
    print("\nTop Feature Importances:")
    print(feature_imp.head(10))

# ---------------------------
# Save Model and Artifacts
# ---------------------------
joblib.dump(model, MODEL_DIR / f"{model_name}.pkl")
joblib.dump(scaler, MODEL_DIR / "scaler.pkl")
joblib.dump(le, MODEL_DIR / "label_encoder.pkl")
joblib.dump(feature_cols, MODEL_DIR / "feature_names.pkl")

print(f"\n✅ Model and artifacts saved to {MODEL_DIR}")