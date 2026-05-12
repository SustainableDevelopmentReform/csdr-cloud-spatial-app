'use client'

import clsx from 'clsx'
import {
  kpiChartConfigurationSchema,
  type ChartConfiguration,
  type ChartConfigurationDraft,
} from '../chart-core'
import { makeDateFormatter, makeNumberFormatter } from '../types'
import {
  defineChart,
  tuple,
  type ChartDimensionModes,
  type ChartProductOutputQuery,
  type ChartRenderContext,
} from './core'

function buildKpiPreviewConfig(
  values: ChartConfigurationDraft,
): ChartConfiguration | null {
  if (
    !values.productRunId ||
    !values.indicatorId ||
    !values.timePoint ||
    values.geometryOutputIds?.length !== 1
  ) {
    return null
  }

  return {
    type: 'kpi',
    productRunId: values.productRunId,
    indicatorId: values.indicatorId,
    timePoint: values.timePoint,
    geometryOutputIds: values.geometryOutputIds,
    title: values.title,
    description: values.description,
    appearance: values.appearance,
  }
}

function kpiOutputsQuery(
  chart: ChartConfiguration,
): ChartProductOutputQuery | null {
  if (chart.type !== 'kpi') return null
  return {
    indicatorId: chart.indicatorId,
    geometryOutputId: chart.geometryOutputIds[0],
    timePoint: chart.timePoint,
  }
}

const kpiAppearanceControls = tuple('formatting')

function getKpiDimensionModes(): ChartDimensionModes {
  return {
    indicators: 'single',
    geometries: 'single',
    time: 'single',
  }
}

function renderKpiChart(context: ChartRenderContext) {
  const { chart, className } = context
  if (chart.type !== 'kpi') return null

  const numberFormatter = makeNumberFormatter(
    chart.appearance?.decimalPlaces,
    chart.appearance?.compactNumbers,
  )
  const dateFormatter = makeDateFormatter(chart.appearance?.datePrecision)
  const outputs = context.productOutputs

  if (outputs.length === 0) {
    return (
      <div
        className={clsx(
          'flex h-full min-h-[240px] items-center justify-center px-4 text-center text-sm text-muted-foreground',
          className,
        )}
      >
        No value for selected filters.
      </div>
    )
  }

  if (outputs.length > 1) {
    return (
      <div
        className={clsx(
          'flex h-full min-h-[240px] items-center justify-center px-4 text-center text-sm text-destructive',
          className,
        )}
      >
        KPI requires exactly one product output. Narrow your selections to a
        single indicator, geometry, and time point.
      </div>
    )
  }

  const dataPoint = outputs[0]
  if (!dataPoint) return null

  const contextParts = [
    dataPoint.indicatorName ?? 'Indicator',
    dataPoint.geometryOutputName ?? 'Geometry',
    dateFormatter.format(new Date(dataPoint.timePoint)),
  ]

  return (
    <button
      type="button"
      className={clsx(
        'flex h-full w-full flex-col items-center justify-center gap-2 rounded-md px-3 py-4 text-center',
        'hover:bg-muted/20',
        className,
      )}
      onClick={(event) => context.onSelect?.({ dataPoint, event })}
    >
      <div className="text-4xl font-semibold leading-none tracking-tight sm:text-5xl">
        {numberFormatter.format(dataPoint.value)}
      </div>
      <div className="max-w-full truncate text-xs text-muted-foreground sm:text-sm">
        {contextParts.join(' · ')}
      </div>
    </button>
  )
}

export const kpiChartDefinition = defineChart({
  key: 'kpi',
  type: 'kpi',
  label: 'KPI Card',
  description: 'Single highlighted value',
  icon: 'kpi',
  schema: kpiChartConfigurationSchema,
  titleStrategy: 'product',
  renderer: { render: renderKpiChart },
  data: {
    loadingMessage: 'Loading KPI value...',
    unavailableMessage: 'KPI data is unavailable.',
    requiresProductRun: true,
    requiresIndicator: false,
    getProductOutputsQuery: kpiOutputsQuery,
  },
  selection: {
    indicatorField: 'indicatorId',
    timeField: 'timePoint',
    geometryField: 'geometryOutputIds',
    defaultSeriesDimension: 'indicators',
    selectableDimensions: tuple('geometries'),
    getDimensionModes: getKpiDimensionModes,
  },
  appearanceControls: kpiAppearanceControls,
  buildPreviewConfig: buildKpiPreviewConfig,
})
