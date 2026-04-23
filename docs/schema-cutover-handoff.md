# Schema Cutover Handoff

## Current Baseline

The backend runtime is cut over to the canonical Prisma schema:

- `server/prisma/schema.prisma`
- `server/prisma/migrations/20260423000000_init_refactor_schema/migration.sql`
- `server/config/db.js`

The old Prisma schema and legacy migration tree were removed in this cleanup so contributors only see one active schema and one active migration history.

The branch for this work is:

- `feat/refactor-database`

The branch still uses `DATABASE_URL_REFACTOR` from `server/.env.refactor` as the live app database URL on this refactor line.

## Runtime Coverage

These controllers already use the current Prisma schema:

- `server/controllers/employabilityController.js`
- `server/controllers/predictionCatalogController.js`
- `server/controllers/predictionController.js`
- `server/controllers/alumniController.js`
- `server/controllers/surveyController.js`
- `server/controllers/programController.js`
- `server/controllers/authController.js`
- `server/controllers/adminController.js`
- `server/controllers/collegeController.js`
- `server/controllers/notificationController.js`
- `server/controllers/superAdminController.js`

These services back that work:

- `server/services/employabilityDataService.js`
- `server/services/surveyDataService.js`

There are no remaining runtime controllers or routes depending on the retired legacy Prisma schema.

## Canonical Commands

Run these from `server/`:

```powershell
npm.cmd run prisma:generate
npm.cmd run prisma:validate
npm.cmd run prisma:push
```

If you need to sync baseline records from the legacy database into the current schema, use:

```powershell
npm.cmd run legacy:sync-core
```

That sync utility now reads the legacy database through raw SQL via `DATABASE_URL` and writes into the current Prisma schema via `DATABASE_URL_REFACTOR`, so it still works even though the old Prisma schema was deleted.

## Schema Notes

The canonical schema includes runtime support for:

- `user.phone`
- `user.address`
- `import_history`
- `import_errors`
- `notifications`
- `user_notifications`
- `audit_logs`
- `system_settings`

Placeholder alumni activation support remains part of the current baseline:

- `check-student` treats placeholder alumni users as activatable records
- `register` upgrades the placeholder row into a real account
- `login` blocks placeholder accounts until activation is complete
- `legacy:sync-core` is responsible for creating placeholder users for import-only alumni

## Validation Status

After canonicalizing the schema paths, these commands succeeded from `server/`:

- `npm.cmd run prisma:generate`
- `npm.cmd run prisma:validate`
- `npm.cmd run prisma:push`
- `npm.cmd run legacy:sync-core`

Latest sync result after the cleanup:

- `colleges: 7`
- `programs: 19`
- `users: 4`
- `competencies: 20`
- `alumni_profiles_synced: 633`
- `placeholder_users_created: 0`

If you pull this branch onto a fresh machine, rerun those commands before app QA.

## Remaining Risk

The main remaining risk is behavioral verification, not schema wiring.

Manual checks still worth running:

1. Activate an alumni account that only exists through imported alumni data.
2. Log in with that newly activated user.
3. Log in with an existing migrated user.
4. Verify alumni profile, survey, submissions, and results flows.
5. Verify superadmin admin-management, settings persistence, and audit-log screens.
6. Verify notification create/read flows.

## Forgot-Password Port

The forgot-password feature has now been ported from the legacy branch:

- source branch: `origin/feat/forgotPassword`

See `docs/forgot-password-port-handoff.md` for the feature-level mapping and the Prisma-specific adaptations made during the port.

## Recommended Next Prompt

Use this:

> Continue from `docs/schema-cutover-handoff.md` and `docs/forgot-password-port-handoff.md`.
> The backend now uses `server/prisma/schema.prisma` as the only Prisma schema.
> Focus on manual QA for forgot-password, activation/login, notifications, and superadmin/admin flows.
> If regressions appear, patch the current Prisma-based controllers directly instead of reintroducing legacy DB patterns.
