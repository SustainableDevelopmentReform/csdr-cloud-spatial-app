import { MouseEvent as ReactMouseEvent } from 'react'

export type BaseChartConfiguration = {
  title?: string
  description?: string
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
