'use client'

import clsx from 'clsx'
import { Hash } from 'lucide-react'
import {
  type ChartConfiguration,
  type ChartConfigurationDraft,
  filterRecordsForTimePoint,
} from '../chart-core'
import { suggestKpiChartTitle } from '../chart-title'
import { makeDateFormatter, makeNumberFormatter } from '../types'
import {
  applyChartTimeChangeTransform,
  createKpiSelection,
  getChartTimeChangeMode,
  getTimePointQueryForTimeChange,
  supportsTimeChangeTransform,
} from './definition-helpers'
import { kpiChartConfigurationSchema } from './kpi.schema'
import {
  defineKpiChart,
  tuple,
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
    transform: values.transform,
  }
}

function kpiOutputsQuery(
  chart: ChartConfiguration,
): ChartProductOutputQuery | null {
  if (chart.type !== 'kpi') return null
  const query = {
    indicatorId: chart.indicatorId,
    geometryOutputId: chart.geometryOutputIds[0],
  }
  const timePoint = getTimePointQueryForTimeChange(chart, chart.timePoint)
  return timePoint === undefined ? query : { ...query, timePoint }
}

const kpiAppearanceControls = tuple('formatting')

function readObjectProperty(value: unknown, key: string): unknown {
  if (value === null || typeof value !== 'object') return undefined
  return Reflect.get(value, key)
}

function readUnit(value: unknown): string | null {
  const unit = readObjectProperty(value, 'unit')
  return typeof unit === 'string' && unit.trim() ? unit.trim() : null
}

function readTimePoint(value: unknown): Date | string | null {
  if (value instanceof Date || typeof value === 'string') return value
  return null
}

function resolveKpiUnit({
  indicator,
  dataPoint,
}: {
  indicator: unknown | null | undefined
  dataPoint: ChartRenderContext['productOutputs'][number]
}): string | null {
  return (
    readUnit(indicator) ?? readUnit(readObjectProperty(dataPoint, 'indicator'))
  )
}

function formatTimeLabel(
  formatter: Intl.DateTimeFormat,
  timePoint: Date | string | null | undefined,
): string | null {
  if (!timePoint) return null
  const date = timePoint instanceof Date ? timePoint : new Date(timePoint)
  if (Number.isNaN(date.getTime())) return null
  return formatter.format(date)
}

function renderKpiChart(context: ChartRenderContext) {
  const { chart, className } = context
  if (chart.type !== 'kpi') return null

  const timeChangeMode = getChartTimeChangeMode(chart)
  const numberFormatter = makeNumberFormatter(
    chart.appearance?.decimalPlaces,
    chart.appearance?.compactNumbers,
  )
  const dateFormatter = makeDateFormatter(chart.appearance?.datePrecision)
  const transformedOutputs = applyChartTimeChangeTransform(
    context.productOutputs,
    chart,
    {
      groupKeys: ['indicatorId', 'geometryOutputId'],
    },
  )
  const outputs = timeChangeMode
    ? filterRecordsForTimePoint(transformedOutputs, chart.timePoint)
    : context.productOutputs
  const formatValue = (value: number, unit: string | null) => {
    const formattedValue = numberFormatter.format(value)
    if (timeChangeMode === 'percentDelta') return `${formattedValue}%`
    return unit ? `${formattedValue} ${unit}` : formattedValue
  }

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
        single indicator, boundary, and time point.
      </div>
    )
  }

  const dataPoint = outputs[0]
  if (!dataPoint) return null

  const unit = resolveKpiUnit({
    indicator: context.indicator,
    dataPoint,
  })
  const currentTimeLabel = formatTimeLabel(dateFormatter, dataPoint.timePoint)
  const baselineTimeLabel = formatTimeLabel(
    dateFormatter,
    readTimePoint(readObjectProperty(dataPoint, 'baselineTimePoint')),
  )
  const comparisonLabel =
    timeChangeMode && baselineTimeLabel && currentTimeLabel
      ? `${
          timeChangeMode === 'percentDelta' ? 'Percent change' : 'Change'
        } from ${baselineTimeLabel} to ${currentTimeLabel}`
      : currentTimeLabel
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
        {formatValue(dataPoint.value, unit)}
      </div>
      {timeChangeMode ? (
        <div className="flex max-w-full flex-col items-center gap-1 text-xs text-muted-foreground sm:text-sm">
          <div className="max-w-full truncate font-medium">
            {comparisonLabel}
          </div>
        </div>
      ) : currentTimeLabel ? (
        <div className="max-w-full truncate text-xs text-muted-foreground sm:text-sm">
          {currentTimeLabel}
        </div>
      ) : null}
    </button>
  )
}

export const kpiChartDefinition = defineKpiChart({
  key: 'kpi',
  type: 'kpi',
  label: 'KPI Card',
  description: 'Single highlighted value',
  icon: Hash,
  schema: kpiChartConfigurationSchema,
  getSuggestedTitle: suggestKpiChartTitle,
  getDataRequirements: (chart) => {
    if (chart.type !== 'kpi') return null
    return {
      productRunId: chart.productRunId,
      productOutputQuery: kpiOutputsQuery(chart),
      indicatorId: chart.indicatorId,
      loadingMessage: 'Loading KPI value...',
      unavailableMessage: 'KPI data is unavailable.',
    }
  },
  timeChange: supportsTimeChangeTransform({
    modes: tuple('delta', 'percentDelta'),
    defaultMode: 'none',
  }),
  renderer: { render: renderKpiChart },
  selection: createKpiSelection(),
  appearanceControls: kpiAppearanceControls,
  buildPreviewConfig: buildKpiPreviewConfig,
})
