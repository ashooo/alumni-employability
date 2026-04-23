# Database Refactor History

This file is kept only as historical context for the earlier parallel-schema spike.

The active backend baseline is now:

- `server/prisma/schema.prisma`
- `server/prisma/migrations`
- `server/config/db.js`
- `server/scripts/syncLegacyCore.js`

Use `docs/schema-cutover-handoff.md` for the current handoff.
