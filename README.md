# Spatial Data Framework

This repository contains the Spatial Data Framework platform: a web console and API for managing spatial datasets, geometries, derived products, dashboards, and reports.

The codebase started as a fork of [Omnigate](https://github.com/azharalifauzi/omnigate) and has since been substantially rewritten for the Spatial Data Framework domain.

## What It Does

The platform is built around a spatial reporting workflow:

- `dataset` records source data that can be processed
- `geometries` records spatial boundaries that outputs can be mapped onto
- `product` combines a dataset with a geometry collection
- `*_run` resources capture concrete processing runs
- `geometry_output` and `product_output` store the shapes and computed values that drive reports and dashboards
- `report` supports rich-text authoring, irreversible publishing, live provenance sources, and downloadable PDFs

Contributor-facing architecture notes live in [docs/architecture.md](./docs/architecture.md).

## Monorepo Layout

```text
apps/
  web/       Next.js App Router frontend
  server/    Hono API, Better Auth, Drizzle/PostGIS, integration tests
packages/
  schemas/   Shared Zod schemas and domain contracts
  plot/      Shared charting helpers
  ui/        Shared React UI components
  eslint-config/
  typescript-config/
docs/
  architecture.md
  development-workflow.md
  DEPLOYMENT.md
```

## Local Setup

### Prerequisites

- Node.js 20.17+
- pnpm 9.12.0
- Docker with Compose support

### From Clone To Running App

```bash
git clone https://github.com/SustainableDevelopmentReform/csdr-cloud-spatial-app.git
cd csdr-cloud-spatial-app
pnpm install
cp .env.example.local .env
docker compose -f docker-compose-dev.yml up -d
pnpm migrate
pnpm seed
pnpm dev
```

Local services:

- Web app: `http://localhost:3000`
- API server: `http://localhost:4000`
- Mailpit UI: `http://localhost:8025`
- PostGIS: `localhost:5431`
- SeaweedFS S3 API: `http://localhost:8333`
- SeaweedFS Filer UI: `http://localhost:8888`
- SeaweedFS Master UI: `http://localhost:9333`

SeaweedFS provides the local S3-compatible storage used for published report PDFs. The dev compose file also bootstraps the `sdf-dev-exports` bucket automatically.

The example environment file already contains sensible local defaults, including Mailpit SMTP settings, SeaweedFS S3 settings, and the seed user:

- email: `admin@example.com`
- password: `admin@123`

If you change the initial user settings, update `INITIAL_USER_EMAIL`, `INITIAL_USER_NAME`, and `INITIAL_USER_PASSWORD` in `.env` before running `pnpm seed`.

Report publishing also requires a Chromium-compatible browser runtime. If Chromium is not on the default runtime path, set `PDF_BROWSER_EXECUTABLE_PATH` in `.env`.

## Common Commands

Use the root scripts unless you are intentionally working on one package only.

```bash
pnpm dev
pnpm run ci
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm turbo lint typecheck test:unit
pnpm build
pnpm migrate
pnpm seed
```

`pnpm run ci` is the full repository validation contract. `pnpm turbo lint typecheck test:unit` remains the core contributor contract for linting, typechecking, and tests.

Focused package commands are still available when needed:

```bash
pnpm --filter web dev
pnpm --filter @repo/server dev
pnpm --filter @repo/server test:unit
```

Backend tests require Docker because the server suite uses Testcontainers. See [docs/development-workflow.md](./docs/development-workflow.md) for the full validation and testing notes.

## Docs

- [docs/architecture.md](./docs/architecture.md)
- [docs/development-workflow.md](./docs/development-workflow.md)
- [docs/RELEASE.md](./docs/RELEASE.md)
- [docs/RUNTIME.md](./docs/RUNTIME.md)
- [docs/DATABASE.md](./docs/DATABASE.md)
- [docs/requirements/report-publishing.md](./docs/requirements/report-publishing.md)
- [docs/requirements/access-control.md](./docs/requirements/access-control.md)
- [docs/requirements/charting.md](./docs/requirements/charting.md)
- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [SECURITY.md](./SECURITY.md)
- [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)

## License and Attribution

This repository is licensed under Apache-2.0 (see [LICENSE](./LICENSE)).

Because this project originated as a fork of Omnigate, the `LICENSE` file also
retains the original MIT attribution notice for any upstream-derived portions.
The current codebase has diverged significantly and is now primarily
Spatial Data Framework-specific.

## Known Rough Edges

- The frontend is still inconsistent in places. Expect a mix of older patterns and newer cleanup work.
- There is no frontend test suite yet. Validation coverage is currently strongest in the shared schemas package and the backend integration tests.
- This is a best-effort public cleanup pass, not a full open-source program launch. Some internal assumptions and rough edges are documented rather than fully removed.

## Database And Auth Utilities

Root commands for common backend maintenance:

```bash
pnpm create:migration
pnpm migrate
pnpm drizzle-studio
pnpm seed
```

The Better Auth schema is generated inside `apps/server`. If you need to regenerate it manually, run the command documented in [docs/development-workflow.md](./docs/development-workflow.md) and follow it with a migration.
