"""
Employment Rate ARIMA Forecasting Model - Training Pipeline
======================================================
Trains an ARIMA model on historical alumni data retrieved from the database
(combined with synthetic historical data for model stability). 
Dynamically finds the best order (p,d,q) based on lowest AIC.

Usage:
    python employability_rate.py              # Train from database
    python employability_rate.py --dry-run    # Preview data without training

Outputs saved to ml/models/arima/:
    model.pkl               - The selected ARIMA model
    training_report.json    - Full training metrics, forecast, and order selection rationale
"""

import sys
import json
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime
import joblib
import itertools
import warnings

from statsmodels.tsa.stattools import adfuller
from statsmodels.tsa.arima.model import ARIMA
from sklearn.metrics import mean_absolute_error, mean_squared_error

# Ignore statsmodels warnings for grid search
warnings.filterwarnings("ignore")

# ---------------------------------------------------------------------------
# Paths & Imports
# ---------------------------------------------------------------------------
ML_DIR = Path(__file__).resolve().parent.parent.parent  # ml/
MODEL_DIR = ML_DIR / "models" / "arima"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

# Add employability dir to path to import db_utils
EMPLOYABILITY_DIR = ML_DIR / "training" / "employability"
sys.path.append(str(EMPLOYABILITY_DIR))

# ---------------------------------------------------------------------------
# Pipeline Logic
# ---------------------------------------------------------------------------

def load_data():
    """Fetch training data from the database via db_utils."""
    try:
        from db_utils import get_training_data
    except ImportError as e:
        print(f"[!] Could not import db_utils. Ensure it exists in ml/training/employability/. Error: {e}")
        sys.exit(1)
        
    df = get_training_data()
    print(f"Loaded {len(df)} raw records from database.")
    return df

def preprocess(df):
    """
    Cleans data, groups by year to calculate employment rate, 
    and appends synthetic historical data (2000-2017) to stabilize the ARIMA model.
    """
    # Create binary target
    df['is_employable'] = df['Employability'].map({'Employable': 1, 'Not Employable': 0})
    
    # Group by Year
    yearly_stats = df.groupby('Year Graduated').agg(
        total_students=('is_employable', 'count'),
        employed_count=('is_employable', 'sum')
    )
    
    # Calculate Rate
    yearly_stats['employment_rate'] = (yearly_stats['employed_count'] / yearly_stats['total_students']) * 100
    ts_data = yearly_stats[['employment_rate']].copy()
    ts_data.index = pd.to_datetime(ts_data.index, format='%Y')
    
    # Generate Synthetic Data (2000 - 2017)
    years_synth = np.arange(2000, 2018)
    np.random.seed(42) # For consistent results
    base_rate = 55 
    growth = np.linspace(0, 15, len(years_synth))
    noise = np.random.normal(0, 0.5, len(years_synth)) # Reduced random fluctuation
    synth_values = base_rate + growth + noise

    df_synth = pd.DataFrame({
        'Year Graduated': pd.to_datetime(years_synth, format='%Y'),
        'employment_rate': synth_values
    }).set_index('Year Graduated')

    # Combine synthetic + real data.
    # Real data should take precedence when overlapping years exist, so we keep
    # the last row per year (df_synth is concatenated first, real data second).
    full_ts_data = pd.concat([df_synth, ts_data[['employment_rate']]])
    full_ts_data = full_ts_data[~full_ts_data.index.duplicated(keep='last')]
    full_ts_data = full_ts_data.sort_index()
    full_ts_data = full_ts_data.asfreq('YS') # Ensure annual frequency
    
    # Smooth the data to reduce noise and improve ARIMA fit
    full_ts_data['employment_rate'] = full_ts_data['employment_rate'].rolling(window=3, min_periods=1).mean()
    
    print(f"Combined Dataset (2000 - {ts_data.index.max().year}): {len(full_ts_data)} years total.")
    return full_ts_data

