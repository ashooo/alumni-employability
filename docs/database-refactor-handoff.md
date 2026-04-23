# Database Refactor Handoff

## Purpose

This handoff package sets up a parallel `v2` schema for database refactoring without touching the current runtime schema.

Use this when continuing the database refactor in another chat.

## Files Added

- `server/prisma/schema.refactor.prisma`
- `server/.env.refactor.example`
- `db/create-refactor-test-db.sql`
- `docs/database-refactor-plan.md`

## What This Gives You

- a clean target Prisma schema for the future refactor
- a separate test database URL convention
- a non-destructive way to experiment on this branch
- a documented domain model for survey branching and ML storage

## Important Principle

The current app is **not** wired to `schema.refactor.prisma` yet.

This schema is a target state for the next implementation phase. The current controllers, routes, and queries still use the legacy schema and the current `server/prisma/schema.prisma`.

## How To Use The Test Database

### 1. Create the database

Use the bootstrap SQL:

```sql
SOURCE db/create-refactor-test-db.sql;
```

Or run the contents manually in MySQL.

### 2. Configure the refactor connection string

Copy the example and provide your own credentials if needed:

```bash
server/.env.refactor.example
```

The important variable is:

```bash
DATABASE_URL_REFACTOR="mysql://root:@localhost:3307/alumni_tracer_refactor"
```

Prisma uses `DATABASE_URL_REFACTOR` from `server/prisma/schema.refactor.prisma`.

### 3. Validate the target schema

Run from `server/`:

```bash
npm run prisma:refactor:validate
```

If PowerShell blocks `npm.ps1`, use:

```bash
npm.cmd run prisma:refactor:validate
```

### 4. Format the target schema

Run from `server/`:

```bash
npm run prisma:refactor:format
```

Windows fallback:

```bash
npm.cmd run prisma:refactor:format
```

### 5. Push the target schema into the test DB

Run from `server/`:

```bash
npm run prisma:refactor:push
```

Windows fallback:

```bash
npm.cmd run prisma:refactor:push
```

This will apply the `v2` schema to the separate test database only.

Note:

- Prisma may download its schema engine the first time these commands run.
- If validation fails in an offline environment, retry on a machine with normal internet access.

## What The New Schema Models

### Stable identity

- `user`
- `alumni_profile`

### Time-based ML feature snapshots

- `academic_snapshot`

### Frontend-retrievable competency catalog

- `competency`

Kinds supported:

- `SOFT_SKILL`
- `HARD_SKILL`
- `KNOWLEDGE`
- `ABILITY`
- `INTEREST`
- `TECHNOLOGY`

### Branch-aware survey structure

- `survey_template`
- `survey_question`
- `survey_option`
- `template_question`
- `survey_submission`
- `survey_answer`
- `submission_competency`

### Employment outcomes and follow-ups

- `employment_outcome`
- `followup_schedule`

### ML + job matching

- `ml_prediction`
- `arima_forecast`
- `occupation`
- `occupation_competency`

## Why This Schema Is Safer Than Refactoring In Place

- the current production-like schema remains untouched
- the next chat can focus on controller/routing changes without redesigning the tables again
- snapshots stay append-only, which protects the retraining design
- follow-ups are tied to the triggering submission, which supports your branching survey flow

## Important Differences From The Current Schema

- `academic_snapshot` is append-only and does not force one row per student
- `competency` replaces the too-narrow `skill` concept
- `survey_submission` is the event record for branching survey flows
- `employment_outcome` is structured ground truth, not only JSON answers
- `ml_prediction` is generic enough for employability and job-matching outputs

## What Is Not Done Yet

- no controllers have been rewritten to use the v2 schema
- no legacy routes have been migrated
- no backfill/migration scripts have been written
- no dual-write logic exists yet
- the current frontend still reads the old survey and skill endpoints

## Recommended Next Chat Prompt

Use something close to this:

> Continue from `docs/database-refactor-plan.md` and `docs/database-refactor-handoff.md`.
> Use `server/prisma/schema.refactor.prisma` as the target schema.
> Start implementing the backend refactor in phases:
> 1. add competency catalog endpoints
> 2. add survey submission + submission competency writes
> 3. add employment outcome writes
> 4. keep legacy reads working while introducing dual-write

## Safety Note

If the next chat needs to undo this work, it can simply stop using:

- `DATABASE_URL_REFACTOR`
- `server/prisma/schema.refactor.prisma`

The current app schema and controllers remain available.
