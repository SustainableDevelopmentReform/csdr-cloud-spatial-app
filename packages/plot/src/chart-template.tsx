'use client'

import { z } from '@hono/zod-openapi'
import { TrendingUp } from 'lucide-react'
import { suggestPlotChartTitle } from './chart-title'
import {
  definePlotChart,
  tuple,
  type ChartRenderContext,
} from './chart-definitions/core'
import {
  createCartesianPlotSelection,
  createPlotDataRequirements,
  createPlotPreviewConfig,
} from './chart-definitions/definition-helpers'
import {
  sampleChartConfigurationSchema,
  sampleSubType,
} from './chart-definitions/sample.schema'

// Canonical minimal chart example.
//
// This file is intentionally not imported by the production definition
// manifest. For a real chart:
// 1. Copy the schema pattern from chart-definitions/sample.schema.ts.
// 2. Copy this definition into chart-definitions/<your-chart>.tsx.
// 3. Add the schema contract to chart-schemas.ts.
// 4. Add the definition to chart-definitions.tsx.
//
// Keep persisted JSON backward compatible: adding a chart can add a new
// subtype, but existing subtype shapes must keep parsing the same way.
export type SampleChartConfiguration = z.infer<
  typeof sampleChartConfigurationSchema
>

const sampleAppearanceControls = tuple('formatting')

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

export const sampleChartDefinition = definePlotChart({
  // Deliberately not added to the production manifest.
  key: sampleSubType,
  type: 'plot',
  subType: sampleSubType,
  label: 'Sample Chart',
  description: 'Template for developing a new chart definition',
  // Icons are components, not strings, so host apps do not need icon maps.
  icon: TrendingUp,
  // The schema is the strict persisted JSON contract.
  schema: sampleChartConfigurationSchema,
  // Title generation is a function owned by the chart definition.
  getSuggestedTitle: suggestPlotChartTitle,
  // Data requirements describe what the host app must load before rendering.
  getDataRequirements: createPlotDataRequirements({
    loadingMessage: 'Loading sample chart...',
    unavailableMessage: 'Sample chart data is unavailable.',
  }),
  // Renderers receive loaded data; they should not fetch.
  renderer: { render: renderSampleChart },
  // Selection helpers hide persisted field-name plumbing.
  selection: createCartesianPlotSelection(tuple('indicators')),
  // Add or remove controls to expose only the appearance fields the renderer
  // understands.
  appearanceControls: sampleAppearanceControls,
  buildPreviewConfig: createPlotPreviewConfig(sampleSubType),
})
