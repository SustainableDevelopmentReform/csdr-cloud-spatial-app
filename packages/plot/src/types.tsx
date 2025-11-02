export type BaseChartConfiguration = {
  title?: string
  description?: string
}

export type PlotChartConfiguration = {
  type: 'plot'
  subType: 'line' | 'bar' | 'grouped-bar' | 'dot'
  productRunId: string
  variableIds?: string[]
  geometryOutputIds?: string[]
  timePoints?: string[]
} & BaseChartConfiguration

export type MapChartConfiguration = {
  type: 'map'
  productRunId: string
  variableId: string
  timePoint: string
  geometryOutputIds?: string[]
} & BaseChartConfiguration

export type TableChartDimension =
  | 'timePoint'
  | 'variableName'
  | 'geometryOutputName'

export type TableChartConfiguration = {
  type: 'table'
  productRunId: string
  variableIds?: string[]
  geometryOutputIds?: string[]
  xDimension: TableChartDimension
  yDimension: TableChartDimension
  timePoints?: string[]
} & BaseChartConfiguration

export type ChartConfiguration =
  | PlotChartConfiguration
  | MapChartConfiguration
  | TableChartConfiguration
