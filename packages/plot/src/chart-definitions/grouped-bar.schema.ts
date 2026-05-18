import {
  createPlotConfigurationSchema,
  type PlotSchemaContract,
} from '@repo/plot/chart-definitions/schema-helpers'

export const groupedBarSubType = 'grouped-bar'

export const groupedBarPlotSchemaContract = {
  subType: groupedBarSubType,
  chartLabel: 'Grouped bar chart',
  validationMode: 'cartesian',
} satisfies PlotSchemaContract<typeof groupedBarSubType>

export const groupedBarChartConfigurationSchema = createPlotConfigurationSchema(
  groupedBarPlotSchemaContract,
)
