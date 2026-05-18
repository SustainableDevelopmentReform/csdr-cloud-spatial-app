import type {
  AppearanceConfig,
  ChartDataDimension,
  DatePrecision,
} from '@repo/plot/chart-primitives'
import type { ChartConfigurationDraft } from '@repo/plot/chart-core'

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
  availableTimePoints?: readonly (Date | string)[]
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
  timePoint: Date | string | null | undefined,
  datePrecision?: DatePrecision,
): string | null {
  if (!timePoint) return null
  const date = timePoint instanceof Date ? timePoint : new Date(timePoint)
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

type TimePointEntry = {
  value: Date | string
  time: number
}

function toTimePointEntry(value: Date | string): TimePointEntry | null {
  const date = value instanceof Date ? value : new Date(value)
  const time = date.getTime()
  if (Number.isNaN(time)) return null
  return { value, time }
}

function resolvePreviousTimePoint(
  timePoint: Date | string | null | undefined,
  availableTimePoints: readonly (Date | string)[] | undefined,
): Date | string | null {
  if (!timePoint || !availableTimePoints) return null
  const current = toTimePointEntry(timePoint)
  if (!current) return null

  const previous = availableTimePoints
    .map(toTimePointEntry)
    .filter((entry): entry is TimePointEntry => entry !== null)
    .filter((entry) => entry.time < current.time)
    .sort((first, second) => second.time - first.time)[0]

  return previous?.value ?? null
}

function resolveTimeChangeRangeLabel({
  timePoint,
  availableTimePoints,
  datePrecision,
}: {
  timePoint: Date | string | null | undefined
  availableTimePoints: readonly (Date | string)[] | undefined
  datePrecision?: DatePrecision
}): string | null {
  const currentLabel = resolveTimeLabel(timePoint, datePrecision)
  const previousLabel = resolveTimeLabel(
    resolvePreviousTimePoint(timePoint, availableTimePoints),
    datePrecision,
  )
  if (!currentLabel || !previousLabel) return null
  return `from ${previousLabel} to ${currentLabel}`
}

function joinTitleParts(parts: readonly (string | null | undefined)[]) {
  return parts.filter((part): part is string => Boolean(part)).join(' — ')
}

function getTimeChangeTitlePrefix(
  {
    values,
    availableTimePoints,
    datePrecision = 'year-month',
  }: SuggestedChartTitleContext,
  options: {
    timePoint?: Date | string | null
  } = {},
): string | null {
  const mode = values.transform?.timeChange?.mode
  const comparisonLabel = options.timePoint
    ? resolveTimeChangeRangeLabel({
        timePoint: options.timePoint,
        availableTimePoints,
        datePrecision,
      })
    : null
  const suffix = comparisonLabel ?? 'from previous time point'

  if (mode === 'delta') return `Change ${suffix}`
  if (mode === 'percentDelta') return `Percent change ${suffix}`
  return null
}

function withTimeChangeTitle(
  title: string,
  context: SuggestedChartTitleContext,
  options: {
    timePoint?: Date | string | null
  } = {},
) {
  const prefix = getTimeChangeTitlePrefix(context, options)
  if (!prefix) return title
  return title ? `${prefix}: ${title}` : prefix
}

/**
 * Suggested title function for standard product-output plots.
 *
 * Chart definitions should reference this directly through `getSuggestedTitle`
 * instead of selecting a string title strategy.
 */
export function suggestPlotChartTitle(
  context: SuggestedChartTitleContext,
): string {
  const {
    productName,
    values: chart,
    seriesDimension,
    indicators,
    geometries,
    datePrecision = 'year-month',
  } = context
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
    return withTimeChangeTitle(
      joinTitleParts([indicatorName, productName, timeName]) || productName,
      context,
    )
  }
  if (seriesDimension === 'time') {
    return withTimeChangeTitle(
      joinTitleParts([indicatorName, productName, geometryName]) || productName,
      context,
    )
  }
  return withTimeChangeTitle(
    joinTitleParts([productName, geometryName, timeName]) || productName,
    context,
  )
}

/**
 * Suggested title function for map charts.
 */
export function suggestMapChartTitle(
  context: SuggestedChartTitleContext,
): string {
  const {
    productName,
    values: chart,
    indicators,
    geometries,
    datePrecision = 'year-month',
  } = context

  const mapIndicatorName =
    indicators.find((indicator) => indicator.id === chart.indicatorId)?.name ??
    null
  const geometryName = resolveSingleGeometryName(
    geometries,
    chart.geometryOutputIds,
  )
  const isTimeChangeTitle = getTimeChangeTitlePrefix(context) !== null
  const mapTimeName = isTimeChangeTitle
    ? null
    : resolveTimeLabel(chart.timePoint, datePrecision)

  return withTimeChangeTitle(
    joinTitleParts([mapIndicatorName, geometryName, mapTimeName]) ||
      productName ||
      '',
    context,
    { timePoint: chart.timePoint },
  )
}

/**
 * Suggested title function for KPI charts.
 */
export function suggestKpiChartTitle(
  context: SuggestedChartTitleContext,
): string {
  const { productName, values: chart, indicators, geometries } = context

  const kpiIndicatorName =
    indicators.find((indicator) => indicator.id === chart.indicatorId)?.name ??
    null
  const geometryName = resolveSingleGeometryName(
    geometries,
    chart.geometryOutputIds,
  )

  return joinTitleParts([kpiIndicatorName, geometryName]) || productName || ''
}

/**
 * Suggested title function for table charts.
 */
export function suggestTableChartTitle(
  context: SuggestedChartTitleContext,
): string {
  const {
    productName,
    values: chart,
    indicators,
    geometries,
    datePrecision = 'year-month',
  } = context
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

  return withTimeChangeTitle(
    joinTitleParts([productName, indicatorName, geometryName, timeName]) ||
      productName,
    context,
  )
}

/**
 * Suggested title function for charts that should use the product name only.
 */
export function suggestProductChartTitle({
  productName,
  ...context
}: SuggestedChartTitleContext): string {
  return withTimeChangeTitle(productName ?? '', {
    productName,
    ...context,
  })
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
  strategy: 'plot' | 'map' | 'product' | 'table' | 'kpi'
}): string {
  if (strategy === 'map') return suggestMapChartTitle(context)
  if (strategy === 'kpi') return suggestKpiChartTitle(context)
  if (strategy === 'product') return suggestProductChartTitle(context)
  if (strategy === 'table') return suggestTableChartTitle(context)
  return suggestPlotChartTitle(context)
}
