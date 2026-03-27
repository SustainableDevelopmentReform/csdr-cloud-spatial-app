# Contributing

This repository is open to best-effort external contributions, but it is not staffed like a large community project. Expect review to focus on correctness, scope control, and maintainability.

## Before You Start

Set up the repository from the root:

```bash
pnpm install
cp .env.example.local .env
docker compose -f docker-compose-dev.yml up -d
pnpm migrate
pnpm seed
pnpm dev
```

See [docs/development-workflow.md](./docs/development-workflow.md) for the full setup and testing notes.

## Validation

Run the root validation contract before opening a PR:

```bash
pnpm validate
```

That command runs linting, typechecking, and unit/integration tests from the repo root.

Backend tests require Docker because the server suite uses Testcontainers. If you cannot run Docker locally, mention that in your PR and at least run:

```bash
pnpm lint
pnpm typecheck
```

## Scope Expectations

- Keep changes targeted.
- Reuse existing patterns where they are already established.
- Prefer root scripts over ad hoc per-package command sequences unless you are intentionally scoping work.
- Do not hide rough edges with vague docs; document real limitations when you find them.

## Support Expectations

- Reviews may take time.
- Small, focused patches are easier to review than broad refactors.
- Frontend consistency improvements are welcome, but broad architecture rewrites are not the current priority unless they unblock a specific bug or feature.