def find_best_arima(ts_series):
    """Grid search to find the best (p,d,q) order based on AIC."""
    print("\n" + "=" * 60)
    print("DYNAMIC ARIMA HYPERPARAMETER TUNING")
    print("=" * 60)
    
    p = range(0, 5) # Autoregressive terms up to 4
    d = range(0, 3) # Differencing up to 2
    q = range(0, 5) # Moving Average terms up to 4
    # Test permutations of p, d, q
    pdq_full = list(itertools.product(p, d, q))
    
    best_aic = float("inf")
    best_order = None
    best_model = None
    
    print("Evaluating ARIMA orders...")
    for param in pdq_full:
        try:
            temp_model = ARIMA(ts_series, order=param)
            results = temp_model.fit()
            if results.aic < best_aic:
                best_aic = results.aic
                best_order = param
                best_model = results
        except Exception:
            continue
            
    print(f"[OK] Best ARIMA Order based on AIC: {best_order} (AIC: {best_aic:.2f})")
    return best_order, best_model

def evaluate_and_forecast(model_fit, ts_series, forecast_steps=3):
    """
    Evaluates in-sample accuracy and forecasts the future.
    """
    print("\n" + "=" * 60)
    print("EVALUATION & FORECASTING")
    print("=" * 60)
    
    # 1. In-sample prediction (Accuracy check)
    predictions_hist = model_fit.get_prediction(start=ts_series.index[0], dynamic=False)
    pred_hist_df = predictions_hist.summary_frame()
    
    actual = ts_series
    predicted = pred_hist_df['mean']
    
    mae = mean_absolute_error(actual, predicted)
    rmse = np.sqrt(mean_squared_error(actual, predicted))
    
    print(f"In-Sample Accuracy:")
    print(f"  Mean Absolute Error: {mae:.2f}%")
    print(f"  Root Mean Squared Error: {rmse:.2f}%")
    
    # 2. Out-of-sample Forecast
    forecast_future = model_fit.get_forecast(steps=forecast_steps)
    forecast_df = forecast_future.summary_frame()
    
    print(f"\nOut-of-Sample Forecast ({forecast_steps} years):")
    forecast_results = []
    for idx, row in forecast_df.iterrows():
        year = idx.year
        mean_val = round(row['mean'], 2)
        ci_lower = round(row['mean_ci_lower'], 2)
        ci_upper = round(row['mean_ci_upper'], 2)
        print(f"  {year}: {mean_val}% (95% CI: {ci_lower}% - {ci_upper}%)")
        forecast_results.append({
            'year': year,
            'forecast': mean_val,
            'ci_lower': ci_lower,
            'ci_upper': ci_upper
        })
        
    return mae, rmse, forecast_results

def save_artifacts(model_fit, order, mae, rmse, forecast_results, dataset_size):
    """Saves the model and report to disk."""
    joblib.dump(model_fit, MODEL_DIR / "model.pkl")
    
    report = {
        'trained_at': datetime.now().isoformat(),
        'dataset_years': dataset_size,
        'model_type': 'ARIMA',
        'best_order': order,
        'metrics': {
            'mae': round(mae, 4),
            'rmse': round(rmse, 4),
            'aic': round(model_fit.aic, 4)
        },
        'forecast': forecast_results
    }
    
    with open(MODEL_DIR / "training_report.json", 'w') as f:
        json.dump(report, f, indent=2, default=str)
        
    print(f"\n[OK] Artifacts saved to {MODEL_DIR}/")
    print(f"   model.pkl            (ARIMA Model)")
    print(f"   training_report.json (Metrics & Forecast)")

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    dry_run = '--dry-run' in sys.argv

    print("=" * 60)
    print("EMPLOYMENT RATE FORECASTING PIPELINE (ARIMA)")
    print(f"Started: {datetime.now().isoformat()}")
    print("=" * 60)

    # 1. Load Data
    df = load_data()

    # 2. Preprocess & Combine Data
    ts_data = preprocess(df)
    
    if dry_run:
        print("\n--- DRY RUN: Data preview ---")
        print(ts_data.head())
        print("...")
        print(ts_data.tail())
        print(f"\nShape: {ts_data.shape}")
        return
        
    # 3. Dynamic ARIMA Hyperparameter Tuning
    best_order, final_model = find_best_arima(ts_data['employment_rate'])
    
    # 4. Evaluate & Forecast
    mae, rmse, forecast_results = evaluate_and_forecast(final_model, ts_data['employment_rate'], forecast_steps=3)
    
    # 5. Save Artifacts
    save_artifacts(final_model, best_order, mae, rmse, forecast_results, len(ts_data))

    print(f"\nCompleted: {datetime.now().isoformat()}")


if __name__ == "__main__":
    main()
