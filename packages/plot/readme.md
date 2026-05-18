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

Charts can opt into generic change-over-time rendering with
`timeChange: supportsTimeChangeTransform(...)` when a delta from the previous
time point makes sense for that visual. The shared helpers apply step-over-step
`delta` and `percentDelta` transforms before rendering, while omitted
`transform` config continues to render raw saved values. Single-time views such
as maps and KPIs should load all time points for the selected series, filter
back to the selected target time point after transforming, and disable the first
time point in the form because it has no previous value.
