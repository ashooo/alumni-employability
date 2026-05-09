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
import argparse
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
from sklearn.model_selection import cross_val_score

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
ML_DIR = Path(__file__).resolve().parent.parent.parent  # ml/
MODEL_DIR = ML_DIR / "models" / "employability"
MODEL_DIR.mkdir(parents=True, exist_ok=True)
EVAL_DIR = MODEL_DIR / "evaluation"
EVAL_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
RANDOM_STATE = 42
TEST_SIZE = 0.2
CV_FOLDS = 5
ENSEMBLE_THRESHOLD = 0.0  # Always select the absolute best model
SOFT_VOTE_WEIGHT_GRID = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]

BASE_NUMERIC_FEATURES = [
    'CGPA', 'Average Prof Grade', 'Average Elec Grade', 'OJT Grade',
    'Leadership POS', 'Act Member POS', 'Soft Skills Ave', 'Hard Skills Ave',
    'Board Exam', 'Internship Experience', 'Certifications'
]
CATEGORICAL_CANDIDATES = ['Program', 'Degree']
TARGET_COL = 'Employability'


def load_data(data_path=None):
    """Load training data from CSV path, else fallback to database via db_utils."""
    if data_path:
        df = pd.read_csv(data_path)
        print(f"Loaded {len(df)} records from CSV: {data_path}")
        return df

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
        'Less Employable': 'Not Employable',  # CSV uses this label
        'No': 'Not Employable',
    }
    df[TARGET_COL] = df[TARGET_COL].map(label_map)
    df = df.dropna(subset=[TARGET_COL])

    le = LabelEncoder()
    y = le.fit_transform(df[TARGET_COL])
    print(f"Label mapping: {dict(zip(le.classes_, le.transform(le.classes_)))}")

    # --- Core numeric features ---
    # These features are optional and default to 0 if missing
    optional_features = {'Board Exam', 'Internship Experience', 'Certifications'}
    available_features = [col for col in BASE_NUMERIC_FEATURES if col in df.columns]
    missing_features = [col for col in BASE_NUMERIC_FEATURES
                        if col not in df.columns and col not in optional_features]
    if missing_features:
        raise ValueError(f"Missing required feature columns: {missing_features}")
    for opt in optional_features:
        if opt not in available_features:
            df[opt] = 0
            available_features.append(opt)

    # --- Program / course categorical feature ---
    cat_col = next((c for c in CATEGORICAL_CANDIDATES if c in df.columns), None)

    # --- Skill features (dynamic) ---
    non_skill_columns = set(
        [TARGET_COL, 'snapshot_id', 'Gender', 'Age', 'Year Graduated', 'source_file', 'Employability Reason']
        + CATEGORICAL_CANDIDATES
        + available_features
    )
    skill_columns = []
    for col in df.columns:
        if col in non_skill_columns:
            continue
        # Keep columns that can be treated as numeric skills.
        if pd.to_numeric(df[col], errors='coerce').notna().any():
            skill_columns.append(col)

    X = df[available_features + skill_columns].copy()

    # Ensure numeric conversion for base + skill features.
    for col in X.columns:
        X[col] = pd.to_numeric(X[col], errors='coerce').fillna(0.0)

    # One-hot encode program/course.
    if cat_col:
        cat_values = df[cat_col].fillna('UNKNOWN').astype(str).str.strip()
        cat_dummies = pd.get_dummies(cat_values, prefix=cat_col, dtype=float)
        X = pd.concat([X, cat_dummies], axis=1)

    selected_feature_cols = list(X.columns)
    print(f"Using {len(available_features)} core numeric features, {len(skill_columns)} skill features, "
          f"and {0 if not cat_col else X.filter(regex=f'^{cat_col}_').shape[1]} one-hot {cat_col} features.")

    # --- Class balance check ---
    unique, counts = np.unique(y, return_counts=True)
    balance = dict(zip(le.inverse_transform(unique), counts))
    print(f"Class distribution: {balance}")
    ratio = min(counts) / max(counts)
    print(f"Minority/majority ratio: {ratio:.2f}")
    if ratio < 0.4:
        print("[!] Moderate class imbalance detected -> using class_weight='balanced'")

    return X, y, le, balance, selected_feature_cols


