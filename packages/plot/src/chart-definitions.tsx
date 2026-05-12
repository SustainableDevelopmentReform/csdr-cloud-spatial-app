'use client'

import {
  chartConfigurationSchema,
  getChartConfigKey,
  getChartSeriesGroupBy,
  getSuggestedChartTitle,
  type AppearanceConfig,
  type ChartConfiguration,
  type ChartConfigurationDraft,
  type ChartDataDimension,
  type ChartTitleGeometry,
  type ChartTitleIndicator,
  type PlotGroupBy,
  type TableChartDimension,
} from './chart-core'
import { makeDateFormatter } from './types'
import { areaChartDefinition } from './chart-definitions/area'
import {
  tuple,
  type ChartDefinition,
  type ChartDimensionModes,
} from './chart-definitions/core'
import { donutChartDefinition } from './chart-definitions/donut'
import { dotChartDefinition } from './chart-definitions/dot'
import { groupedBarChartDefinition } from './chart-definitions/grouped-bar'
import { kpiChartDefinition } from './chart-definitions/kpi'
import { lineChartDefinition } from './chart-definitions/line'
import { mapChartDefinition } from './chart-definitions/map'
import { rankedBarChartDefinition } from './chart-definitions/ranked-bar'
import { stackedAreaChartDefinition } from './chart-definitions/stacked-area'
import { stackedBarChartDefinition } from './chart-definitions/stacked-bar'
import { tableChartDefinition } from './chart-definitions/table'

export {
  defineChart,
  tuple,
  type ChartAppearanceControl,
  type ChartDefinition,
  type ChartDimensionMode,
  type ChartDimensionModes,
  type ChartIconKey,
  type ChartProductOutput,
  type ChartProductOutputQuery,
  type ChartRenderAdapters,
  type ChartRenderContext,
  type ChartRenderOptions,
} from './chart-definitions/core'

export const chartDefinitions = tuple(
  lineChartDefinition,
  areaChartDefinition,
  stackedAreaChartDefinition,
  stackedBarChartDefinition,
  groupedBarChartDefinition,
  rankedBarChartDefinition,
  dotChartDefinition,
  donutChartDefinition,
  tableChartDefinition,
  mapChartDefinition,
  kpiChartDefinition,
) satisfies readonly ChartDefinition[]

export type ChartDefinitionKey = (typeof chartDefinitions)[number]['key']

export function getChartDefinitions(): readonly ChartDefinition[] {
  return chartDefinitions
}

export function getChartDefinition(
  key: string | null | undefined,
): ChartDefinition | null {
  if (!key) return null
  return chartDefinitions.find((definition) => definition.key === key) ?? null
}

export function getChartDefinitionForValues(
  values: Pick<ChartConfigurationDraft, 'type' | 'subType'>,
): ChartDefinition | null {
  return getChartDefinition(getChartConfigKey(values))
}

export function getChartDefinitionForConfiguration(
  chart: ChartConfiguration | null | undefined,
): ChartDefinition | null {
  if (!chart) return null
  return getChartDefinitionForValues(chart)
}

export function buildChartPreviewConfiguration(
  values: ChartConfigurationDraft,
): ChartConfiguration | null {
  const strict = chartConfigurationSchema.safeParse(values)
  if (strict.success) return strict.data

  const definition = getChartDefinitionForValues(values)
  return definition?.buildPreviewConfig(values) ?? null
}

export function toPersistedChartConfiguration(
  values: ChartConfigurationDraft,
): ChartConfiguration {
  return chartConfigurationSchema.parse(values)
}

export function getChartDimensionModes({
  definition,
  seriesDimension,
  xDimension,
  yDimension,
}: {
  definition: ChartDefinition | null | undefined
  seriesDimension: ChartDataDimension
  xDimension?: TableChartDimension
  yDimension?: TableChartDimension
}): ChartDimensionModes {
  return (
    definition?.selection.getDimensionModes({
      seriesDimension,
      xDimension,
      yDimension,
    }) ?? {
      indicators: 'single',
      geometries: 'single',
      time: 'single',
    }
  )
}

export function supportsSeriesDimension(
  definition: ChartDefinition | null,
): definition is ChartDefinition {
  return Boolean(
    definition &&
      definition.type === 'plot' &&
      definition.selection.selectableDimensions.length > 0,
  )
}

export function getSeriesDimensionLabel(definition: ChartDefinition | null) {
  if (!definition) return 'Compare by'
  return definition.selection.selectableDimensions.includes('time')
    ? 'Slice by'
    : 'Compare by'
}

export type ChartDimensionCounts = Record<ChartDataDimension, number>

export function resolveSeriesDimension({
  definition,
  current,
  counts,
}: {
  definition: ChartDefinition | null
  current: ChartDataDimension
  counts: ChartDimensionCounts
}): ChartDataDimension {
  if (!definition) return current
  const selectable = definition.selection.selectableDimensions

  if (selectable.includes(current) && counts[current] > 1) {
    return current
  }

  for (const dimension of selectable) {
    if (counts[dimension] > 1) return dimension
  }

  return definition.selection.defaultSeriesDimension
}

function isMultiSelection(values: readonly string[] | undefined) {
  return !values?.length || values.length > 1
}

