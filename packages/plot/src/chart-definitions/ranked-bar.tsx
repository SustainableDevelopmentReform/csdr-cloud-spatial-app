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
import { PlotChart } from '../plot-chart'
import {
  defineChart,
  tuple,
  type ChartDimensionModes,
  type ChartProductOutputQuery,
  type ChartRenderContext,
} from './core'

const rankedBarSubType = 'ranked-bar'

const rankedBarAppearanceControls = tuple(
  'categoricalPalette',
  'legend',
  'cartesianOptions',
  'groupedBarOptions',
  'formatting',
  'colorOverrides',
)

function buildRankedBarPreviewConfig(
  values: ChartConfigurationDraft,
): ChartConfiguration | null {
  if (!values.productRunId) return null

  return {
    type: 'plot',
    subType: rankedBarSubType,
    productRunId: values.productRunId,
    indicatorIds: values.indicatorIds ?? [],
    geometryOutputIds: values.geometryOutputIds,
    timePoints: values.timePoints,
    title: values.title,
    description: values.description,
    appearance: values.appearance,
  }
}

function rankedBarOutputsQuery(
  chart: ChartConfiguration,
): ChartProductOutputQuery | null {
  if (chart.type !== 'plot') return null
  return {
    indicatorId: chart.indicatorIds,
    geometryOutputId: chart.geometryOutputIds,
    timePoint: chart.timePoints,
  }
}

function getRankedBarDimensionModes({
  seriesDimension,
}: {
  seriesDimension: ChartDataDimension
}): ChartDimensionModes {
  return {
    indicators: seriesDimension === 'indicators' ? 'multi' : 'single',
    geometries: seriesDimension === 'geometries' ? 'multi' : 'single',
    time: seriesDimension === 'time' ? 'multi' : 'single',
  }
}

function renderRankedBarChart(context: ChartRenderContext) {
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

export const rankedBarChartDefinition = defineChart({
  key: rankedBarSubType,
  type: 'plot',
  subType: rankedBarSubType,
  label: 'Ranked Bar',
  description: 'Sorted horizontal bars',
  icon: 'ranked-bar',
  schema: plotChartConfigurationSchema,
  titleStrategy: 'plot',
  renderer: { render: renderRankedBarChart },
  data: {
    loadingMessage: 'Loading chart...',
    unavailableMessage: 'Chart data is unavailable.',
    requiresProductRun: true,
    requiresIndicator: false,
    getProductOutputsQuery: rankedBarOutputsQuery,
  },
  selection: {
    indicatorField: 'indicatorIds',
    timeField: 'timePoints',
    geometryField: 'geometryOutputIds',
    defaultSeriesDimension: 'indicators',
    selectableDimensions: tuple('indicators', 'geometries', 'time'),
    getDimensionModes: getRankedBarDimensionModes,
  },
  appearanceControls: rankedBarAppearanceControls,
  buildPreviewConfig: buildRankedBarPreviewConfig,
})
