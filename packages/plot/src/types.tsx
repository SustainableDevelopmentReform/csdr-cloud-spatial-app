export type LinePlotChartConfiguration = {
  type: 'linePlot'
  title?: string
  description?: string
  productRunId: string
  variableId: string
  geometryOutputId: string
}

export type MapChartConfiguration = {
  type: 'map'
  title?: string
  description?: string
  productRunId: string
  variableId: string
  timePoint: string
}

export type ChartConfiguration =
  | LinePlotChartConfiguration
  | MapChartConfiguration
