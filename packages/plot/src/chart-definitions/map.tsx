'use client'

import { Map } from 'lucide-react'
import {
  type ChartConfiguration,
  type ChartConfigurationDraft,
  filterRecordsForTimePoint,
} from '../chart-core'
import { suggestMapChartTitle } from '../chart-title'
import {
  applyChartTimeChangeTransform,
  createMapSelection,
  getChartTimeChangeMode,
  getTimePointQueryForTimeChange,
  supportsTimeChangeTransform,
} from './definition-helpers'
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
    transform: values.transform,
  }
}

function mapOutputsQuery(
  chart: ChartConfiguration,
): ChartProductOutputQuery | null {
  if (chart.type !== 'map') return null
  const query = {
    indicatorId: chart.indicatorId,
    geometryOutputId: chart.geometryOutputIds,
  }
  const timePoint = getTimePointQueryForTimeChange(chart, chart.timePoint)
  return timePoint === undefined ? query : { ...query, timePoint }
}

const mapAppearanceControls = tuple(
  'continuousScale',
  'legend',
  'mapOptions',
  'formatting',
)

function renderMapChart(context: ChartRenderContext) {
  const { chart } = context
  if (chart.type !== 'map') return null

  const timeChangeMode = getChartTimeChangeMode(chart)
  const transformedOutputs = applyChartTimeChangeTransform(
    context.productOutputs,
    chart,
    {
      groupKeys: ['indicatorId', 'geometryOutputId'],
    },
  )
  const productOutputs = timeChangeMode
    ? filterRecordsForTimePoint(transformedOutputs, chart.timePoint)
    : context.productOutputs

  return (
    context.adapters?.renderMap?.({
      ...context,
      productOutputs,
    }) ?? null
  )
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
  timeChange: supportsTimeChangeTransform({
    modes: tuple('delta', 'percentDelta'),
    defaultMode: 'none',
  }),
  renderer: { render: renderMapChart },
  selection: createMapSelection(),
  appearanceControls: mapAppearanceControls,
  buildPreviewConfig: buildMapPreviewConfig,
})
