# Web App

`apps/web` is the Next.js App Router frontend for the CSDR Cloud Spatial platform.

Use the root workspace commands for normal development:

```bash
pnpm dev
pnpm lint
pnpm typecheck
```

Use package-scoped commands only when you are intentionally working on the frontend in isolation:

```bash
pnpm --filter web dev
pnpm --filter web lint
pnpm --filter web typecheck
```

Known rough edge: the frontend still has inconsistent patterns and no dedicated automated test suite yet. The current cleanup work is focused on correctness and consistency, not a full architecture rewrite.
