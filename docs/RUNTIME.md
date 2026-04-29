# Runtime Contract

This document defines the application contract that deployment automation can
rely on. It deliberately avoids environment-specific deployment details.

## Required Configuration

Minimum runtime variables:

```bash
APP_URL=https://example.org
AUTH_BASE_URL=https://example.org
TRUSTED_ORIGINS=https://example.org
BETTER_AUTH_SECRET=

DATABASE_HOST=
DATABASE_PORT=5432
DATABASE_USER=
DATABASE_PASSWORD=
DATABASE_NAME=
DATABASE_SSL_MODE=verify-full

S3_BUCKET_NAME=
AWS_REGION=
AUTH_EMAIL_MODE=smtp
SMTP_HOST=
SMTP_PORT=
EMAIL_SENDER=
```

Use either discrete database variables or `DATABASE_URL`. In production,
`DATABASE_SSL_MODE` defaults to `verify-full`; use `DATABASE_SSL_CA_CERT` when
the database certificate chain is not trusted by the base image.

Report publishing additionally requires S3-compatible object storage and a
Chromium-compatible browser runtime. The Docker image sets
`PDF_BROWSER_EXECUTABLE_PATH` for the bundled Chromium runtime.

## Build Metadata

The runtime accepts:

- `APP_VERSION`
- `APP_COMMIT`
- `APP_BUILD_TIME`
- `APP_IMAGE`

These values are surfaced by `/api/v0/healthcheck` and `/api/v0/version`.

## Health Interfaces

- `GET /api/v0/healthcheck`: process liveness. Does not validate dependencies.
- `GET /api/v0/readiness`: dependency readiness. Fails if the database cannot be
  reached.
- `GET /api/v0/version`: build metadata and applied migration count.

## Logging

Server logs are structured JSON written to stdout/stderr. Request logs include:

- timestamp
- level
- request ID
- method and path
- status code
- duration

Incoming `x-request-id` is preserved; otherwise the server generates one and
returns it on the response.

## Shutdown

The API process handles `SIGTERM` and `SIGINT`, stops accepting new work, and
exits after in-flight requests close. The single-container Docker image uses a
small Node supervisor to forward shutdown signals to both the web and API
processes.

## Persistent Dependencies

The app expects:

- PostgreSQL/PostGIS for relational and spatial data
- S3-compatible object storage for published report PDFs
- SMTP for production auth email flows
- external basemap/style assets when `MAP_STYLE_URL` points outside the app
