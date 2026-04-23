# Database Refactor Plan

## Status

Proposed design. This document is the source of truth for the next database refactor.

## Why This Refactor Is Needed

The current database shape mixes three different concerns:

- stable alumni identity and admin records
- survey events and dynamic answers
- machine learning features, labels, predictions, and job-matching inputs

That makes it hard to support:

- branching survey paths
- follow-up surveys for unemployed alumni
- clean ML retraining data
- a richer competency catalog for job matching
- future Prisma-based migrations

## Project Flow

The intended user flow is:

1. Alumni logs in and answers the initial survey.
2. The first branch is based on employment status.
3. If the alumni is `employed`, collect employment outcome data and store it as usable ground truth.
4. If the alumni is `unemployed`, collect employability and job-matching inputs.
5. For unemployed alumni, schedule a follow-up after 2-3 months.
6. If the follow-up later says `employed`, branch them into the employed survey path.
7. Use the earlier pre-employment snapshot as model features and the later employment outcome as the label for retraining.

## Core Decisions

### 1. Separate identity, snapshot, and outcome

These must not live in the same conceptual record.

- `identity`: who the alumni is
- `snapshot`: what the alumni profile looked like at a point in time
- `outcome`: what later happened in the real world

This is the most important ML design rule in the system.

### 2. Keep academic and feature snapshots append-only

Do not make the snapshot table one-row-per-student.

Reason:

- retraining needs historical feature snapshots
- follow-up labels may arrive later
- a student can answer multiple surveys over time

Important rule:

- `student_id` must not be unique in the snapshot table
- use a separate stable alumni/profile table for identity

### 3. Replace the narrow `skill` concept with a broader competency catalog

The frontend and job-matching model need to retrieve and store more than just hard/soft skills.

Use one master catalog with a type/kind field:

- `skill`
- `knowledge`
- `ability`
- `interest`
- `technology`

This can still be called `skill` in SQL if needed, but conceptually it is a competency catalog.

### 4. Make survey submissions event-based

A survey should be modeled as a submission/event, not just a pile of answers.

Each submission should know:

- who submitted it
- which template it came from
- what branch/path it belongs to
- what earlier submission triggered it, if any
- what snapshot it is tied to

### 5. Treat employment outcome as a first-class entity

Do not rely only on generic survey JSON to represent employment labels.

You need explicit structured fields for:

- employment status
- employer/company
- position/job title
- degree relevance
- salary range
- outcome date

This improves reporting, analytics, and ML retraining quality.

### 6. Link follow-ups to the triggering survey submission

A follow-up should not only point to the student.

It should also point to the submission that caused the follow-up to exist.

Reason:

- better audit trail
- easier branching logic
- better provenance for retraining datasets

## Recommended Target Model

This is the recommended logical model. Table names can still be adjusted during implementation.

### Stable identity layer

- `user`
- `alumni_profile`

`alumni_profile` should hold stable alumni details such as:

- student id
- batch year
- degree/program reference
- contact status
- admin import state

If needed, `alumni_records` can remain temporarily during migration and later become `alumni_profile`.

### Snapshot layer

- `academic_snapshot`

This holds the feature inputs used by the employability model:

- degree
- gender
- age
- year graduated
- cgpa
- professional grade
- elective grade
- ojt grade
- leadership flag
- org membership flag

Rules:

- append-only
- many snapshots per alumni
- each snapshot belongs to one alumni identity

### Competency catalog layer

- `competency`

Suggested fields:

- `id`
- `name`
- `kind`
- `description`
- `source`
- `is_active`

Optional useful fields:

- `category`
- `industry_relevance`
- `is_trending`

### Survey definition layer

- `survey_template`
- `survey_question`
- `survey_option`
- `template_question`

Suggested additions:

- `path_key`
- `trigger_condition`
- `is_followup`
- `target_months`

This lets templates describe branch behavior instead of hard-coding everything in controllers.

### Survey event layer

- `survey_submission`
- `survey_answer`
- `submission_competency`

`survey_submission` should store:

- alumni/profile reference
- snapshot reference
- template reference
- parent submission reference
- trigger submission reference
- branch path
- submission status
- submitted at

`submission_competency` should store:

- submission reference
- competency reference
- selected flag
- score or rating
- rank or preference if needed

### Outcome layer

- `employment_outcome`

This should represent a real employment status update tied to a submission.

Suggested fields:

- alumni/profile reference
- submission reference
- outcome date
- employment status
- company
- position
- salary range
- degree relevance

### Follow-up layer

