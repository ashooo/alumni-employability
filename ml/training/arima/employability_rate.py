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
    
    hist_predictions = []
    for idx, val in predicted.items():
        hist_predictions.append({
            'year': int(idx.year),
            'predicted': round(val, 2)
        })
    
    # Exclude the first year (burn-in period) from accuracy metrics
    if len(actual) > 1:
        eval_actual = actual.iloc[1:]
        eval_predicted = predicted.iloc[1:]
    else:
        eval_actual = actual
        eval_predicted = predicted
        
    mae = mean_absolute_error(eval_actual, eval_predicted)
    rmse = np.sqrt(mean_squared_error(eval_actual, eval_predicted))
    
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
        
    return mae, rmse, forecast_results, hist_predictions, actual, predicted

def generate_insights(actual_series, predicted_series, mae, rmse, forecast_results):
    """Generates dynamic text insights based on model performance and trend data."""
    # Behavior Insights
    behavior_insight = "The model balances its predictions well, with no significant bias towards over-predicting or under-predicting."
    over_predicts = 0
    under_predicts = 0
    total_predictions = 0
    
    # Exclude burn-in year (first year)
    if len(predicted_series) > 1:
        for idx in predicted_series.index[1:]:
            if idx in actual_series.index:
                diff = predicted_series[idx] - actual_series[idx]
                if diff > 0.5: over_predicts += 1
                elif diff < -0.5: under_predicts += 1
                total_predictions += 1
                
        if total_predictions > 0:
            if over_predicts > under_predicts and over_predicts > total_predictions / 2:
                behavior_insight = "The model shows a tendency to slightly over-predict employment rates compared to actual outcomes. It might be overly optimistic."
            elif under_predicts > over_predicts and under_predicts > total_predictions / 2:
                behavior_insight = "The model shows a tendency to slightly under-predict employment rates. It leans towards being conservative."

    # Error Insights
    if mae < 4.9:
        error_takeaway = f"With a low MAE of {mae:.2f}, the model performs exceptionally well. It tracks the actual employment trends very closely with minimal deviation."
    elif mae <= 9.99:
        error_takeaway = f"The model performs adequately, with a moderate average error of {mae:.2f}%. It captures general trends but may miss sudden spikes or drops."
    else:
        error_takeaway = f"The model struggles with accuracy, showing a high average error of {mae:.2f}%. It performs poorly possibly due to high variance or lack of stable historical patterns."

    if (rmse - mae) > 2:
        rmse_takeaway = f"The RMSE ({rmse:.2f}) is notably higher than the MAE, indicating that while average errors are acceptable, the model occasionally makes large mispredictions (likely during volatile years)."
    else:
        rmse_takeaway = f"The RMSE ({rmse:.2f}) is close to the MAE, meaning the model's errors are consistent and it rarely makes extreme miscalculations."

    verdict = "High Accuracy"
    verdict_color = "text-green-500"
    
    if mae > 9.99:
        verdict = "Low Accuracy"
        verdict_color = "text-red-500"
    elif mae >= 4.9:
        verdict = "Moderate Accuracy"
        verdict_color = "text-yellow-500"

    # Trend Insights
    hist_values = actual_series.values
    avg_rate = sum(hist_values) / len(hist_values) if len(hist_values) > 0 else 0
    std_dev = np.std(hist_values) if len(hist_values) > 1 else 0
    stability = "highly consistent" if std_dev < 2 else "relatively stable" if std_dev < 5 else "showing significant fluctuations"
    
    trend_direction = "Stable"
    growth_explanation = f"The employment rate has been {stability} with an average of {avg_rate:.1f}% and is projected to maintain this stability."
    
    if len(forecast_results) > 0 and len(hist_values) > 0:
        last_actual = hist_values[-1]
        f_start = forecast_results[0]['forecast']
        f_end = forecast_results[-1]['forecast']
        f_end_year = forecast_results[-1]['year']
        
        overall_diff = f_end - last_actual
        forecast_internal_diff = f_end - f_start
        threshold = 0.2
        
        if overall_diff > threshold or forecast_internal_diff > threshold:
            trend_direction = "Upward"
            action = "grow"
            growth_explanation = f"Following a {stability} historical period, the employment rate shows upward momentum and is projected to {action} to approximately {f_end:.1f}% by {f_end_year}."
        elif overall_diff < -threshold or forecast_internal_diff < -threshold:
            trend_direction = "Downward"
            action = "decline"
            growth_explanation = f"The model detects a {action} in employment rates, with the forecast projecting a trend towards {f_end:.1f}% by {f_end_year}, continuing the recent patterns."
        else:
            trend_direction = "Stable"
            growth_explanation = f"The employment rate is projected to remain {stability} around {f_end:.1f}%, showing no significant upward or downward shifts in the near future."

    biggest_change_text = "The historical data remains too consistent to identify major shifts."
    all_points = [{"year": int(idx.year), "value": val} for idx, val in actual_series.items()] + [{"year": r['year'], "value": r['forecast']} for r in forecast_results]
    all_points_sorted = sorted(all_points, key=lambda x: x["year"])
    
    if len(all_points_sorted) >= 2:
        max_diff = 0
        change_info = None
        for i in range(1, len(all_points_sorted)):
            prev = all_points_sorted[i-1]
            curr = all_points_sorted[i]
            diff = curr["value"] - prev["value"]
            if abs(diff) > abs(max_diff):
                max_diff = diff
                change_info = (prev["year"], curr["year"], "surge" if diff > 2 else "increase" if diff > 0 else "drop" if diff < -2 else "decrease")
        if change_info and abs(max_diff) > 0.1:
            biggest_change_text = f"The most notable shift was a {abs(max_diff):.1f}% {change_info[2]} observed between {change_info[0]} and {change_info[1]}."

    recent_trend_text = "Insufficient historical data to establish a recent trend pattern."
    if len(actual_series) >= 2:
        recent = actual_series[-3:] if len(actual_series) >= 3 else actual_series
        start_val = recent.iloc[0]
        start_year = recent.index[0].year
        end_val = recent.iloc[-1]
        end_year = recent.index[-1].year
        diff = end_val - start_val
        if abs(diff) < 0.5:
            recent_trend_text = f"In the recent period ({start_year}-{end_year}), the employment rate has plateaued, holding steady at approximately {end_val:.1f}%."
        else:
            direction = "upward momentum" if diff > 0 else "downward slide"
            recent_trend_text = f"The data shows a clear {direction} in the most recent years ({start_year}-{end_year}), moving from {start_val:.1f}% to {end_val:.1f}%."

    return {
        "behavior": behavior_insight,
        "error_takeaway": error_takeaway,
        "rmse_takeaway": rmse_takeaway,
        "verdict": verdict,
        "verdict_color": verdict_color,
        "trend_direction": trend_direction,
        "growth_explanation": growth_explanation,
        "biggest_change_text": biggest_change_text,
        "recent_trend_text": recent_trend_text
    }

def save_artifacts(model_fit, order, mae, rmse, forecast_results, dataset_size, hist_predictions, insights):
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
        'forecast': forecast_results,
        'historical_predictions': hist_predictions,
        'insights': insights
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
    mae, rmse, forecast_results, hist_predictions, actual_series, predicted_series = evaluate_and_forecast(final_model, ts_data['employment_rate'], forecast_steps=3)
    
    # 4.5 Generate Insights
    insights = generate_insights(actual_series, predicted_series, mae, rmse, forecast_results)
    
    # 5. Save Artifacts
    save_artifacts(final_model, best_order, mae, rmse, forecast_results, len(ts_data), hist_predictions, insights)

    print(f"\nCompleted: {datetime.now().isoformat()}")


if __name__ == "__main__":
    main()