def train_and_evaluate(X_train, X_test, y_train, y_test, le, feature_cols):
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
        lr_param_grid, cv=cv, scoring='f1', n_jobs=1, refit=True
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
        'Feature': feature_cols,
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
        rf_param_grid, cv=cv, scoring='f1', n_jobs=1, refit=True
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
        'Feature': feature_cols,
        'Importance': rf_model.feature_importances_
    }).sort_values('Importance', ascending=False)
    print("Feature Importances:")
    print(rf_importance.to_string(index=False))

    # ---------------------------------------------------------------
    # Always Build Soft Voting Ensemble
    # ---------------------------------------------------------------
    print("\n" + "=" * 60)
    print("SOFT VOTING ENSEMBLE")
    print("=" * 60)

    # Tune LR/RF voting weights using CV on train set to improve ensemble quality.
    candidate_weights = []
    for lr_w in SOFT_VOTE_WEIGHT_GRID:
        rf_w = round(1.0 - lr_w, 1)
        if rf_w <= 0:
            continue
        candidate_weights.append((lr_w, rf_w))

    best_weight_pair = (0.5, 0.5)
    best_weight_f1 = -1.0
    best_weight_acc = -1.0

    for lr_w, rf_w in candidate_weights:
        weight_model = VotingClassifier(
            estimators=[('lr', lr_model), ('rf', rf_model)],
            voting='soft',
            weights=[lr_w, rf_w]
        )
        cv_f1 = cross_val_score(
            weight_model, X_train_scaled, y_train, cv=cv, scoring='f1_weighted', n_jobs=1
        ).mean()
        cv_acc = cross_val_score(
            weight_model, X_train_scaled, y_train, cv=cv, scoring='accuracy', n_jobs=1
        ).mean()

        if cv_f1 > best_weight_f1:
            best_weight_f1 = cv_f1
            best_weight_acc = cv_acc
            best_weight_pair = (lr_w, rf_w)

    weights = [best_weight_pair[0], best_weight_pair[1]]

    ensemble = VotingClassifier(
        estimators=[('lr', lr_model), ('rf', rf_model)],
        voting='soft',
        weights=weights
    )
    ensemble.fit(X_train_scaled, y_train)

    ens_pred = ensemble.predict(X_test_scaled)
    ens_proba = ensemble.predict_proba(X_test_scaled)
    ens_f1 = f1_score(y_test, ens_pred, average='weighted')
    ens_auc = roc_auc_score(y_test, ens_proba[:, 1])
    ens_acc = accuracy_score(y_test, ens_pred)

    print(f"Ensemble weights: LR={weights[0]}, RF={weights[1]}")
    print(f"Best CV weights: f1_weighted={best_weight_f1:.4f}, accuracy={best_weight_acc:.4f}")
    print(f"Ensemble F1: {ens_f1:.4f}  |  AUC: {ens_auc:.4f}  |  Accuracy: {ens_acc:.4f}")
    print(classification_report(y_test, ens_pred, target_names=le.classes_))

    # Disagreement analysis
    disagreements = np.sum(lr_pred != rf_pred)
    print(f"Prediction disagreements between LR and RF: {disagreements}/{len(y_test)} ({disagreements/len(y_test)*100:.1f}%)")

    # ---------------------------------------------------------------
    # Side-by-Side Comparison
    # ---------------------------------------------------------------
    print("\n" + "=" * 60)
    print("MODEL COMPARISON (All Three)")
    print("=" * 60)
    print(f"{'Model':<25} {'F1':>8} {'AUC':>8} {'Accuracy':>10}")
    print("-" * 55)
    print(f"{'Logistic Regression':<25} {lr_f1:>8.4f} {lr_auc:>8.4f} {lr_acc:>10.4f}")
    print(f"{'Random Forest':<25} {rf_f1:>8.4f} {rf_auc:>8.4f} {rf_acc:>10.4f}")
    print(f"{'Soft Voting Ensemble':<25} {ens_f1:>8.4f} {ens_auc:>8.4f} {ens_acc:>10.4f}")

    # Smart model selection: use ensemble only if it beats best individual model
    best_individual_f1 = max(lr_f1, rf_f1)
    best_individual_name = 'Random Forest' if rf_f1 >= lr_f1 else 'Logistic Regression'
    best_individual_model = rf_model if rf_f1 >= lr_f1 else lr_model

    if ens_f1 >= best_individual_f1 + ENSEMBLE_THRESHOLD:
        chosen_model = ensemble
        model_type = 'VotingClassifier'
        rationale = (f"Ensemble selected (F1={ens_f1:.4f}) — beats {best_individual_name} "
                     f"(F1={best_individual_f1:.4f}) by {ens_f1 - best_individual_f1:.4f} > threshold {ENSEMBLE_THRESHOLD}")
    else:
        chosen_model = best_individual_model
        model_type = type(best_individual_model).__name__
        rationale = (f"{best_individual_name} selected (F1={best_individual_f1:.4f}) — "
                     f"ensemble (F1={ens_f1:.4f}) didn't beat threshold {ENSEMBLE_THRESHOLD}")
    print(f"\n[OK] {rationale}")

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
    final_pred = (final_proba >= best_threshold).astype(int)
    cm = confusion_matrix(y_test, final_pred).tolist()

    report = {
        'trained_at': datetime.now().isoformat(),
        'dataset_size': len(y_train) + len(y_test),
        'train_size': len(y_train),
        'test_size': len(y_test),
        'features': feature_cols,
        'model_type': model_type,
        'selection_rationale': rationale,
        'ensemble_weights': weights,
        'ensemble_weight_tuning': {
            'grid': SOFT_VOTE_WEIGHT_GRID,
            'best_weights': {'lr': weights[0], 'rf': weights[1]},
            'best_cv_f1_weighted': round(best_weight_f1, 4),
            'best_cv_accuracy': round(best_weight_acc, 4),
        },
        'lr_metrics': {'f1': round(lr_f1, 4), 'auc': round(lr_auc, 4), 'accuracy': round(lr_acc, 4), 'best_params': lr_grid.best_params_},
        'rf_metrics': {'f1': round(rf_f1, 4), 'auc': round(rf_auc, 4), 'accuracy': round(rf_acc, 4), 'best_params': rf_grid.best_params_},
        'ensemble_metrics': {'f1': round(ens_f1, 4), 'auc': round(ens_auc, 4), 'accuracy': round(ens_acc, 4)},
        'final_metrics': {
            'f1': round(f1_score(y_test, final_pred, average='weighted'), 4),
            'auc': round(roc_auc_score(y_test, final_proba), 4),
            'accuracy': round(accuracy_score(y_test, final_pred), 4),
        },
        'confusion_matrix': cm,
        'optimal_threshold': round(best_threshold, 4),
        'feature_importance': rf_importance.to_dict(orient='records'),
    }

    per_model_metrics = [
        {'model': 'Logistic Regression', 'f1_weighted': round(lr_f1, 4), 'auc': round(lr_auc, 4), 'accuracy': round(lr_acc, 4)},
        {'model': 'Random Forest', 'f1_weighted': round(rf_f1, 4), 'auc': round(rf_auc, 4), 'accuracy': round(rf_acc, 4)},
        {'model': 'Soft Voting Ensemble', 'f1_weighted': round(ens_f1, 4), 'auc': round(ens_auc, 4), 'accuracy': round(ens_acc, 4)},
    ]

    artifacts = {
        'y_test': y_test,
        'final_pred': final_pred,
        'final_proba': final_proba,
        'class_names': list(le.classes_),
        'per_model_metrics': per_model_metrics,
    }
    return chosen_model, scaler, report, artifacts


