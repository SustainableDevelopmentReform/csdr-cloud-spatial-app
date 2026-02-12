import { rgb } from 'd3-color'
import { MouseEvent as ReactMouseEvent } from 'react'

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
// Validation (superRefine in chart-form-dialog.tsx) and the pivotData function
// enforce this invariant.  If pivotData detects a collision (duplicate
// (x, groupBy) combination) it returns an error — no values are ever
// summarised, aggregated, or silently dropped.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Colour scheme types
// ---------------------------------------------------------------------------

export type CategoricalColorScheme =
  | 'tableau10'
  | 'category10'
  | 'paired'
  | 'set1'
  | 'set2'
  | 'set3'
  | 'dark2'
  | 'accent'
  | 'observable10'

export type SequentialColorScheme =
  | 'ylOrRd'
  | 'viridis'
  | 'plasma'
  | 'inferno'
  | 'blues'
  | 'greens'
  | 'oranges'
  | 'ylGnBu'
  | 'buPu'

export type DivergingColorScheme = 'rdBu' | 'brBG' | 'piYG' | 'prGn' | 'rdYlGn'

// ---------------------------------------------------------------------------
// Appearance configuration
// ---------------------------------------------------------------------------

export type CurveType = 'monotone' | 'linear' | 'step'

export type LegendPosition = 'top' | 'bottom' | 'none'

export type AppearanceConfig = {
  // Categorical colours (plot charts)
  categoricalScheme?: CategoricalColorScheme
  colorOverrides?: Record<string, string>

  // Sequential / diverging colours (table, map)
  sequentialScheme?: SequentialColorScheme
  divergingScheme?: DivergingColorScheme
  colorScaleType?: 'sequential' | 'diverging'
  divergingMidpoint?: number
  colorScaleMin?: number
  colorScaleMax?: number
  reverseColorScale?: boolean

  // Y-axis
  includeZero?: boolean
  yMin?: number
  yMax?: number

  // Legend
  legendPosition?: LegendPosition

  // Grid
  showGrid?: boolean

  // Line / Area
  curveType?: CurveType
  showDots?: boolean
  areaOpacity?: number

  // Bar
  barRadius?: number

  // Donut
  donutInnerRadius?: number // percentage 0-100, default 50

  // Map-specific
  showOutlines?: boolean
  mapBbox?: {
    minLon: number
    minLat: number
    maxLon: number
    maxLat: number
  }

  // Formatting
  decimalPlaces?: number
  compactNumbers?: boolean
  datePrecision?: 'year' | 'year-month' | 'year-month-day' | 'full'
}

// ---------------------------------------------------------------------------
// Chart configuration types
// ---------------------------------------------------------------------------

export type BaseChartConfiguration = {
  title?: string
  description?: string
  appearance?: AppearanceConfig
}

export type PlotSubType =
  | 'line'
  | 'area'
  | 'stacked-area'
  | 'stacked-bar'
  | 'grouped-bar'
  | 'ranked-bar'
  | 'dot'
  | 'donut'

export type PlotChartConfiguration = {
  type: 'plot'
  subType: PlotSubType
  productRunId: string
  indicatorIds?: string[]
  geometryOutputIds?: string[]
  timePoints?: string[]
} & BaseChartConfiguration

export type MapChartConfiguration = {
  type: 'map'
  productRunId: string
  indicatorId: string
  timePoint: string
  geometryOutputIds?: string[]
} & BaseChartConfiguration

export type TableChartDimension =
  | 'timePoint'
  | 'indicatorName'
  | 'geometryOutputName'

export type TableChartConfiguration = {
  type: 'table'
  productRunId: string
  indicatorIds?: string[]
  geometryOutputIds?: string[]
  xDimension: TableChartDimension
  yDimension: TableChartDimension
  timePoints?: string[]
} & BaseChartConfiguration

export type ChartConfiguration =
  | PlotChartConfiguration
  | MapChartConfiguration
  | TableChartConfiguration

export type SelectedDataPoint<T> = {
  dataPoint: T | null
  event: MouseEvent | ReactMouseEvent
}

export type OnSelectCallback<T> = (
  selectedDataPoint: SelectedDataPoint<T>,
) => void

// ---------------------------------------------------------------------------
// Shared formatters
// ---------------------------------------------------------------------------

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
  const values: [number, number, number] = [r, g, b].map((channel) => {
    if (channel <= 0.04045) {
      return channel / 12.92
    }
    return Math.pow((channel + 0.055) / 1.055, 2.4)
  }) as [number, number, number]
  const [linearR, linearG, linearB] = values
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
