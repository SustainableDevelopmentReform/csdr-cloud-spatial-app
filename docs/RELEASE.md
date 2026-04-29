# Release Process

This repository owns application source, tests, Docker image construction,
and release metadata. Environment promotion and runtime deployment state belong
in the separate operations repository.

## Versioning

Releases use SemVer Git tags:

```bash
vMAJOR.MINOR.PATCH
```

Pre-release and build metadata are allowed when needed, for example
`v1.2.3-rc.1`.

Every published image must be immutable. The publish workflow tags images with:

- the release tag, for example `v1.2.3`
- the commit tag, for example `sha-abc123def456`

The workflow intentionally does not publish `latest`.

## Creating A Release

1. Make sure `main` is green.
2. Confirm database migrations are forward-compatible with the currently
   deployed version.
3. Create and push a SemVer tag:

   ```bash
   git tag v1.2.3
   git push origin v1.2.3
   ```

4. GitHub Actions publishes the image.
5. Record the image digest from the publish workflow for the operations repo.

## Release Metadata

The Docker image carries OCI labels and runtime environment variables:

- `APP_VERSION`
- `APP_COMMIT`
- `APP_BUILD_TIME`
- `APP_IMAGE`

The API exposes the same metadata at `/api/v0/version`.

## Rollback Rules

- Rollback means deploying a previous immutable image digest from the operations
  repo.
- Migrations must be forward-compatible across at least one release so an older
  app image can run while a rollback is prepared.
- Destructive migrations require a documented multi-release plan.
- Seed data is not part of production release execution.