def save_artifacts(model, scaler, le, report, artifacts, feature_cols):
    """Save all model artifacts to disk."""
    joblib.dump(model, MODEL_DIR / "model.pkl")
    joblib.dump(scaler, MODEL_DIR / "scaler.pkl")
    joblib.dump(le, MODEL_DIR / "label_encoder.pkl")
    joblib.dump(feature_cols, MODEL_DIR / "feature_names.pkl")

    with open(MODEL_DIR / "training_report.json", 'w') as f:
        json.dump(report, f, indent=2, default=str)

    # Save richer evaluation outputs
    pd.DataFrame(artifacts['per_model_metrics']).to_csv(EVAL_DIR / "model_metrics.csv", index=False)

    y_true = artifacts['y_test']
    y_pred = artifacts['final_pred']
    y_proba = artifacts['final_proba']

    classification_dict = classification_report(
        y_true, y_pred, target_names=artifacts['class_names'], output_dict=True
    )
    with open(EVAL_DIR / "classification_report.json", "w") as f:
        json.dump(classification_dict, f, indent=2)

    confusion_df = pd.DataFrame(
        confusion_matrix(y_true, y_pred),
        index=[f"actual_{c}" for c in artifacts['class_names']],
        columns=[f"pred_{c}" for c in artifacts['class_names']],
    )
    confusion_df.to_csv(EVAL_DIR / "confusion_matrix.csv")

    pred_df = pd.DataFrame({
        "y_true": y_true,
        "y_pred": y_pred,
        "pred_proba_positive": y_proba,
    })
    pred_df.to_csv(EVAL_DIR / "test_predictions.csv", index=False)

    print(f"\n[OK] Artifacts saved to {MODEL_DIR}/")
    print(f"   model.pkl            ({report['model_type']})")
    print(f"   scaler.pkl           (StandardScaler)")
    print(f"   label_encoder.pkl    (LabelEncoder)")
    print(f"   feature_names.pkl    ({len(feature_cols)} features)")
    print(f"   training_report.json (full metrics)")
    print(f"   evaluation/model_metrics.csv")
    print(f"   evaluation/classification_report.json")
    print(f"   evaluation/confusion_matrix.csv")
    print(f"   evaluation/test_predictions.csv")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="Train employability model with LR + RF soft voting.")
    parser.add_argument("--dry-run", action="store_true", help="Preview data without training.")
    parser.add_argument(
        "--data-path",
        type=str,
        default=str(ML_DIR / "data" / "employability" / "combined_employability_v2.csv"),
        help="CSV path. Defaults to combined_employability_v2.csv.",
    )
    args = parser.parse_args()
    dry_run = args.dry_run

    print("=" * 60)
    print("EMPLOYABILITY MODEL TRAINING PIPELINE")
    print(f"Started: {datetime.now().isoformat()}")
    print("=" * 60)

    # 1. Load
    df = load_data(args.data_path)

    # 2. Preprocess
    X, y, le, class_dist, feature_cols = preprocess(df)

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
    model, scaler, report, artifacts = train_and_evaluate(X_train, X_test, y_train, y_test, le, feature_cols)

    # 5. Save
    save_artifacts(model, scaler, le, report, artifacts, feature_cols)

    print(f"\nCompleted: {datetime.now().isoformat()}")


if __name__ == "__main__":
    main()
