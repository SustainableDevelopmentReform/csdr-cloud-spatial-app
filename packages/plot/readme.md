# `@repo/plot`

Shared charting schemas, definitions, renderers, and plotting helpers for
reports and dashboards.

Chart development should stay inside this package. A chart definition owns its
schema, icon component, suggested title function, data requirements, selection
model, appearance controls, preview config, and renderer. Host apps should only
load the data requested by the definition and render it.

Use the family helpers for new charts:

- `definePlotChart`
- `defineTableChart`
- `defineMapChart`
- `defineKpiChart`

Use `defineChart` only for unusual charts that do not fit an existing family.
Persisted chart JSON must remain backward compatible. See
[docs/chart-development.md](../../docs/chart-development.md) for the full
authoring guide and option reference.
