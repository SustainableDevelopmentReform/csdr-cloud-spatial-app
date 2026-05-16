'use client'

import {
  mapChartConfigurationSchema,
  type ChartConfiguration,
  type ChartConfigurationDraft,
} from '../chart-core'
import {
  defineChart,
  tuple,
  type ChartDimensionModes,
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

function getMapDimensionModes(): ChartDimensionModes {
  return {
    indicators: 'single',
    geometries: 'optionalMulti',
    time: 'single',
  }
}

function renderMapChart(context: ChartRenderContext) {
  return context.adapters?.renderMap?.(context) ?? null
}

export const mapChartDefinition = defineChart({
  key: 'map',
  type: 'map',
  label: 'Map',
  description: 'Spatial view',
  icon: 'map',
  schema: mapChartConfigurationSchema,
  titleStrategy: 'map',
  renderer: { render: renderMapChart },
  data: {
    loadingMessage: 'Loading map...',
    unavailableMessage: 'Map data is unavailable for this chart.',
    requiresProductRun: true,
    requiresIndicator: true,
    getProductOutputsQuery: mapOutputsQuery,
  },
  selection: {
    indicatorField: 'indicatorId',
    timeField: 'timePoint',
    geometryField: 'geometryOutputIds',
    defaultSeriesDimension: 'indicators',
    selectableDimensions: tuple('geometries'),
    getDimensionModes: getMapDimensionModes,
  },
  appearanceControls: mapAppearanceControls,
  buildPreviewConfig: buildMapPreviewConfig,
})
