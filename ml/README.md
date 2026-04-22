# ML Folder Structure

This folder is split into two responsibilities:

- `scripts/`: deployment runtime scripts only (used by API/server at inference time)
- `training/`: offline and one-time scripts (data prep, labeling, retraining, index building, validation)

## Deployment Runtime (`scripts`)

- `scripts/predict_api.py` - ARIMA forecast runtime script
- `scripts/predict_employability.py` - employability model prediction runtime script
- `scripts/job-matching/job-matcher.py` - job matching runtime matcher using prebuilt artifacts

## Offline / Training (`training`)

- `training/arima/test_model.py` - offline ARIMA validation script
- `training/employability/employability.py` - train employability model artifacts
- `training/employability/retrain_pipeline.py` - DB-driven retraining pipeline
- `training/employability/label_dataset.py` - one-time labeling script
- `training/employability/merge_dataset.py` - one-time student dataset merge
- `training/job-matcher/merge_dataset.py` - one-time O*NET preprocessing
- `training/job-matcher/index_builder.py` - one-time FAISS/ONNX asset builder
- `training/job-matcher/job_matcher.py` - prototype/training matcher
- `training/job-matcher/jobert.py` - raw JobBERT embedding/index experimentation

## Artifacts

- `models/` stores trained model artifacts used by runtime scripts.
- `data/` stores raw and processed datasets used by training scripts.
