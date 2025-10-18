export type PlotChartConfiguration = {
  type: 'plot'
  subType: 'line' | 'bar' | 'grouped-bar' | 'dot'
  title?: string
  description?: string
  productRunId: string
  variableIds?: string[]
  geometryOutputIds?: string[]
}

export type MapChartConfiguration = {
  type: 'map'
  title?: string
  description?: string
  productRunId: string
  variableId: string
  timePoint: string
}

export type TableChartGroupBy = 'variableName' | 'geometryOutputName'

export type TableChartConfiguration = {
  type: 'table'
  title?: string
  description?: string
  productRunId: string
  variableIds?: string[]
  geometryOutputIds?: string[]
  groupBy: TableChartGroupBy
}

export type ChartConfiguration =
  | PlotChartConfiguration
  | MapChartConfiguration
  | TableChartConfiguration
