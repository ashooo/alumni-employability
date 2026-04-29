"""
Employability Classification Model - Training Pipeline
======================================================
Trains Logistic Regression and Random Forest classifiers on historical
alumni data retrieved from the database. Compares models using F1-score
and ROC-AUC, then selects the best single model or a soft-voting ensemble.

Usage:
    python employability.py              # Train from database
    python employability.py --dry-run    # Preview data without training

Outputs saved to ml/models/employability/:
    model.pkl               - The selected model (LR, RF, or VotingClassifier)
    scaler.pkl              - StandardScaler fitted on training features
    label_encoder.pkl       - Target label encoder (Employable / Not Employable)
    feature_names.pkl       - Ordered list of feature column names
    training_report.json    - Full training metrics, model selection rationale
"""

import sys
import json
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime
import joblib

from sklearn.model_selection import train_test_split, StratifiedKFold, GridSearchCV
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.metrics import (
    classification_report, confusion_matrix, accuracy_score,
    f1_score, roc_auc_score, precision_recall_curve
)

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
ML_DIR = Path(__file__).resolve().parent.parent.parent  # ml/
MODEL_DIR = ML_DIR / "models" / "employability"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
RANDOM_STATE = 42
TEST_SIZE = 0.2
CV_FOLDS = 5
ENSEMBLE_THRESHOLD = 0.02  # 2% F1 difference threshold for ensemble decision

FEATURE_COLS = [
    'CGPA', 'Average Prof Grade', 'Average Elec Grade', 'OJT Grade',
    'Leadership POS', 'Act Member POS', 'Soft Skills Ave', 'Hard Skills Ave'
]
TARGET_COL = 'Employability'
BINARY_COLS = ['Leadership POS', 'Act Member POS']  # Yes/No -> 1/0


def load_data():
    """Fetch training data from the database via db_utils."""
    from db_utils import get_training_data
    df = get_training_data()
    print(f"Loaded {len(df)} records from database.")
    return df


def preprocess(df):
    """
    Clean and prepare features + target.
    Returns X (DataFrame), y_encoded (ndarray), label_encoder.
    """
    # --- Target ---
    label_map = {
        'Employable': 'Employable',
        'Yes': 'Employable',
        'Not Employable': 'Not Employable',
        'No': 'Not Employable',
    }
    df[TARGET_COL] = df[TARGET_COL].map(label_map)
    df = df.dropna(subset=[TARGET_COL])

    le = LabelEncoder()
    y = le.fit_transform(df[TARGET_COL])
    print(f"Label mapping: {dict(zip(le.classes_, le.transform(le.classes_)))}")

    # --- Features ---
    X = df[FEATURE_COLS].copy()

    # Encode binary Yes/No columns to 1/0
    for col in BINARY_COLS:
        X[col] = X[col].map({'Yes': 1, 'No': 0}).fillna(0).astype(int)

    # Ensure all numeric
    for col in X.columns:
        X[col] = pd.to_numeric(X[col], errors='coerce').fillna(0.0)

    # --- Class balance check ---
    unique, counts = np.unique(y, return_counts=True)
    balance = dict(zip(le.inverse_transform(unique), counts))
    print(f"Class distribution: {balance}")
    ratio = min(counts) / max(counts)
    print(f"Minority/majority ratio: {ratio:.2f}")
    if ratio < 0.4:
        print("[!] Moderate class imbalance detected -> using class_weight='balanced'")

    return X, y, le, balance


