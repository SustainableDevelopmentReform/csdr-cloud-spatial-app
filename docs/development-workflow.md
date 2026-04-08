# Development Workflow

This document is the contributor-facing setup and validation guide for the current repository.

## First-Time Setup

```bash
pnpm install
cp .env.example.local .env
docker compose -f docker-compose-dev.yml up -d
pnpm migrate
pnpm seed
pnpm dev
```

What each step does:

- `pnpm install`: installs all workspace dependencies
- `cp .env.example.local .env`: creates the local runtime config used by both apps
- `docker compose -f docker-compose-dev.yml up -d`: starts PostGIS, Mailpit, and SeaweedFS
- `pnpm migrate`: applies Drizzle migrations to the local database
- `pnpm seed`: inserts the initial organization, admin user, and sample spatial resources
- `pnpm dev`: starts the workspace development processes

## Root Command Contract

Use the root scripts by default.

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm turbo lint typecheck test:unit
```

`pnpm turbo lint typecheck test:unit` is the canonical validation command. It runs:

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test:unit`

CI uses the same validation contract.

## When To Use Package Commands

Use package-scoped commands when you want to work on one slice of the repo without running the whole workspace.

Examples:

```bash
pnpm --filter web dev
pnpm --filter web lint
pnpm --filter @repo/server dev
pnpm --filter @repo/server test:unit
pnpm --filter @repo/schemas test:unit
```

Use the root commands again before opening a PR.

## Backend Test Prerequisites

Backend tests are integration tests, not pure unit tests.

- `apps/server` uses Testcontainers
- Docker must be installed and the Docker daemon must be running
- the test suite creates isolated PostgreSQL containers instead of using your dev database

If Docker is unavailable locally, you can still run:

```bash
pnpm lint
pnpm typecheck
```

But the full contributor contract remains `pnpm turbo lint typecheck test:unit` in a container-enabled environment.

## Database Workflow

Common database commands:

```bash
pnpm create:migration
pnpm migrate
pnpm seed
pnpm drizzle-studio
```

Notes:

- migrations live in `apps/server/drizzle`
- the seed script is intended for local/dev bootstrap
- the example local environment expects PostGIS on `localhost:5431`

## Better Auth Schema Updates

If Better Auth changes require a regenerated schema, run the CLI from `apps/server` and follow it with a migration:

```bash
cd apps/server
npx auth@latest generate --output src/schemas/auth.ts --config src/lib/auth.ts
```

Then return to the repo root and create/apply a migration.

## Manual Smoke Testing

There is no frontend test suite yet, so manual checks still matter. After frontend-affecting changes, smoke-test:

- sign-in and auth-protected navigation
- dashboard and report entry points
- dataset, geometries, and product detail pages
- at least one map rendering path

## Known Rough Edges

- The frontend is still inconsistent in some feature folders.
- Some large UI files remain large on purpose for now; this cleanup pass is not trying to fully refactor them.
- Documentation now aims to be honest about these limits instead of pretending the repo is already fully polished.
