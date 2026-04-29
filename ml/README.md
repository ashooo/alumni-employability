# ML Folder Structure

This folder is split into two responsibilities:

- `scripts/`: deployment runtime scripts only (used by API/server at inference time)
- `training/`: offline and one-time scripts (data prep, labeling, retraining, index building, validation)

## Deployment Runtime (`scripts`)

- `scripts/predict_api.py` - ARIMA forecast runtime script
- `scripts/predict_employability.py` - employability ensemble voting classifier runtime script
- `scripts/job-matching/job-matcher.py` - job matching runtime matcher using prebuilt artifacts

## Offline / Training (`training`)

- `training/arima/test_model.py` - offline ARIMA validation script
- `training/employability/employability.py` - main DB-driven retraining pipeline for the ensemble model
- `training/employability/db_utils.py` - database connectivity helpers for training
- `training/job-matcher/merge_dataset.py` - O*NET preprocessing
- `training/job-matcher/index_builder.py` - FAISS/ONNX asset builder
- `training/job-matcher/job_matcher.py` - prototype/training matcher
- `training/job-matcher/jobert.py` - raw JobBERT embedding/index experimentation
- `training/notebooks/` - Jupyter notebooks for experimentation (ARIMA, etc.)

## Artifacts

- `models/` stores trained model artifacts used by runtime scripts.
- `data/` stores raw and processed datasets used by training scripts.

## Job Matcher ONNX Rebuild

When using ONNX at runtime, always rebuild index + metadata using the ONNX-first builder so embedding dimensions and vector space stay aligned.

Run from repo root:

1. `python ml/training/job-matcher/merge_dataset.py`
2. `python ml/training/job-matcher/index_builder.py`

This regenerates:

- `ml/models/onet_embeddings.faiss`
- `ml/models/occupation_metadata.json`
- `ml/models/job_matcher_config.json`
- `ml/models/jobbert_v2_onnx/`
