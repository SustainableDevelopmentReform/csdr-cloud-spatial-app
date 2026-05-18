import {
  createPlotConfigurationSchema,
  type PlotSchemaContract,
} from '@repo/plot/chart-definitions/schema-helpers'

export const stackedBarSubType = 'stacked-bar'

export const stackedBarPlotSchemaContract = {
  subType: stackedBarSubType,
  chartLabel: 'Stacked bar chart',
  validationMode: 'cartesian',
} satisfies PlotSchemaContract<typeof stackedBarSubType>

export const stackedBarChartConfigurationSchema = createPlotConfigurationSchema(
  stackedBarPlotSchemaContract,
)
