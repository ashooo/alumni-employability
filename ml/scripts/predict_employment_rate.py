import sys
import json
import pandas as pd
import joblib
import warnings
from sklearn.metrics import mean_absolute_error, mean_squared_error
import numpy as np
import os

warnings.filterwarnings("ignore")

def main():
    try:
        # Read JSON from stdin
        input_data = sys.stdin.read()
        if not input_data:
            print(json.dumps({"error": "No input data provided"}))
            sys.exit(1)

        historical_records = json.loads(input_data)
        
        # Load into DataFrame
        df = pd.DataFrame(historical_records)
        
        if df.empty or 'year' not in df.columns or 'employment_rate' not in df.columns:
            print(json.dumps({"error": "Invalid data format"}))
            sys.exit(1)
            
        df['year'] = pd.to_numeric(df['year'], errors='coerce')
        df = df.dropna(subset=['year'])
        df = df.sort_values('year')
        
        actual_rates = df.set_index('year')['employment_rate']
        
        # Load model
        model_path = os.path.join(os.path.dirname(__file__), '..', 'models', 'arima', 'model.pkl')
        try:
            model_fit = joblib.load(model_path)
        except Exception as e:
            print(json.dumps({"error": f"Error loading model: {str(e)}"}))
            sys.exit(1)
            
        response = {
            "historical": [],
            "forecast": [],
            "metrics": {}
        }
        
        # Calculate metrics using in-sample prediction if possible
        eval_df = pd.DataFrame()
        pred_hist_df = pd.DataFrame()
        # The first year is the ARIMA burn-in year — exclude it from metrics and
        # from predicted/bound output to avoid misleading users.
        first_year = int(actual_rates.index.min())
        try:
            predictions_hist = model_fit.get_prediction()
            pred_hist_df = predictions_hist.summary_frame()
            
            # Align evaluated actual data and predictions 
            eval_df_temp = pd.DataFrame({'Actual': actual_rates})
            pred_index = pred_hist_df.index
            if hasattr(pred_index, 'year'):
                pred_hist_df.index = pred_index.year
                
            eval_df = eval_df_temp.join(
                pred_hist_df[['mean', 'mean_ci_lower', 'mean_ci_upper']].rename(
                    columns={'mean': 'Predicted', 'mean_ci_lower': 'Lower', 'mean_ci_upper': 'Upper'}
                ),
                how='inner'
            )
            
            # Exclude the burn-in (first) year from metric calculation for a truer score
            eval_df_excl = eval_df[eval_df.index != first_year]

            if not eval_df_excl.empty:
                mae = mean_absolute_error(eval_df_excl['Actual'], eval_df_excl['Predicted'])
                rmse = np.sqrt(mean_squared_error(eval_df_excl['Actual'], eval_df_excl['Predicted']))
                response["metrics"]["mae"] = round(float(mae), 2)
                response["metrics"]["rmse"] = round(float(rmse), 2)
            else:
                response["metrics"]["mae"] = 0
                response["metrics"]["rmse"] = 0
                
        except Exception as e:
             # Default fallback if alignment fails
             response["metrics"]["mae"] = 0
             response["metrics"]["rmse"] = 0

        # Add historical data points.
        # Predicted rate, upper, and lower bounds are skipped for the first (burn-in)
        # year so the chart does not show the misleading initialization gap.
        for year, rate in actual_rates.items():
            item = {
                "year": int(year),
                "value": round(float(rate), 2)
            }
            if int(year) != first_year and not eval_df.empty and year in eval_df.index:
                row = eval_df.loc[year]
                if not pd.isna(row['Predicted']):
                    item["predicted"] = round(float(row['Predicted']), 2)
                if not pd.isna(row['Lower']):
                    item["lower"] = round(float(row['Lower']), 2)
                if not pd.isna(row['Upper']):
                    item["upper"] = round(float(row['Upper']), 2)
            response["historical"].append(item)

        # Generate Insights from Backend
        mae = response["metrics"].get("mae", 0)
        rmse = response["metrics"].get("rmse", 0)
        
        # Behavior Insights
        behavior_insight = "The model balances its predictions well, with no significant bias towards over-predicting or under-predicting."
        over_predicts = 0
        under_predicts = 0
        total_predictions = 0
        
        if not eval_df_excl.empty:
            for _, row in eval_df_excl.iterrows():
                diff = row['Predicted'] - row['Actual']
                if diff > 0.5: over_predicts += 1
                elif diff < -0.5: under_predicts += 1
                total_predictions += 1
            
            if total_predictions > 0:
                if over_predicts > under_predicts and over_predicts > total_predictions / 2:
                    behavior_insight = "The model shows a tendency to slightly over-predict employment rates compared to actual outcomes. It might be overly optimistic."
                elif under_predicts > over_predicts and under_predicts > total_predictions / 2:
                    behavior_insight = "The model shows a tendency to slightly under-predict employment rates. It leans towards being conservative."

        # Error Insights
        error_takeaway = ""
        if mae < 4.9:
            error_takeaway = f"With a low MAE of {mae:.2f}, the model performs exceptionally well. It tracks the actual employment trends very closely with minimal deviation."
        elif mae <= 9.99:
            error_takeaway = f"The model performs adequately, with a moderate average error of {mae:.2f}%. It captures general trends but may miss sudden spikes or drops."
        else:
            error_takeaway = f"The model struggles with accuracy, showing a high average error of {mae:.2f}%. It performs poorly possibly due to high variance or lack of stable historical patterns."

        rmse_takeaway = ""
        if (rmse - mae) > 2:
            rmse_takeaway = f"The RMSE ({rmse:.2f}) is notably higher than the MAE, indicating that while average errors are acceptable, the model occasionally makes large mispredictions (likely during volatile years)."
        else:
            rmse_takeaway = f"The RMSE ({rmse:.2f}) is close to the MAE, meaning the model's errors are consistent and it rarely makes extreme miscalculations."

        # Verdict based on user thresholds: <4.9 High, >9.99 Moderate? 
        # Re-interpreting for logic: <4.9 High, 4.9-9.99 Moderate, >9.99 Low
        verdict = "High Accuracy"
        verdict_color = "text-green-500"
        
        if mae > 9.99:
            verdict = "Low Accuracy"
            verdict_color = "text-red-500"
        elif mae >= 4.9:
            verdict = "Moderate Accuracy"
            verdict_color = "text-yellow-500"

        # Additional Trend Insights for Analytics Dashboard
        all_points = response["historical"] + response["forecast"]
        all_points_sorted = sorted(all_points, key=lambda x: x["year"])
        
        # Forecast Direction
        trend_direction = "Stable"
        growth_explanation = "The employment rate is projected to remain relatively stable."
        if response["forecast"]:
            f_start = response["forecast"][0]
            f_end = response["forecast"][-1]
            diff = f_end["value"] - f_start["value"]
            if abs(diff) > 0.5:
                trend_direction = "Upward" if diff > 0.5 else "Downward"
                action = "increase" if diff > 0.5 else "decrease"
                growth_explanation = f"The employment rate is projected to {action} by {abs(diff):.1f}% from {f_start['year']} to {f_end['year']}."

        # Biggest Change
        biggest_change_text = "Not enough data to calculate significant changes."
        if len(all_points_sorted) >= 2:
            max_diff = 0
            change_info = None
            for i in range(1, len(all_points_sorted)):
                prev = all_points_sorted[i-1]
                curr = all_points_sorted[i]
                diff = curr.get("value", 0) - prev.get("value", 0)
                if abs(diff) > abs(max_diff):
                    max_diff = diff
                    change_info = (prev["year"], curr["year"], "increase" if diff > 0 else "decrease")
            if change_info:
                biggest_change_text = f"A {abs(max_diff):.1f}% {change_info[2]} between {change_info[0]} and {change_info[1]}."

        # Recent Trend
        recent_trend_text = "Not enough historical data to determine a recent trend."
        hist_sorted = sorted(response["historical"], key=lambda x: x["year"])
        if len(hist_sorted) >= 2:
            recent = hist_sorted[-3:]
            start = recent[0]
            end = recent[-1]
            diff = end["value"] - start["value"]
            direction = "increased" if diff > 0 else "decreased" if diff < 0 else "remained stable"
            recent_trend_text = f"In the most recent recorded years ({start['year']}-{end['year']}), the employment rate {direction} from {start['value']:.1f}% to {end['value']:.1f}%."

        response["insights"] = {
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

        # Predict future 3 years
        try:
            forecast_steps = 3
            forecast = model_fit.get_forecast(steps=forecast_steps)
            forecast_df = forecast.summary_frame()
            
            if hasattr(forecast_df.index, 'year'):
                forecast_df.index = forecast_df.index.year
            
            cur_year = int(actual_rates.index.max())
            i = 1
            for idx, row in forecast_df.iterrows():
                response["forecast"].append({
                    "year": int(idx) if not pd.isna(idx) and str(idx).isdigit() and int(idx) > cur_year else cur_year + i,
                    "value": round(float(row['mean']), 2),
                    "lower": round(float(row['mean_ci_lower']), 2),
                    "upper": round(float(row['mean_ci_upper']), 2)
                })
                i += 1
                
        except Exception as e:
            print(json.dumps({"error": f"Error forecasting: {str(e)}"}))
            sys.exit(1)

        print(json.dumps(response))

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
