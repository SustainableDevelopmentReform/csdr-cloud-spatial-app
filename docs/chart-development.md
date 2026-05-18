# Chart Development

This guide explains how to add charts to `@repo/plot` without changing the
persisted chart JSON contract or adding chart-specific branches to `apps/web`.

## Quick Start: Standard Plot

Most new charts should start from `packages/plot/src/chart-template.tsx`, then
move the copied files into `packages/plot/src/chart-definitions/`.

A normal product-output plot has two files:

- `my-chart.schema.ts`: pure, server-safe persisted schema contract.
- `my-chart.tsx`: client renderer and chart definition.

Example schema:

```ts
import {
  createPlotConfigurationSchema,
  type PlotSchemaContract,
} from './schema-helpers'

export const myChartSubType = 'my-chart'

export const myChartPlotSchemaContract = {
  subType: myChartSubType,
  chartLabel: 'My chart',
  validationMode: 'cartesian',
} satisfies PlotSchemaContract<typeof myChartSubType>

export const myChartConfigurationSchema = createPlotConfigurationSchema(
  myChartPlotSchemaContract,
)
```

Example definition:

```tsx
'use client'

import { TrendingUp } from 'lucide-react'
import { suggestPlotChartTitle } from '../chart-title'
import {
  createCartesianPlotSelection,
  createPlotDataRequirements,
  createPlotPreviewConfig,
  createStandardPlotRenderer,
} from './definition-helpers'
import { definePlotChart, tuple } from './core'
import { myChartConfigurationSchema, myChartSubType } from './my-chart.schema'

export const myChartDefinition = definePlotChart({
  key: myChartSubType,
  type: 'plot',
  subType: myChartSubType,
  label: 'My Chart',
  description: 'Short picker description',
  icon: TrendingUp,
  schema: myChartConfigurationSchema,
  getSuggestedTitle: suggestPlotChartTitle,
  getDataRequirements: createPlotDataRequirements(),
  renderer: { render: createStandardPlotRenderer() },
  selection: createCartesianPlotSelection(tuple('indicators', 'geometries')),
  appearanceControls: tuple('categoricalPalette', 'legend', 'formatting'),
  buildPreviewConfig: createPlotPreviewConfig(myChartSubType),
})
```

Then add the schema contract to `packages/plot/src/chart-schemas.ts` and the
definition to `packages/plot/src/chart-definitions.tsx`. Those central files are
composition-only manifests: they can import and list chart-owned exports, but
must not contain chart-specific rules.

## Definition Options

`key`: Stable definition key. For plot charts, this must equal the persisted
`subType`.

`type`: Persisted chart family: `plot`, `map`, `table`, or `kpi`.

`subType`: Plot-only persisted discriminator. Do not set this for map, table,
or KPI definitions.

`label` and `description`: Picker copy only. These do not affect saved JSON.

`icon`: A React icon component, usually from `lucide-react`. Do not use a string
and do not add an app-side icon map.

`schema`: Strict Zod parser for the saved JSON shape. This is the compatibility
boundary. If changing it would reject existing saved charts or alter parsed
output, do not make the change without a migration plan.

`getSuggestedTitle(context)`: Function used by the generic form to auto-fill the
chart title. Prefer existing helpers from `chart-title.ts`: `suggestPlotChartTitle`,
`suggestMapChartTitle`, `suggestTableChartTitle`, and
`suggestProductChartTitle`.

`getTypeOptionState(context)`: Optional picker guidance. Return a disabled state
with a reason for product-dependent warnings such as charts that work best with
multiple time points. Use `needsMultipleTimePoints` for that common case.

`getDataRequirements(chart)`: Declares everything the host app must load before
rendering: `productRunId`, `productOutputQuery`, optional `indicatorId`, and
loading/unavailable copy. Web owns the hooks; the chart owns the requirements.

`renderer.render(context)`: React renderer. It receives parsed chart config,
loaded product outputs, optional product run/indicator data, appearance, select
callback, render options, and host adapters.

`selection`: Generic form model. Prefer helpers:

- `createCartesianPlotSelection(...)` for line/area/bar/scatter time-series
  plots.
- `createSingleDimensionPlotSelection(...)` for donut and ranked-bar charts.
- `createTableSelection()` for tables.
- `createMapSelection()` for maps.
- `createKpiSelection()` for KPI cards.

`appearanceControls`: List of appearance panels to show. Only expose controls
the renderer actually reads. Supported values are:

- `categoricalPalette`
- `continuousScale`
- `legend`
- `mapOptions`
- `cartesianOptions`
- `lineOptions`
- `areaOptions`
- `groupedBarOptions`
- `donutOptions`
- `formatting`
- `colorOverrides`

`buildPreviewConfig(values)`: Lenient builder used while users are still filling
the form. Submit still uses the strict `schema`.

## Schema Options

Use a pure `.schema.ts` file for persisted shape and validation. This keeps
`@repo/schemas/chart` server-safe and avoids importing React renderers into the
server.

For standard plots, use `createPlotConfigurationSchema` with a
`PlotSchemaContract`:

- `subType`: The exact persisted plot subtype.
- `chartLabel`: Human-readable label used in validation messages.
- `validationMode: 'cartesian'`: At most two dimensions may vary. This matches
  line, area, stacked area, stacked bar, grouped bar, scatter, and the sample.
- `validationMode: 'singleDimension'`: Only one dimension may vary. This matches
  donut and ranked bar.

For existing non-plot families, use the chart-owned helpers already present:

- `createMapConfigurationSchema()`
- `createTableConfigurationSchema()`
- `createKpiConfigurationSchema()`

If a chart needs extra persisted fields, add them in that chart's `.schema.ts`
file only. Existing JSON must remain valid unless a migration is part of the
same change.

## Data And Rendering

The platform preserves a strict invariant: one rendered visual element maps to
one product output. No chart should aggregate, summarise, overwrite, or silently
drop product outputs.

Use these helpers when possible:

- `createPlotDataRequirements()` for standard product-output plots.
- `getPlotProductOutputQuery(chart)` when a custom plot data function needs the
  default query.
- `createPlotPreviewConfig(subType)` for standard plot preview JSON.
- `createStandardPlotRenderer()` for Recharts-backed plots that use
  `PlotChart`.

Custom charts can use `defineChart`, but they still need to own all behavior in
their chart module and expose the same simple definition contract.

## Verification

Run focused checks after changing chart definitions:

```bash
pnpm --filter @repo/plot lint
pnpm --filter @repo/plot test:unit
pnpm --filter @repo/schemas test:unit
pnpm --filter web typecheck
```

For report or dashboard behavior, also smoke-test chart creation, editing,
reload, publish/PDF, and dashboard rendering in the browser.

## Related Docs

- [Charting requirements](./requirements/charting.md)
- [Architecture](./architecture.md)
- [Development workflow](./development-workflow.md)
- [Plot package](../packages/plot/readme.md)