def train_and_evaluate(X_train, X_test, y_train, y_test, le):
    """
    Train LR and RF independently with GridSearchCV, compare, and decide.
    Returns: chosen model, scaler, training report dict.
    """
    cv = StratifiedKFold(n_splits=CV_FOLDS, shuffle=True, random_state=RANDOM_STATE)

    # --- StandardScaler (applied to both for pipeline simplicity) ---
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # ---------------------------------------------------------------
    # Logistic Regression
    # ---------------------------------------------------------------
    print("\n" + "=" * 60)
    print("LOGISTIC REGRESSION")
    print("=" * 60)

    lr_param_grid = {
        'C': [0.01, 0.1, 1.0, 10.0],
        'solver': ['lbfgs'],
        'max_iter': [1000],
    }
    lr_grid = GridSearchCV(
        LogisticRegression(random_state=RANDOM_STATE, class_weight='balanced'),
        lr_param_grid, cv=cv, scoring='f1', n_jobs=-1, refit=True
    )
    lr_grid.fit(X_train_scaled, y_train)
    lr_model = lr_grid.best_estimator_
    lr_pred = lr_model.predict(X_test_scaled)
    lr_proba = lr_model.predict_proba(X_test_scaled)

    lr_f1 = f1_score(y_test, lr_pred, average='weighted')
    lr_auc = roc_auc_score(y_test, lr_proba[:, 1])
    lr_acc = accuracy_score(y_test, lr_pred)

    print(f"Best params: {lr_grid.best_params_}")
    print(f"F1: {lr_f1:.4f}  |  AUC: {lr_auc:.4f}  |  Accuracy: {lr_acc:.4f}")
    print(classification_report(y_test, lr_pred, target_names=le.classes_))

    # Feature coefficients
    lr_importance = pd.DataFrame({
        'Feature': FEATURE_COLS,
        'Coefficient': np.abs(lr_model.coef_[0])
    }).sort_values('Coefficient', ascending=False)
    print("Feature Coefficients (absolute):")
    print(lr_importance.to_string(index=False))

    # ---------------------------------------------------------------
    # Random Forest
    # ---------------------------------------------------------------
    print("\n" + "=" * 60)
    print("RANDOM FOREST")
    print("=" * 60)

    rf_param_grid = {
        'n_estimators': [100, 200],
        'max_depth': [5, 10, 15, None],
        'min_samples_leaf': [5, 10],
    }
    rf_grid = GridSearchCV(
        RandomForestClassifier(random_state=RANDOM_STATE, class_weight='balanced'),
        rf_param_grid, cv=cv, scoring='f1', n_jobs=-1, refit=True
    )
    rf_grid.fit(X_train_scaled, y_train)
    rf_model = rf_grid.best_estimator_
    rf_pred = rf_model.predict(X_test_scaled)
    rf_proba = rf_model.predict_proba(X_test_scaled)

    rf_f1 = f1_score(y_test, rf_pred, average='weighted')
    rf_auc = roc_auc_score(y_test, rf_proba[:, 1])
    rf_acc = accuracy_score(y_test, rf_pred)

    print(f"Best params: {rf_grid.best_params_}")
    print(f"F1: {rf_f1:.4f}  |  AUC: {rf_auc:.4f}  |  Accuracy: {rf_acc:.4f}")
    print(classification_report(y_test, rf_pred, target_names=le.classes_))

    # Feature importances
    rf_importance = pd.DataFrame({
        'Feature': FEATURE_COLS,
        'Importance': rf_model.feature_importances_
    }).sort_values('Importance', ascending=False)
    print("Feature Importances:")
    print(rf_importance.to_string(index=False))

    # ---------------------------------------------------------------
    # Model Selection Decision
    # ---------------------------------------------------------------
    print("\n" + "=" * 60)
    print("MODEL SELECTION")
    print("=" * 60)

    f1_diff = abs(lr_f1 - rf_f1)
    print(f"LR F1: {lr_f1:.4f}  |  RF F1: {rf_f1:.4f}  |  Diff: {f1_diff:.4f}")

    if lr_f1 > rf_f1 + ENSEMBLE_THRESHOLD:
        # LR wins decisively
        chosen_model = lr_model
        model_type = 'LogisticRegression'
        rationale = f"LR wins by {f1_diff:.4f} (>{ENSEMBLE_THRESHOLD}). Using LR only."
        print(f"[OK] {rationale}")

    elif rf_f1 > lr_f1 + ENSEMBLE_THRESHOLD:
        # RF wins decisively
        chosen_model = rf_model
        model_type = 'RandomForestClassifier'
        rationale = f"RF wins by {f1_diff:.4f} (>{ENSEMBLE_THRESHOLD}). Using RF only."
        print(f"[OK] {rationale}")

    else:
        # Both within threshold -> ensemble
        # Weight the better model slightly higher
        if lr_f1 >= rf_f1:
            weights = [1.2, 1.0]
        else:
            weights = [1.0, 1.2]

        ensemble = VotingClassifier(
            estimators=[('lr', lr_model), ('rf', rf_model)],
            voting='soft',
            weights=weights
        )
        # VotingClassifier needs to be fitted (even though sub-models are fitted)
        ensemble.fit(X_train_scaled, y_train)

        ens_pred = ensemble.predict(X_test_scaled)
        ens_proba = ensemble.predict_proba(X_test_scaled)
        ens_f1 = f1_score(y_test, ens_pred, average='weighted')
        ens_auc = roc_auc_score(y_test, ens_proba[:, 1])
        ens_acc = accuracy_score(y_test, ens_pred)

        print(f"Models within {ENSEMBLE_THRESHOLD} -> building soft voting ensemble")
        print(f"Ensemble weights: LR={weights[0]}, RF={weights[1]}")
        print(f"Ensemble F1: {ens_f1:.4f}  |  AUC: {ens_auc:.4f}  |  Accuracy: {ens_acc:.4f}")
        print(classification_report(y_test, ens_pred, target_names=le.classes_))

        # Check disagreements
        disagreements = np.sum(lr_pred != rf_pred)
        print(f"Prediction disagreements between LR and RF: {disagreements}/{len(y_test)} ({disagreements/len(y_test)*100:.1f}%)")

        chosen_model = ensemble
        model_type = 'VotingClassifier'
        lr_f1, rf_f1 = ens_f1, ens_f1  # update for report
        rationale = f"Both within {ENSEMBLE_THRESHOLD}. Ensemble F1={ens_f1:.4f}, weights={weights}"
        print(f"[OK] {rationale}")

    # ---------------------------------------------------------------
    # Optimal Threshold Analysis
    # ---------------------------------------------------------------
    final_proba = chosen_model.predict_proba(X_test_scaled)[:, 1]
    precision_vals, recall_vals, thresholds = precision_recall_curve(y_test, final_proba)
    f1_scores = 2 * (precision_vals * recall_vals) / (precision_vals + recall_vals + 1e-8)
    best_thresh_idx = np.argmax(f1_scores)
    best_threshold = float(thresholds[best_thresh_idx]) if best_thresh_idx < len(thresholds) else 0.5
    print(f"\nOptimal decision threshold: {best_threshold:.3f} (default: 0.500)")

    # ---------------------------------------------------------------
    # Build report
    # ---------------------------------------------------------------
    final_pred = chosen_model.predict(X_test_scaled)
    cm = confusion_matrix(y_test, final_pred).tolist()

    report = {
        'trained_at': datetime.now().isoformat(),
        'dataset_size': len(y_train) + len(y_test),
        'train_size': len(y_train),
        'test_size': len(y_test),
        'features': FEATURE_COLS,
        'model_type': model_type,
        'selection_rationale': rationale,
        'lr_metrics': {'f1': round(lr_f1, 4), 'auc': round(lr_auc, 4), 'accuracy': round(lr_acc, 4), 'best_params': lr_grid.best_params_},
        'rf_metrics': {'f1': round(rf_f1, 4), 'auc': round(rf_auc, 4), 'accuracy': round(rf_acc, 4), 'best_params': rf_grid.best_params_},
        'final_metrics': {
            'f1': round(f1_score(y_test, final_pred, average='weighted'), 4),
            'auc': round(roc_auc_score(y_test, final_proba), 4),
            'accuracy': round(accuracy_score(y_test, final_pred), 4),
        },
        'confusion_matrix': cm,
        'optimal_threshold': round(best_threshold, 4),
        'feature_importance': rf_importance.to_dict(orient='records'),
    }

    return chosen_model, scaler, report


