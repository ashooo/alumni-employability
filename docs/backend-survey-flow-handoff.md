# Backend Survey Flow Handoff

## Branch

- `feat/backend-survey-flow-status`

## Purpose

This backend change prepares the survey/model flow for integration by making the server the source of truth for:

- whether an alumni still needs to take the survey
- which survey path should come next
- whether the unemployed employability path is already complete
- whether the employed path is still pending implementation

## Route Updates

### Alumni survey routes

- `GET /api/alumni/survey/status/:studentId`
- `GET /api/alumni/survey/flow/:studentId`

These now return a richer survey-flow payload instead of only a simple completed/pending flag.

- `POST /api/alumni/survey/submit/:studentId`

This route is now protected by `authenticateToken`.

### Admin prediction compatibility

- `GET /api/admin/predictions/arima`

This route now exists as a backend alias for the current admin frontend.

### Admin survey namespace cleanup

The compatibility routes mounted under `/api/admin/survey` for `college/:collegeId` and `submit/:studentId` are now protected so the admin namespace is not publicly writable.

## Login Payload Update

`POST /api/auth/login` now includes a `survey` object in the response.

For alumni users, this contains the backend-computed flow status using the pre-login `last_login` value, so `isFirstLogin` is reliable at login time.

## Survey Status Shape

The new survey status payload includes:

- `isFirstLogin`
- `shouldPromptSurvey`
- `completed`
- `requiresSurvey`
- `status`
- `hasInitialSurvey`
- `hasEmployabilityAssessment`
- `hasEmployabilityPrediction`
- `employmentStatus`
- `resolvedPath`
- `nextPath`
- `nextStep`
- `collegeId`, `programId`
- `routeHints`
- `readiness`
- `competencyCatalog`
- `submissions`
- `pendingFollowup`

## Current Path Rules

- No employment-gateway answer yet:
  - `nextPath = INITIAL`
- Employment answer is `UNEMPLOYED`:
  - requires the employability path
  - `nextPath = UNEMPLOYED` until the assessment/prediction is complete
- Employment answer is `EMPLOYED`, `SELF_EMPLOYED`, or `FREELANCER`:
  - `nextPath = EMPLOYED`
  - backend marks this as pending implementation for now

## Initial Survey Definition

The default survey definition now puts the employment decision first and returns extra metadata:

- `template_key`
- `kind`
- `path_key`
- `branching.decision_question_key`

The decision question is still `current_employment_status`.

## Important Note About Existing Frontend Behavior

The current alumni frontend still submits the unemployed flow through `/api/prediction/employability/submit` and bundles the initial survey answers there as `additionalAnswers`.

To stay compatible with that behavior, the backend status logic recognizes the employment-gateway answer even when it was stored inside the unemployed employability submission rather than in a standalone `INITIAL` submission.

## What Is Still Not Implemented

- employed-path survey questions and submit flow
- admin survey builder save/publish/version/category/question actions
- competency create/update/delete management endpoints
- frontend wiring to consume the new survey status contract
