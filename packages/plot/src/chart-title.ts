import type {
  AppearanceConfig,
  ChartDataDimension,
  DatePrecision,
} from './chart-primitives'
import type { ChartConfigurationDraft } from './chart-core'

export type ChartTitleIndicator = {
  id: string | null | undefined
  name: string | null | undefined
}

export type ChartTitleGeometry = {
  id: string
  name: string | null | undefined
}

export type SuggestedChartTitleContext = {
  productName: string | null | undefined
  values: ChartConfigurationDraft
  seriesDimension: ChartDataDimension
  indicators: readonly ChartTitleIndicator[]
  geometries: readonly ChartTitleGeometry[]
  datePrecision?: AppearanceConfig['datePrecision']
}

function resolveSingleIndicatorName(
  indicators: readonly ChartTitleIndicator[],
  ids: readonly string[] | undefined,
): string | null {
  if (!ids || ids.length !== 1) return null
  const match = indicators.find((indicator) => indicator.id === ids[0])
  return match?.name ?? null
}

function resolveSingleGeometryName(
  geometries: readonly ChartTitleGeometry[],
  ids: readonly string[] | undefined,
): string | null {
  if (!ids || ids.length !== 1) return null
  const match = geometries.find((geometry) => geometry.id === ids[0])
  return match?.name ?? null
}

function resolveTimeLabel(
  timePoint: string | null | undefined,
  datePrecision?: DatePrecision,
): string | null {
  if (!timePoint) return null
  const date = new Date(timePoint)
  if (Number.isNaN(date.getTime())) return null

  if (datePrecision === 'year') {
    return new Intl.DateTimeFormat(undefined, { year: 'numeric' }).format(date)
  }
  if (datePrecision === 'year-month-day') {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date)
  }
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
  }).format(date)
}

function joinTitleParts(parts: readonly (string | null | undefined)[]) {
  return parts.filter((part): part is string => Boolean(part)).join(' — ')
}

/**
 * Suggested title function for standard product-output plots.
 *
 * Chart definitions should reference this directly through `getSuggestedTitle`
 * instead of selecting a string title strategy.
 */
export function suggestPlotChartTitle({
  productName,
  values: chart,
  seriesDimension,
  indicators,
  geometries,
  datePrecision = 'year-month',
}: SuggestedChartTitleContext): string {
  if (!productName) return ''

  const indicatorName = resolveSingleIndicatorName(
    indicators,
    chart.indicatorIds,
  )
  const geometryName = resolveSingleGeometryName(
    geometries,
    chart.geometryOutputIds,
  )
  const timeName =
    chart.timePoints?.length === 1
      ? resolveTimeLabel(chart.timePoints[0], datePrecision)
      : null

  if (seriesDimension === 'geometries') {
    return joinTitleParts([indicatorName, productName, timeName]) || productName
  }
  if (seriesDimension === 'time') {
    return (
      joinTitleParts([indicatorName, productName, geometryName]) || productName
    )
  }
  return joinTitleParts([productName, geometryName, timeName]) || productName
}

/**
 * Suggested title function for map charts.
 */
export function suggestMapChartTitle({
  productName,
  values: chart,
  indicators,
  geometries,
  datePrecision = 'year-month',
}: SuggestedChartTitleContext): string {
  if (!productName) return ''

  const mapIndicatorName =
    indicators.find((indicator) => indicator.id === chart.indicatorId)?.name ??
    null
  const geometryName = resolveSingleGeometryName(
    geometries,
    chart.geometryOutputIds,
  )
  const mapTimeName = resolveTimeLabel(chart.timePoint, datePrecision)

  return (
    joinTitleParts([mapIndicatorName, geometryName, mapTimeName]) || productName
  )
}

/**
 * Suggested title function for table charts.
 */
export function suggestTableChartTitle({
  productName,
  values: chart,
  indicators,
  geometries,
  datePrecision = 'year-month',
}: SuggestedChartTitleContext): string {
  if (!productName) return ''

  const indicatorName = resolveSingleIndicatorName(
    indicators,
    chart.indicatorIds,
  )
  const geometryName = resolveSingleGeometryName(
    geometries,
    chart.geometryOutputIds,
  )
  const timeName =
    chart.timePoints?.length === 1
      ? resolveTimeLabel(chart.timePoints[0], datePrecision)
      : null

  return (
    joinTitleParts([productName, indicatorName, geometryName, timeName]) ||
    productName
  )
}

/**
 * Suggested title function for charts that should use the product name only.
 */
export function suggestProductChartTitle({
  productName,
}: SuggestedChartTitleContext): string {
  return productName ?? ''
}

/**
 * Backward-compatible title helper for existing callers.
 *
 * New chart definitions should choose one of the named title functions above
 * and pass it as `getSuggestedTitle`.
 */
export function getSuggestedChartTitle({
  strategy,
  ...context
}: SuggestedChartTitleContext & {
  strategy: 'plot' | 'map' | 'product' | 'table'
}): string {
  if (strategy === 'map') return suggestMapChartTitle(context)
  if (strategy === 'product') return suggestProductChartTitle(context)
  if (strategy === 'table') return suggestTableChartTitle(context)
  return suggestPlotChartTitle(context)
}