def save_artifacts(model, scaler, le, report):
    """Save all model artifacts to disk."""
    joblib.dump(model, MODEL_DIR / "model.pkl")
    joblib.dump(scaler, MODEL_DIR / "scaler.pkl")
    joblib.dump(le, MODEL_DIR / "label_encoder.pkl")
    joblib.dump(FEATURE_COLS, MODEL_DIR / "feature_names.pkl")

    with open(MODEL_DIR / "training_report.json", 'w') as f:
        json.dump(report, f, indent=2, default=str)

    print(f"\n[OK] Artifacts saved to {MODEL_DIR}/")
    print(f"   model.pkl            ({report['model_type']})")
    print(f"   scaler.pkl           (StandardScaler)")
    print(f"   label_encoder.pkl    (LabelEncoder)")
    print(f"   feature_names.pkl    ({len(FEATURE_COLS)} features)")
    print(f"   training_report.json (full metrics)")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    dry_run = '--dry-run' in sys.argv

    print("=" * 60)
    print("EMPLOYABILITY MODEL TRAINING PIPELINE")
    print(f"Started: {datetime.now().isoformat()}")
    print("=" * 60)

    # 1. Load
    df = load_data()

    # 2. Preprocess
    X, y, le, class_dist = preprocess(df)

    if dry_run:
        print("\n--- DRY RUN: Data preview ---")
        print(X.head(10))
        print(f"\nShape: {X.shape}")
        print(f"Target distribution: {class_dist}")
        return

    # 3. Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y
    )
    print(f"\nSplit: {len(X_train)} train / {len(X_test)} test")

    # 4. Train & Evaluate
    model, scaler, report = train_and_evaluate(X_train, X_test, y_train, y_test, le)

    # 5. Save
    save_artifacts(model, scaler, le, report)

    print(f"\nCompleted: {datetime.now().isoformat()}")


if __name__ == "__main__":
    main()