- `followup_schedule`

Suggested fields:

- alumni/profile reference
- trigger submission reference
- target template reference
- due date
- sent date
- completed date
- status

### ML layer

- `ml_prediction`
- `arima_forecast`

`ml_prediction` should be generic enough to support:

- employability prediction
- job matching results
- future model outputs

Suggested fields:

- `model_name`
- `model_version`
- `submission_id`
- `snapshot_id`
- `input_snapshot`
- `output_json`
- `confidence`
- `created_at`

`arima_forecast` can remain a separate table because it is aggregate/time-series oriented.

### Job matching catalog layer

- `occupation`
- `occupation_competency`

This is where O*NET-derived job data should live if it must be queryable by the frontend or admin tools.

Suggested occupation fields:

- title
- source code or SOC code
- description
- category/family

Suggested occupation competency fields:

- occupation id
- competency id
- weight
- source type

## Data Rules For ML

These rules are mandatory if the models are expected to stay trustworthy.

### Employability model

Feature inputs should come from pre-outcome data only:

- academic snapshot
- self-rated competencies at the time of the survey

Ground-truth labels should come from later employment outcomes:

- employed
- unemployed
- self-employed
- freelancer

Do not use post-employment fields as training features:

- company
- job title
- salary
- outcome-specific answers collected after employment

### Job-matching model

The frontend should retrieve competencies from the competency catalog and let users select or rate them.

The stored selections should come from:

- `submission_competency`

The job matcher should consume:

- selected competencies
- ratings or importance
- degree context if needed

### ARIMA / forecasting

ARIMA should consume stable outcome aggregates, not transient UI survey states.

Prefer using:

- finalized employment outcomes
- batch year or graduation year

Avoid depending on mixed legacy status fields that may drift.

## Frontend Usage

The frontend should not hard-code skill lists.

It should fetch competencies by kind from the API, for example:

- `kind=skill`
- `kind=knowledge`
- `kind=ability`
- `kind=interest`
- `kind=technology`

This supports:

- employability surveys
- job-matching selection UIs
- future admin management of competencies

## Branching Survey Rules

The minimum supported branching rules are:

### Initial survey

- asks employment status first or early
- if `employed`, continue to employed path
- if `unemployed`, continue to employability + job-matching path

### Unemployed path

- captures competency selections and ratings
- captures employability survey inputs
- optionally triggers job recommendations immediately
- creates follow-up schedule

### Employed path

- captures real employment outcome data
- may also capture degree relevance and satisfaction
- should be stored as structured outcome data

### Follow-up path

- checks whether employment status changed
- if status changed to employed, branch to employed path
- if still unemployed, optionally reschedule another follow-up depending on business rules

## Migration Strategy

This should be done in phases. Do not replace everything in one pass.

### Phase 1: Freeze the target design

- finalize the data model in documentation
- finalize naming
- decide which legacy tables stay temporarily

### Phase 2: Add new tables without deleting legacy tables

- add competency catalog
- add survey submission/event tables
- add follow-up trigger linkage
- add occupation tables if needed

### Phase 3: Start dual-write for new flows

- keep old reads running
- write new survey submissions into the new schema
- keep legacy outputs for compatibility during transition

### Phase 4: Backfill historical data

- migrate existing survey responses
- migrate skill ratings
- migrate employment records into structured outcomes

### Phase 5: Cut over reads

- move frontend reads to the new schema
- move ML retraining pipelines to the new tables
- replace old reporting queries

### Phase 6: Remove legacy tables only after validation

- remove old survey tables
- remove redundant alumni/employment structures if fully replaced

## What Not To Do

- Do not make the snapshot table one-row-per-student.
- Do not use only `hard` and `soft` categories if the product needs knowledge, abilities, interests, and technology.
- Do not treat survey JSON as the only storage for employment outcomes.
- Do not train the employability model on post-employment answers.
- Do not replace all legacy tables at once before feature parity is proven.

## Prisma Note

Prisma is still the right direction, but only after the domain model is finalized.

Recommended sequence:

1. finalize target schema and flow
2. implement the new schema in Prisma
3. generate migrations
4. dual-write and backfill
5. cut over routes and controllers

## Suggested First Implementation Tasks

When implementation starts, do these first:

1. Create the competency catalog model and API.
2. Introduce `survey_submission` and `submission_competency`.
3. Add a proper `employment_outcome` model.
4. Change follow-up scheduling to reference the triggering submission.
5. Only then refactor the employability and job-matching controllers to write into the new structure.

