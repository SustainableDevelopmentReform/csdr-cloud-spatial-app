# Architecture

This document explains the current repository layout and the main data flow for contributors.

## Platform Shape

The platform has two deployable apps and a small set of shared packages:

- `apps/web`: Next.js App Router frontend for the console and auth flows
- `apps/server`: Hono API server, Better Auth integration, Drizzle schema/migrations, and backend integration tests
- `packages/schemas`: shared Zod schemas and API/data contracts
- `packages/plot`: shared plot helpers used by the reporting UI
- `packages/ui`: shared React UI components and editor/chart building blocks

The frontend and backend are coupled through shared TypeScript and Zod contracts:

- the frontend imports API route types from `@repo/server/app`
- both apps share resource schemas from `@repo/schemas`
- shared UI and charting primitives live in `@repo/ui` and `@repo/plot`

## Core Domain Model

The current domain model centers on datasets, geometries, products, and reporting outputs.

- `dataset`: a source dataset that can be processed
- `geometries`: a collection of spatial boundaries
- `product`: a join between one dataset and one geometry collection
- `dataset_run`, `geometries_run`, `product_run`: concrete processing runs
- `geometry_output`: the geometry features produced by a geometries run
- `product_output`: the computed indicator values tied to geometry outputs
- `report` and `dashboard`: presentation-layer resources built on product outputs; published reports additionally carry immutable publish metadata plus a stored PDF artifact key

The older internal model notes are still useful references:

- [docs/MODEL.md](./MODEL.md)
- [docs/REQUIREMENTS.md](./REQUIREMENTS.md)
- [docs/requirements/access-control.md](./requirements/access-control.md)
- [docs/requirements/report-publishing.md](./requirements/report-publishing.md)

## Request Flow

Typical read/write flow:

1. A Next.js route renders a console page in `apps/web/app`.
2. The page calls a hook from the relevant feature folder, for example `apps/web/app/console/product/_hooks.tsx`.
3. The hook uses the Hono client created in `apps/web/utils/apiClient.ts`.
4. The API request hits the Hono app in `apps/server/src/app.ts`.
5. Route handlers validate input, apply auth and rate-limiting middleware, and read/write through Drizzle.
6. Responses are shaped with shared schemas and returned to the frontend.

Special case: report publish flow

1. The report publish route loads the saved report record and checks mutability.
2. The server renders the read-only print route in a browser runtime.
3. A PDF is generated from that print route and uploaded to S3-compatible storage.
4. Only after upload succeeds does the server persist the report's publish metadata.

## Backend Structure

Important backend areas:

- `apps/server/src/app.ts`: Hono app composition, middleware, auth mounting, OpenAPI docs
- `apps/server/src/routes/`: resource routes for datasets, geometries, products, outputs, dashboards, and reports
- `apps/server/src/lib/`: auth, email, response helpers, OpenAPI helpers, report PDF rendering/storage, and other shared server logic
- `apps/server/src/schemas/`: Drizzle schema definitions and database custom types
- `apps/server/drizzle/`: SQL migrations
- `apps/server/src/routes/__tests__/`: integration tests backed by Testcontainers

Technology choices in the backend today:

- Hono for the API
- Better Auth for auth/session flows
- Drizzle ORM with PostgreSQL/PostGIS
- Vitest plus Testcontainers for backend integration tests

## Frontend Structure

Important frontend areas:

- `apps/web/app/`: App Router pages and feature folders
- `apps/web/components/`: shared app-specific components
- `apps/web/hooks/`: generic frontend hooks
- `apps/web/utils/`: API client, auth client, URL helpers

Technology choices in the frontend today:

- Next.js App Router
- TanStack Query for data fetching and mutations
- React Hook Form plus Zod resolvers for forms
- MapLibre for spatial rendering

## Local Infrastructure

Local development uses `docker-compose-dev.yml` to start:

- PostGIS on port `5431`
- Mailpit on ports `8025` and `1025`
- SeaweedFS on ports `8333`, `8888`, and `9333` for S3-compatible report PDF storage in dev

The web app defaults to `http://localhost:3000` and the server defaults to `http://localhost:4000`.

## Current Boundaries

This repository is not fully normalized around one architectural style yet.

- Backend patterns are more consistent than frontend patterns.
- Shared contracts in `packages/schemas` are in better shape than some runtime UI code.
- Frontend tests are still missing, so contributor changes should be validated with manual smoke testing in the highest-risk flows.
