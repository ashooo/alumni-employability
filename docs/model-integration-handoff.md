# Model Integration Handoff

## Branch

- `feat/backend-survey-flow-status`

## Latest Committed Base

- `931af88` - `feat: wire frontend survey flow status`
- `e88a1e1` - `feat: add backend survey flow status contract`

## What Landed In This Working Tree

### 1. Competency catalog seed support

Added a seed script for the combined ML competency CSV:

- `server/scripts/seedCompetencyCompilation.js`
- `npm run seed:competencies` from `server/`

Source file used:

- `ml/data/competency_compilation.csv`

Verified post-seed totals in the refactor DB:

- `SOFT_SKILL`: `26`
- `HARD_SKILL`: `26`
- `KNOWLEDGE`: `33`
- `ABILITY`: `52`
- `INTEREST`: `9`
- `TECHNOLOGY`: `8785`

Notes:

- the CSV import script is idempotent via `createMany(..., skipDuplicates: true)`
- the database already had some overlapping skill records, which is why the inserted counts during seed were lower than the raw CSV unique-skill totals

### 2. Backend job-matching integration

The backend now has a real job-matching path wired end to end.

Added files:

- [ml/scripts/predict_job_matching.py](/D:/proj/alumni-merging/alumni-employability/ml/scripts/predict_job_matching.py:1)
- [server/services/jobMatchingDataService.js](/D:/proj/alumni-merging/alumni-employability/server/services/jobMatchingDataService.js:1)
- [server/controllers/jobMatchingController.js](/D:/proj/alumni-merging/alumni-employability/server/controllers/jobMatchingController.js:1)
- [server/routes/prediction/jobMatchingRoutes.js](/D:/proj/alumni-merging/alumni-employability/server/routes/prediction/jobMatchingRoutes.js:1)

Updated:

- [server/routes/prediction/index.js](/D:/proj/alumni-merging/alumni-employability/server/routes/prediction/index.js:1)
- [server/services/surveyDataService.js](/D:/proj/alumni-merging/alumni-employability/server/services/surveyDataService.js:1)

New backend endpoints:

- `POST /api/prediction/job-matching/test`
- `POST /api/prediction/job-matching/generate/:studentId`
- `GET /api/prediction/job-matching/latest/:studentId`

What they do:

- `test` runs the matcher with manual skills and does not require saved survey data
- `generate` uses the latest alumni profile plus either:
  - manual `candidateSkills`, or
  - the latest saved submission competencies if manual skills are not provided
- `latest` returns the most recent persisted `JOB_MATCHING` prediction

Storage behavior:

- results are stored in `ml_prediction`
- `prediction_type = JOB_MATCHING`
- the response payload from the ONNX matcher is kept in `output_json`

### 3. Survey status metadata now exposes job-matching readiness

`GET /api/alumni/survey/status/:studentId` now includes backend hints for job matching, including:

- `hasJobMatchingPrediction`
- `routeHints.jobMatchingGenerate`
- `routeHints.latestJobMatching`
- `readiness.jobMatching`
- `readiness.jobMatchingEligible`

This is enough for the frontend to start consuming job-matching without inventing extra route knowledge.

## Verification Done

### Static verification

Passed:

- `node --check server/controllers/jobMatchingController.js`
- `node --check server/services/jobMatchingDataService.js`
- `node --check server/services/surveyDataService.js`
- `node --check server/routes/prediction/jobMatchingRoutes.js`
- `node --check server/routes/prediction/index.js`

### Runtime verification

Verified with the project ML environment:

1. direct Python wrapper smoke test through `ml/scripts/predict_job_matching.py`
2. Node service smoke test through `server/services/jobMatchingDataService.js`

Sample manual skills used:

- `Python`
- `JavaScript`
- `Database Management`
- `Critical Thinking`

Observed sample top match:

- `Database Architects`

## Current Backend Reality

### What is ready now

- competency catalog seeding is available
- job matching has backend routes, controller, service, and runtime wrapper
- job matching can run without the `Occupation` DB tables being populated because it uses the existing FAISS/ONNX artifacts directly
- job-matching predictions can already be persisted in `ml_prediction`

### What is not done yet

- the frontend does not call the new job-matching endpoints yet
- the unemployed survey still does not collect the broader profile fields for:
  - `KNOWLEDGE`
  - `ABILITY`
  - `INTEREST`
  - `TECHNOLOGY`
- `occupation` and `occupation_competency` tables are still empty

That means:

- the backend model integration is ready
- the user experience for job matching is not surfaced yet
- match quality is currently limited by the competencies we already capture in survey submissions

## Recommended Next Step

The next step should be:

**Wire the frontend to the new job-matching backend endpoints.**

Concretely:

1. after employability assessment is complete, allow the alumni to trigger job matching
2. fetch existing matches from `GET /api/prediction/job-matching/latest/:studentId`
3. show the top recommended occupations and the matched/missing competencies
4. avoid auto-triggering until UX is decided; start with an explicit button on dashboard or results view

Why this next:

- the backend route is now ready
- we can validate the full product flow without waiting for occupation-table import work
- it gives a visible result from the new integration quickly

## Follow-Up Plan After That

### Phase 1. Frontend job-matching consumption

Suggested targets:

- `client/src/pages/alumni/AlumniDashboard.tsx`
- employability result view or alumni survey completion state

Goal:

- let alumni generate and view job matches from the newly added backend route

### Phase 2. Expand the survey competency capture

Add DB-backed inputs for:

- `KNOWLEDGE`
- `ABILITY`
- `INTEREST`
- `TECHNOLOGY`

Goal:

- improve candidate profile richness before generating job matches

### Phase 3. Optional occupation DB sync

If admin/reporting/search features need DB-level occupation data:

1. import occupation metadata into `occupation`
2. map occupation competencies into `occupation_competency`
3. use that for analytics, admin inspection, or hybrid explainability later

This is useful, but it is no longer the first blocker for model integration.

## Summary

The project has now moved from:

- survey-path readiness

to:

- actual model-feature rollout

The backend side of job matching is now integrated. The next best move is to surface it in the frontend, then enrich the survey inputs so the recommendations get better.