export function inferChartSeriesDimension(
  chart: ChartConfiguration | null,
): ChartDataDimension {
  const definition = getChartDefinitionForConfiguration(chart)
  if (!chart || !definition) return 'indicators'

  const selectable = definition.selection.selectableDimensions
  if (selectable.length === 0) {
    return definition.selection.defaultSeriesDimension
  }

  const indicatorIds =
    chart.type === 'plot' || chart.type === 'table'
      ? chart.indicatorIds
      : undefined
  const timePoints =
    chart.type === 'plot' || chart.type === 'table'
      ? chart.timePoints
      : undefined

  const multiIndicators = (indicatorIds?.length ?? 0) > 1
  const multiGeometries = isMultiSelection(chart.geometryOutputIds)
  const multiTime = isMultiSelection(timePoints)

  if (
    selectable.includes('time') &&
    multiTime &&
    !multiIndicators &&
    !multiGeometries
  ) {
    return 'time'
  }
  if (
    selectable.includes('geometries') &&
    multiGeometries &&
    !multiIndicators
  ) {
    return 'geometries'
  }
  if (selectable.includes('indicators')) return 'indicators'
  return definition.selection.defaultSeriesDimension
}

export function getChartEstimatedSeriesCount({
  definition,
  seriesDimension,
  indicatorIds,
  geometryOutputIds,
  timePoints,
  timePointCount,
}: {
  definition: ChartDefinition | null
  seriesDimension: ChartDataDimension
  indicatorIds?: string[]
  geometryOutputIds?: string[]
  timePoints?: string[]
  timePointCount?: number
}): number | null {
  if (definition?.type !== 'plot') return null

  if (seriesDimension === 'indicators') {
    return indicatorIds?.length ?? null
  }
  if (seriesDimension === 'geometries') {
    return geometryOutputIds?.length ?? null
  }
  return timePoints?.length ?? timePointCount ?? null
}

export type ChartSeriesColorEntry = {
  label: string
  overrideKeys: string[]
}

function toSeriesKey(value: unknown): string {
  if (value instanceof Date) return value.toISOString()
  const key = String(value ?? '')
  return key === '' ? 'Value' : key
}

export function getChartSeriesEntries({
  definition,
  values,
  seriesDimension,
  indicators,
  geometries,
  productOutputs,
  availableTimePoints,
  datePrecision,
}: {
  definition: ChartDefinition | null
  values: ChartConfigurationDraft
  seriesDimension: ChartDataDimension
  indicators: readonly ChartTitleIndicator[]
  geometries: readonly ChartTitleGeometry[]
  productOutputs: readonly Record<string, unknown>[]
  availableTimePoints?: readonly (Date | string)[]
  datePrecision: AppearanceConfig['datePrecision']
}): ChartSeriesColorEntry[] {
  if (definition?.type !== 'plot') return []

  const fallbackEntries = (() => {
    if (seriesDimension === 'indicators') {
      const ids = values.indicatorIds
      const selected = ids?.length
        ? indicators.filter((indicator) => {
            const id = indicator.id
            return id ? ids.includes(id) : false
          })
        : indicators
      return selected.map((indicator) => {
        const label = indicator.name ?? indicator.id ?? 'Unknown'
        return { label, overrideKeys: [label] }
      })
    }

    if (seriesDimension === 'geometries') {
      const ids = values.geometryOutputIds
      const selected = ids?.length
        ? geometries.filter((geometry) => ids.includes(geometry.id))
        : geometries
      return selected.map((geometry) => {
        const label = geometry.name ?? geometry.id
        return { label, overrideKeys: [label] }
      })
    }

    const formatter = makeDateFormatter(datePrecision)
    const points =
      values.timePoints && values.timePoints.length > 0
        ? values.timePoints
        : (availableTimePoints ?? [])
    return points.map((timePoint) => {
      const rawKey = String(timePoint)
      const label = formatter.format(new Date(rawKey))
      return {
        label,
        overrideKeys: label === rawKey ? [rawKey] : [rawKey, label],
      }
    })
  })()

  const groupBy: PlotGroupBy | null = getChartSeriesGroupBy(values)
  if (!groupBy || productOutputs.length === 0) return fallbackEntries

  const seriesEntries: ChartSeriesColorEntry[] = []
  const seenKeys = new Set<string>()
  const dateFormatter = makeDateFormatter(datePrecision)

  for (const output of productOutputs) {
    const rawKey = toSeriesKey(output[groupBy])
    if (seenKeys.has(rawKey)) continue
    seenKeys.add(rawKey)

    if (groupBy === 'timePoint') {
      const label = dateFormatter.format(new Date(rawKey))
      seriesEntries.push({
        label,
        overrideKeys: label === rawKey ? [rawKey] : [rawKey, label],
      })
      continue
    }

    seriesEntries.push({
      label: rawKey,
      overrideKeys: [rawKey],
    })
  }

  return seriesEntries.length > 0 ? seriesEntries : fallbackEntries
}

export function suggestTitleForDefinition({
  definition,
  productName,
  values,
  seriesDimension,
  indicators,
  geometries,
  datePrecision,
}: {
  definition: ChartDefinition | null
  productName: string | null | undefined
  values: ChartConfigurationDraft
  seriesDimension: ChartDataDimension
  indicators: readonly ChartTitleIndicator[]
  geometries: readonly ChartTitleGeometry[]
  datePrecision?: AppearanceConfig['datePrecision']
}) {
  return getSuggestedChartTitle({
    productName,
    values,
    seriesDimension,
    indicators,
    geometries,
    titleStrategy: definition?.titleStrategy ?? 'plot',
    datePrecision,
  })
}

export { getChartConfigKey, getChartSeriesGroupBy }
