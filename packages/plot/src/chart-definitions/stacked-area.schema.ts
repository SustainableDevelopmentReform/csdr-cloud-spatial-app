import {
  createPlotConfigurationSchema,
  type PlotSchemaContract,
} from '@repo/plot/chart-definitions/schema-helpers'

export const stackedAreaSubType = 'stacked-area'

export const stackedAreaPlotSchemaContract = {
  subType: stackedAreaSubType,
  chartLabel: 'Stacked area chart',
  validationMode: 'cartesian',
} satisfies PlotSchemaContract<typeof stackedAreaSubType>

export const stackedAreaChartConfigurationSchema =
  createPlotConfigurationSchema(stackedAreaPlotSchemaContract)
