'use client'

import clsx from 'clsx'
import {
  getPlotChartGroupBy,
  plotChartConfigurationSchema,
  type ChartConfiguration,
  type ChartConfigurationDraft,
  type ChartDataDimension,
} from '../chart-core'
import { getPlotCodeSnippet } from '../Plot'
import { PlotChart } from '../PlotChart'
import {
  defineChart,
  tuple,
  type ChartDimensionModes,
  type ChartProductOutputQuery,
  type ChartRenderContext,
} from './core'

const stackedAreaSubType = 'stacked-area'

const stackedAreaAppearanceControls = tuple(
  'categoricalPalette',
  'legend',
  'cartesianOptions',
  'lineOptions',
  'areaOptions',
  'formatting',
  'colorOverrides',
)

function buildStackedAreaPreviewConfig(
  values: ChartConfigurationDraft,
): ChartConfiguration | null {
  if (!values.productRunId) return null

  return {
    type: 'plot',
    subType: stackedAreaSubType,
    productRunId: values.productRunId,
    indicatorIds: values.indicatorIds ?? [],
    geometryOutputIds: values.geometryOutputIds,
    timePoints: values.timePoints,
    title: values.title,
    description: values.description,
    appearance: values.appearance,
  }
}

function stackedAreaOutputsQuery(
  chart: ChartConfiguration,
): ChartProductOutputQuery | null {
  if (chart.type !== 'plot') return null
  return {
    indicatorId: chart.indicatorIds,
    geometryOutputId: chart.geometryOutputIds,
    timePoint: chart.timePoints,
  }
}

function getStackedAreaDimensionModes({
  seriesDimension,
}: {
  seriesDimension: ChartDataDimension
}): ChartDimensionModes {
  return {
    indicators: seriesDimension === 'indicators' ? 'multi' : 'single',
    geometries: seriesDimension === 'geometries' ? 'multi' : 'single',
    time: 'multi',
  }
}

function renderStackedAreaChart(context: ChartRenderContext) {
  const { chart, className, options, adapters } = context
  if (chart.type !== 'plot') return null

  const groupBy = getPlotChartGroupBy(chart)
  const outputs = context.productOutputs

  return (
    <div className={clsx('flex flex-1 min-h-0 flex-col gap-2', className)}>
      <div
        className={clsx(
          'flex flex-col flex-1 min-h-0',
          options?.showSelectedPointDetails &&
            'grid grid-cols-2 grid-rows-1 gap-4',
        )}
      >
        <PlotChart
          data={outputs}
          x="timePoint"
          y="value"
          groupBy={groupBy}
          type={chart.subType}
          appearance={chart.appearance}
          onSelect={context.onSelect}
        />
      </div>
      {options?.showCodeSnippet &&
        adapters?.renderObservableCellsCopy?.(
          getPlotCodeSnippet({
            data: outputs,
            x: 'timePoint',
            y: 'value',
          }),
        )}
    </div>
  )
}

export const stackedAreaChartDefinition = defineChart({
  key: stackedAreaSubType,
  type: 'plot',
  subType: stackedAreaSubType,
  label: 'Stacked Area',
  description: 'Part-to-whole over time',
  icon: 'layers',
  requiresMultiTime: true,
  schema: plotChartConfigurationSchema,
  titleStrategy: 'plot',
  renderer: { render: renderStackedAreaChart },
  data: {
    loadingMessage: 'Loading chart...',
    unavailableMessage: 'Chart data is unavailable.',
    requiresProductRun: true,
    requiresIndicator: false,
    getProductOutputsQuery: stackedAreaOutputsQuery,
  },
  selection: {
    indicatorField: 'indicatorIds',
    timeField: 'timePoints',
    geometryField: 'geometryOutputIds',
    defaultSeriesDimension: 'indicators',
    selectableDimensions: tuple('indicators', 'geometries'),
    getDimensionModes: getStackedAreaDimensionModes,
  },
  appearanceControls: stackedAreaAppearanceControls,
  buildPreviewConfig: buildStackedAreaPreviewConfig,
})
