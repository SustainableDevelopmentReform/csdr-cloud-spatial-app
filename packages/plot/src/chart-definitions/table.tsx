'use client'

import clsx from 'clsx'
import {
  tableChartConfigurationSchema,
  tableChartDimensionMetadata,
  type ChartConfiguration,
  type ChartConfigurationDraft,
  type TableChartDimension,
} from '../chart-core'
import { getTablePlotCodeSnippet, TablePlot } from '../TablePlot'
import {
  defineChart,
  tuple,
  type ChartDimensionModes,
  type ChartProductOutputQuery,
  type ChartRenderContext,
} from './core'

function buildTablePreviewConfig(
  values: ChartConfigurationDraft,
): ChartConfiguration | null {
  if (!values.productRunId || !values.xDimension || !values.yDimension) {
    return null
  }

  return {
    type: 'table',
    productRunId: values.productRunId,
    xDimension: values.xDimension,
    yDimension: values.yDimension,
    indicatorIds: values.indicatorIds ?? [],
    geometryOutputIds: values.geometryOutputIds,
    timePoints: values.timePoints,
    title: values.title,
    description: values.description,
    appearance: values.appearance,
  }
}

function tableOutputsQuery(
  chart: ChartConfiguration,
): ChartProductOutputQuery | null {
  if (chart.type !== 'table') return null
  return {
    indicatorId: chart.indicatorIds,
    geometryOutputId: chart.geometryOutputIds,
    timePoint: chart.timePoints,
  }
}

function getTableDimensionModes({
  xDimension,
  yDimension,
}: {
  xDimension?: TableChartDimension
  yDimension?: TableChartDimension
}): ChartDimensionModes {
  return {
    indicators:
      xDimension === 'indicatorName' || yDimension === 'indicatorName'
        ? 'multi'
        : 'single',
    geometries:
      xDimension === 'geometryOutputName' || yDimension === 'geometryOutputName'
        ? 'multi'
        : 'single',
    time:
      xDimension === 'timePoint' || yDimension === 'timePoint'
        ? 'multi'
        : 'single',
  }
}

const tableAppearanceControls = tuple('continuousScale', 'formatting')

function renderTableChart(context: ChartRenderContext) {
  const { chart, className, options, adapters } = context
  if (chart.type !== 'table') return null

  return (
    <div className={clsx('flex flex-1 min-h-0 flex-col gap-2', className)}>
      <TablePlot
        data={context.productOutputs}
        xDimension={chart.xDimension}
        yDimension={chart.yDimension}
        appearance={chart.appearance}
        onSelect={context.onSelect}
      />
      {options?.showCodeSnippet &&
        adapters?.renderObservableCellsCopy?.(getTablePlotCodeSnippet())}
    </div>
  )
}

export const tableChartDefinition = defineChart({
  key: 'table',
  type: 'table',
  label: 'Table',
  description: 'Colour-coded grid',
  icon: 'table',
  schema: tableChartConfigurationSchema,
  titleStrategy: 'table',
  renderer: { render: renderTableChart },
  data: {
    loadingMessage: 'Loading table...',
    unavailableMessage: 'Table data is unavailable.',
    requiresProductRun: true,
    requiresIndicator: false,
    getProductOutputsQuery: tableOutputsQuery,
  },
  selection: {
    indicatorField: 'indicatorIds',
    timeField: 'timePoints',
    geometryField: 'geometryOutputIds',
    defaultSeriesDimension: 'indicators',
    selectableDimensions: tuple('indicators', 'geometries', 'time'),
    tableDimensions: tableChartDimensionMetadata,
    getDimensionModes: getTableDimensionModes,
  },
  appearanceControls: tableAppearanceControls,
  buildPreviewConfig: buildTablePreviewConfig,
})
