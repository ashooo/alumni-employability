import pandas as pd
import joblib
import warnings
from sklearn.metrics import mean_absolute_error, mean_squared_error
import numpy as np
import os

warnings.filterwarnings("ignore")

def test_arima_model():
    data_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'plp_dataset_500.csv')
    df = pd.read_csv(data_path)
    
    # Process the dataset to get actual employment rates
    df_emp = df[['Year Graduated', 'Employability']].dropna()
    df_emp['Year Graduated'] = pd.to_numeric(df_emp['Year Graduated'], errors='coerce')
    df_emp = df_emp.dropna()
    
    emp_stats = df_emp.groupby('Year Graduated')['Employability'].value_counts().unstack().fillna(0)
    
    if 'Employable' not in emp_stats.columns:
         emp_stats['Employable'] = 0
    if 'Not Employable' not in emp_stats.columns:
         emp_stats['Not Employable'] = 0
         
    emp_stats['Total'] = emp_stats['Employable'] + emp_stats['Not Employable']
    emp_stats['employment_rate'] = (emp_stats['Employable'] / emp_stats['Total']) * 100
    
    actual_rates = emp_stats['employment_rate']
    print(f"---- Actual Data from plp_dataset_500.csv ----")
    print(actual_rates.round(2))
    print("\n")
    
    model_path = os.path.join(os.path.dirname(__file__), 'arima_employment_model.pkl')
    try:
        model_fit = joblib.load(model_path)
    except Exception as e:
        print(f"Error loading model: {e}")
        return
    
    # Test on Historical Data (In-sample evaluation)
    try:
        start_year = int(actual_rates.index.min())
        end_year = int(actual_rates.index.max())
        predictions_hist = model_fit.get_prediction()
        pred_hist_df = predictions_hist.summary_frame()
        
        print("---- Model Evaluation on Dataset Years ----")
        eval_df = pd.DataFrame({'Actual': actual_rates})
        
        pred_index = pred_hist_df.index
        if hasattr(pred_index, 'year'):
            pred_hist_df.index = pred_index.year
            
        eval_df = eval_df.join(pred_hist_df['mean'].rename('Predicted'), how='inner')
        
        if not eval_df.empty:
            print(eval_df.round(2))
            
            mae = mean_absolute_error(eval_df['Actual'], eval_df['Predicted'])
            rmse = np.sqrt(mean_squared_error(eval_df['Actual'], eval_df['Predicted']))
            print(f"\nEvaluation Metrics:")
            print(f"Mean Absolute Error (MAE): {mae:.2f}%")
            print(f"Root Mean Squared Error (RMSE): {rmse:.2f}%")
        else:
            print("Could not align dataset years with model prediction years.")
            print(f"Model prediction years: {list(pred_hist_df.index)[:5]}...")
            
    except Exception as e:
         print(f"Error evaluating historical predictions: {e}")
         

         
    # Predict 3-year employment rate
    print("\n---- 3-Year Future Forecast ----")
    try:
        forecast_steps = 3
        forecast = model_fit.get_forecast(steps=forecast_steps)
        forecast_df = forecast.summary_frame()
        
        if hasattr(forecast_df.index, 'year'):
            forecast_df.index = forecast_df.index.year
            
        forecast_output = forecast_df[['mean', 'mean_ci_lower', 'mean_ci_upper']].copy()
        forecast_output.columns = ['Predicted Rate (%)', 'Lower CI (95%)', 'Upper CI (95%)']
        print(forecast_output.round(2))
        
    except Exception as e:
        print(f"Error predicting future rate: {e}")

if __name__ == "__main__":
    test_arima_model()
