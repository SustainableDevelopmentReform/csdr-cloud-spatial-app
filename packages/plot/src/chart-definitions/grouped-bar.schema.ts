import {
  createPlotConfigurationSchema,
  type PlotSchemaContract,
} from './schema-helpers'

export const groupedBarSubType = 'grouped-bar'

export const groupedBarPlotSchemaContract = {
  subType: groupedBarSubType,
  chartLabel: 'Grouped bar chart',
  validationMode: 'cartesian',
} satisfies PlotSchemaContract<typeof groupedBarSubType>

export const groupedBarChartConfigurationSchema = createPlotConfigurationSchema(
  groupedBarPlotSchemaContract,
)
