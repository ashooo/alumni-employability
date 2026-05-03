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
