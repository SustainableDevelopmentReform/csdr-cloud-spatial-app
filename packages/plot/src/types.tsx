import type { AppearanceConfig } from './chart-core'
import { rgb } from 'd3-color'
import type { Dispatch, MouseEvent as ReactMouseEvent } from 'react'

// ---------------------------------------------------------------------------
// INVARIANT — 1:1 mapping from chart elements to product outputs
// ---------------------------------------------------------------------------
//
// Every visual element in a chart (dot, bar segment, line point, donut slice,
// table cell, map polygon value) MUST correspond to exactly one product output.
// No aggregation, summarisation, or overwriting is ever performed.
//
// For cartesian charts (line, area, bar, scatter):
//   - At most 2 dimensions can vary (time as x-axis + one series dimension).
//   - The remaining dimension must be fixed to a single value.
//
// For single-x charts (donut, ranked-bar):
//   - Exactly 1 dimension can vary (the series dimension).
//   - The other two must each be fixed to a single value.
//
// For tables:
//   - The x and y axes each represent one dimension; the third must be single.
//
// For maps:
//   - A single indicator and single time point are selected.
//
// Validation (chart-owned schemas composed by @repo/plot/chart-core) and the pivotData
// function enforce this invariant. If pivotData detects a collision
// (duplicate (x, groupBy) combination) it returns an error — no values are
// ever summarised, aggregated, or silently dropped.
// ---------------------------------------------------------------------------

export type {
  AppearanceConfig,
  BaseChartConfiguration,
  CategoricalColorScheme,
  ChartConfigurationDraft,
  ChartConfiguration,
  ChartDataDimension,
  ChartIndicatorSelection,
  ChartTitleGeometry,
  ChartTitleIndicator,
  ChartType,
  CurveType,
  DatePrecision,
  DivergingColorScheme,
  KpiChartConfiguration,
  LegendPosition,
  MapChartConfiguration,
  PlotChartConfiguration,
  PlotGroupBy,
  PlotSubType,
  SequentialColorScheme,
  TableChartConfiguration,
  TableChartDimension,
} from './chart-core'

export {
  appearanceConfigSchema,
  baseChartConfigurationSchema,
  categoricalColorSchemeValues,
  chartConfigurationSchema,
  chartDataDimensionValues,
  curveTypeValues,
  datePrecisionValues,
  divergingColorSchemeValues,
  extractChartIndicatorSelection,
  getChartConfigKey,
  getChartSeriesGroupBy,
  getPlotChartGroupBy,
  getSuggestedChartTitle,
  kpiChartConfigurationSchema,
  legendPositionValues,
  mapChartConfigurationSchema,
  plotChartConfigurationSchema,
  plotSubTypeValues,
  sequentialColorSchemeValues,
  tableChartConfigurationSchema,
  tableChartDimensionMetadata,
  tableChartDimensionValues,
} from './chart-core'

export type SelectedDataPoint<T> = {
  dataPoint: T | null
  event: MouseEvent | ReactMouseEvent
}

export type OnSelectCallback<T> = Dispatch<SelectedDataPoint<T>>

// ---------------------------------------------------------------------------
// Shared formatters
// ---------------------------------------------------------------------------

export function makeNumberFormatter(
  decimalPlaces?: number,
  compact?: boolean,
): Intl.NumberFormat {
  const opts: Intl.NumberFormatOptions = {
    notation: compact ? 'compact' : undefined,
  }
  if (decimalPlaces !== undefined) {
    opts.maximumFractionDigits = decimalPlaces
  } else if (!compact) {
    opts.maximumFractionDigits = 3
  }
  return new Intl.NumberFormat(undefined, opts)
}

export function makeDateFormatter(
  precision?: AppearanceConfig['datePrecision'],
): Intl.DateTimeFormat {
  switch (precision) {
    case 'year':
      return new Intl.DateTimeFormat(undefined, { year: 'numeric' })
    case 'year-month':
      return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
      })
    case 'year-month-day':
      return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    case 'full':
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    default:
      return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
      })
  }
}

const LIGHT_TEXT_COLOR = '#F9FAFB'
const DARK_TEXT_COLOR = '#111827'

function getRelativeLuminance(r: number, g: number, b: number) {
  const linearize = (channel: number) => {
    if (channel <= 0.04045) {
      return channel / 12.92
    }
    return Math.pow((channel + 0.055) / 1.055, 2.4)
  }
  const linearR = linearize(r)
  const linearG = linearize(g)
  const linearB = linearize(b)
  return 0.2126 * linearR + 0.7152 * linearG + 0.0722 * linearB
}

/** Return a contrasting text colour (light or dark) for the given background. */
export function getContrastingTextColor(color: string) {
  const parsedColor = rgb(color)
  if (!parsedColor.displayable()) {
    return DARK_TEXT_COLOR
  }
  const { r, g, b } = parsedColor
  const luminance = getRelativeLuminance(r / 255, g / 255, b / 255)
  return luminance > 0.5 ? DARK_TEXT_COLOR : LIGHT_TEXT_COLOR
}
