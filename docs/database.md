# Database Discipline

## Migration Policy

- Migrations are forward-only.
- Every schema change must be represented by a committed Drizzle migration.
- Production seed data is not applied automatically.
- Sample seed data is only for local/dev bootstrap.
- Destructive changes require a multi-release rollout:
  1. add compatible schema,
  2. deploy app code that no longer depends on old fields,
  3. remove old schema in a later release.

## Verification

CI runs the backend migration test suite, including:

- applying all migrations to a fresh schema,
- upgrading from the previous migration state to the latest migration,
- validating legacy access-control bootstrap behavior.

Run locally with:

```bash
pnpm --filter @repo/server exec vitest run src/__tests__/migrations.integration.test.ts
```

## Production Execution Contract

Deployment automation should run the bundled migration command before rolling
out an app image:

```bash
cd /app/backend/migrate
node index.js
```

Before production migrations, operators should confirm database backup/PITR
coverage and record the app version plus latest migration tag being applied.
