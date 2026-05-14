'use client'

import { z } from '@hono/zod-openapi'
import {
  baseChartConfigurationSchema,
  type ChartConfiguration,
  type ChartConfigurationDraft,
} from './chart-core'
import {
  defineChart,
  tuple,
  type ChartDimensionModes,
  type ChartProductOutputQuery,
  type ChartRenderContext,
} from './chart-definitions/core'

// This file is intentionally not imported by chartDefinitions. Copy it when
// developing a new production chart inside @repo/plot.
//
// For a real plot chart with a new persisted subtype, first add that subtype to
// plotSubTypeValues in chart-core.ts. Then set the copied definition key and
// subType to that same value so persisted chart configs resolve back to the
// definition.
const sampleSubType = 'sample'

export const sampleChartConfigurationSchema =
  baseChartConfigurationSchema.extend({
    // Replace the discriminator values with the persisted shape for the real
    // chart. The definition key must match the persisted subtype.
    type: z.literal('plot'),
    subType: z.literal(sampleSubType),
    indicatorIds: z.array(z.string()).min(1),
    geometryOutputIds: z.array(z.string()).optional(),
    timePoints: z.array(z.string()).optional(),
    // Add chart-specific options here. The inferred type flows through the
    // definition, renderer, preview config, and persisted parser.
    sampleOption: z.string().optional(),
  })

export type SampleChartConfiguration = z.infer<
  typeof sampleChartConfigurationSchema
>

const sampleAppearanceControls = tuple('formatting')

function sampleOutputsQuery(
  chart: ChartConfiguration,
): ChartProductOutputQuery | null {
  if (chart.type !== 'plot') return null
  return {
    indicatorId: chart.indicatorIds,
    geometryOutputId: chart.geometryOutputIds,
    timePoint: chart.timePoints,
  }
}

function getSampleDimensionModes(): ChartDimensionModes {
  return {
    indicators: 'multi',
    geometries: 'single',
    time: 'multi',
  }
}

function buildSamplePreviewConfig(
  values: ChartConfigurationDraft,
): ChartConfiguration | null {
  if (!values.productRunId) return null
  return {
    type: 'plot',
    subType: sampleSubType,
    productRunId: values.productRunId,
    indicatorIds: values.indicatorIds ?? [],
    geometryOutputIds: values.geometryOutputIds,
    timePoints: values.timePoints,
    title: values.title,
    description: values.description,
    appearance: values.appearance,
  }
}

function renderSampleChart(context: ChartRenderContext) {
  const rows = context.productOutputs.slice(0, 5)

  return (
    <div className="flex h-full min-h-[240px] flex-col gap-3 rounded-md border border-dashed p-4 text-sm">
      <div>
        <div className="font-medium">Sample chart renderer</div>
        <div className="text-muted-foreground">
          Received {context.productOutputs.length} product outputs.
        </div>
      </div>
      <div className="min-h-0 overflow-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="border-b">
            <tr>
              <th className="py-1 pr-3 font-medium">Indicator</th>
              <th className="py-1 pr-3 font-medium">Boundary</th>
              <th className="py-1 pr-3 font-medium">Time</th>
              <th className="py-1 font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b last:border-0">
                <td className="py-1 pr-3">{row.indicatorName ?? 'Value'}</td>
                <td className="py-1 pr-3">
                  {row.geometryOutputName ?? 'All boundaries'}
                </td>
                <td className="py-1 pr-3">{String(row.timePoint ?? '')}</td>
                <td className="py-1">{row.value}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="py-2 text-muted-foreground" colSpan={4}>
                  No product outputs matched the sample filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export const sampleChartDefinition = defineChart({
  // Deliberately not added to the production manifest.
  key: sampleSubType,
  type: 'plot',
  subType: sampleSubType,
  label: 'Sample Chart',
  description: 'Template for developing a new chart definition',
  icon: 'line',
  schema: sampleChartConfigurationSchema,
  titleStrategy: 'plot',
  renderer: { render: renderSampleChart },
  data: {
    loadingMessage: 'Loading sample chart...',
    unavailableMessage: 'Sample chart data is unavailable.',
    requiresProductRun: true,
    requiresIndicator: false,
    // Return the product-output filters required by the chart. The web app
    // owns the hook execution and passes loaded rows into the renderer.
    getProductOutputsQuery: sampleOutputsQuery,
  },
  selection: {
    // Declare what the generic form should render. A production chart should
    // keep this in sync with its schema validation.
    indicatorField: 'indicatorIds',
    timeField: 'timePoints',
    geometryField: 'geometryOutputIds',
    defaultSeriesDimension: 'indicators',
    selectableDimensions: tuple('indicators'),
    getDimensionModes: getSampleDimensionModes,
  },
  // Add or remove controls to expose only the appearance fields the renderer
  // understands.
  appearanceControls: sampleAppearanceControls,
  buildPreviewConfig: buildSamplePreviewConfig,
})
