# Chart Development

This guide describes how to add a production chart without changing `apps/web`.
Chart-specific behavior belongs in `@repo/plot`; the web app only resolves a
definition, loads the data requested by that definition, and calls the renderer.

## Current Shape

Production chart definitions live in `packages/plot/src/chart-definitions/`.
Each chart has its own file and is added to the static manifest in
`packages/plot/src/chart-definitions.tsx`.

The shared pieces are:

- `core.ts`: `ChartDefinition`, `ChartRenderContext`, `defineChart`, and typed tuple helpers.
- `chart-template.tsx`: a non-production sample chart exported from `@repo/plot/chart-template`.

Each production definition file owns its schema wiring, data query, selection
rules, appearance controls, preview config, and renderer.

There is no mutable runtime registry. The manifest is a readonly tuple so chart
keys and metadata stay visible to TypeScript across the monorepo.

## Add A Chart

1. Decide the persisted configuration shape.
2. Add or extend the relevant Zod schema in `packages/plot/src/chart-core.ts`.
3. Create a definition file under `packages/plot/src/chart-definitions/`.
4. Declare data requirements, selection rules, appearance controls, preview behavior, and the renderer in that definition.
5. Add the definition to the `chartDefinitions` tuple in `packages/plot/src/chart-definitions.tsx`.
6. Add or update tests in `packages/plot/test/chart-definitions.test.tsx`.

Do not add chart-specific branches to `apps/web`. If the form needs a new
generic control, add a typed definition property first, then teach the web form
to render that property generically.

## Example

Use `packages/plot/src/chart-template.tsx` as the starting point for a new
chart. It is intentionally not part of the production manifest. A production
definition file under `packages/plot/src/chart-definitions/` can look like this:

```tsx
import { z } from '@hono/zod-openapi'
import {
  baseChartConfigurationSchema,
  type ChartConfiguration,
} from '../chart-core'
import { defineChart, tuple, type ChartRenderContext } from './core'

const customChartConfigurationSchema = baseChartConfigurationSchema.extend({
  type: z.literal('plot'),
  subType: z.literal('custom'),
  indicatorIds: z.array(z.string()).min(1),
  timePoints: z.array(z.string()).optional(),
})

function renderCustomChart(context: ChartRenderContext) {
  return <div>{context.productOutputs.length} rows loaded</div>
}

export const customChartDefinition = defineChart({
  key: 'custom',
  type: 'plot',
  subType: 'custom',
  label: 'Custom',
  description: 'Example custom chart',
  icon: 'line',
  schema: customChartConfigurationSchema,
  titleStrategy: 'plot',
  renderer: { render: renderCustomChart },
  data: {
    loadingMessage: 'Loading custom chart...',
    unavailableMessage: 'Custom chart data is unavailable.',
    requiresProductRun: true,
    requiresIndicator: false,
    getProductOutputsQuery: (chart: ChartConfiguration) => {
      if (chart.type !== 'plot') return null
      return {
        indicatorId: chart.indicatorIds,
        geometryOutputId: chart.geometryOutputIds,
        timePoint: chart.timePoints,
      }
    },
  },
  selection: {
    indicatorField: 'indicatorIds',
    timeField: 'timePoints',
    geometryField: 'geometryOutputIds',
    defaultSeriesDimension: 'indicators',
    selectableDimensions: tuple('indicators', 'geometries'),
    getDimensionModes: ({ seriesDimension }) => ({
      indicators: seriesDimension === 'indicators' ? 'multi' : 'single',
      geometries: seriesDimension === 'geometries' ? 'multi' : 'single',
      time: 'multi',
    }),
  },
  appearanceControls: tuple('categoricalPalette', 'legend', 'formatting'),
  buildPreviewConfig: (values) => {
    if (!values.productRunId) return null
    return {
      type: 'plot',
      subType: 'custom',
      productRunId: values.productRunId,
      indicatorIds: values.indicatorIds ?? [],
      geometryOutputIds: values.geometryOutputIds,
      timePoints: values.timePoints,
      title: values.title,
      description: values.description,
      appearance: values.appearance,
    }
  },
})
```

For a production chart, put this in a dedicated file such as
`packages/plot/src/chart-definitions/custom.ts`, export the definition, and add
it to the manifest tuple. If the chart needs a new persisted discriminator,
update the schema union in `chart-core.ts` before adding the definition.

## Test The Sample In The Web App

The sample chart is executable, but it is not user-facing by default. To smoke
test the template in reports or dashboards, temporarily add it to
`packages/plot/src/chart-definitions.tsx`:

```tsx
import { sampleChartDefinition } from './chart-template'

export const chartDefinitions = tuple(
  lineChartDefinition,
  // Existing production definitions...
  kpiChartDefinition,
  sampleChartDefinition,
) satisfies readonly ChartDefinition[]
```

After testing, remove the import and tuple entry. The sample subtype is accepted
by the plot schema so the generic web form can save it while it is temporarily
enabled, and the sample renderer displays the product outputs fetched through
its declared data query.

## Definition Contract

`schema` is the strict persisted configuration parser. Keep it backward
compatible unless a dashboard/report migration is part of the same change.

`buildPreviewConfig` can be more lenient than `schema`; the dialog uses it while
the user is still filling the form. Submit still parses with the strict schema.

`selection` tells the generic form which controls to render and whether each
dimension is single-select, multi-select, or optional multi-select.

`appearanceControls` is the only place a chart should expose chart-specific
appearance UI. If the renderer does not read a property, do not expose that
control.

`data.getProductOutputsQuery` describes which product outputs the web adapter
should fetch. The renderer receives loaded `productOutputs`, `productRun`,
`productSummary`, `geometryOutputs`, `indicator`, `appearance`, `className`,
`onSelect`, and renderer options through `ChartRenderContext`.

## Verification

Run the focused checks after adding a chart:

```bash
pnpm --filter @repo/plot lint
pnpm --filter @repo/plot test:unit
pnpm --filter web typecheck
```

For chart behavior that appears in reports and dashboards, also smoke-test both
flows in the browser.

## Related Docs

- [Charting requirements](./requirements/charting.md)
- [Architecture](./architecture.md)
- [Development workflow](./development-workflow.md)
- [Plot package](../packages/plot/readme.md)
