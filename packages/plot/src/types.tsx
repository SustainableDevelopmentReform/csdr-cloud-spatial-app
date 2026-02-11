import { MouseEvent as ReactMouseEvent } from 'react'

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
