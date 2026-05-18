'use client'

import clsx from 'clsx'
import { Table2 } from 'lucide-react'
import {
  type ChartConfiguration,
  type ChartConfigurationDraft,
} from '../chart-core'
import { suggestTableChartTitle } from '../chart-title'
import { getTablePlotCodeSnippet, TablePlot } from '../table-plot'
import {
  applyChartTimeChangeTransform,
  createTableSelection,
  getChartTimeChangeMode,
  getTimePointQueryForTimeChange,
  supportsTimeChangeTransform,
} from './definition-helpers'
import { tableChartConfigurationSchema } from './table.schema'
import {
  defineTableChart,
  tuple,
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
    transform: values.transform,
  }
}

function tableOutputsQuery(
  chart: ChartConfiguration,
): ChartProductOutputQuery | null {
  if (chart.type !== 'table') return null
  const query = {
    indicatorId: chart.indicatorIds,
    geometryOutputId: chart.geometryOutputIds,
  }
  const timePoint = getTimePointQueryForTimeChange(chart, chart.timePoints)
  return timePoint === undefined ? query : { ...query, timePoint }
}

const tableAppearanceControls = tuple('continuousScale', 'formatting')

function renderTableChart(context: ChartRenderContext) {
  const { chart, className, options, adapters } = context
  if (chart.type !== 'table') return null

  const timeChangeMode = getChartTimeChangeMode(chart)
  const outputs = applyChartTimeChangeTransform(context.productOutputs, chart, {
    groupKeys: ['indicatorId', 'geometryOutputId'],
  })

  return (
    <div className={clsx('flex flex-1 min-h-0 flex-col gap-2', className)}>
      <TablePlot
        data={outputs}
        xDimension={chart.xDimension}
        yDimension={chart.yDimension}
        appearance={chart.appearance}
        valueFormat={timeChangeMode === 'percentDelta' ? 'percent' : 'number'}
        onSelect={context.onSelect}
      />
      {options?.showCodeSnippet &&
        adapters?.renderObservableCellsCopy?.(getTablePlotCodeSnippet())}
    </div>
  )
}

export const tableChartDefinition = defineTableChart({
  key: 'table',
  type: 'table',
  label: 'Table',
  description: 'Colour-coded grid',
  icon: Table2,
  schema: tableChartConfigurationSchema,
  getSuggestedTitle: suggestTableChartTitle,
  getDataRequirements: (chart) => {
    if (chart.type !== 'table') return null
    return {
      productRunId: chart.productRunId,
      productOutputQuery: tableOutputsQuery(chart),
      loadingMessage: 'Loading table...',
      unavailableMessage: 'Table data is unavailable.',
    }
  },
  timeChange: supportsTimeChangeTransform({
    modes: tuple('delta', 'percentDelta'),
    defaultMode: 'none',
  }),
  renderer: { render: renderTableChart },
  selection: createTableSelection(),
  appearanceControls: tableAppearanceControls,
  buildPreviewConfig: buildTablePreviewConfig,
})
