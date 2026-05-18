'use client'

import { Map } from 'lucide-react'
import {
  type ChartConfiguration,
  type ChartConfigurationDraft,
} from '../chart-core'
import { suggestMapChartTitle } from '../chart-title'
import { createMapSelection } from './definition-helpers'
import { mapChartConfigurationSchema } from './map.schema'
import {
  defineMapChart,
  tuple,
  type ChartProductOutputQuery,
  type ChartRenderContext,
} from './core'

function buildMapPreviewConfig(
  values: ChartConfigurationDraft,
): ChartConfiguration | null {
  if (!values.productRunId || !values.indicatorId || !values.timePoint) {
    return null
  }

  return {
    type: 'map',
    productRunId: values.productRunId,
    indicatorId: values.indicatorId,
    timePoint: values.timePoint,
    geometryOutputIds: values.geometryOutputIds,
    title: values.title,
    description: values.description,
    appearance: values.appearance,
  }
}

function mapOutputsQuery(
  chart: ChartConfiguration,
): ChartProductOutputQuery | null {
  if (chart.type !== 'map') return null
  return {
    indicatorId: chart.indicatorId,
    geometryOutputId: chart.geometryOutputIds,
    timePoint: chart.timePoint,
  }
}

const mapAppearanceControls = tuple(
  'continuousScale',
  'legend',
  'mapOptions',
  'formatting',
)

function renderMapChart(context: ChartRenderContext) {
  return context.adapters?.renderMap?.(context) ?? null
}

export const mapChartDefinition = defineMapChart({
  key: 'map',
  type: 'map',
  label: 'Map',
  description: 'Spatial view',
  icon: Map,
  schema: mapChartConfigurationSchema,
  getSuggestedTitle: suggestMapChartTitle,
  getDataRequirements: (chart) => {
    if (chart.type !== 'map') return null
    return {
      productRunId: chart.productRunId,
      productOutputQuery: mapOutputsQuery(chart),
      indicatorId: chart.indicatorId,
      loadingMessage: 'Loading map...',
      unavailableMessage: 'Map data is unavailable for this chart.',
    }
  },
  renderer: { render: renderMapChart },
  selection: createMapSelection(),
  appearanceControls: mapAppearanceControls,
  buildPreviewConfig: buildMapPreviewConfig,
})
