import {
  createPlotConfigurationSchema,
  type PlotSchemaContract,
} from './schema-helpers'

export const rankedBarSubType = 'ranked-bar'

export const rankedBarPlotSchemaContract = {
  subType: rankedBarSubType,
  chartLabel: 'Ranked bar chart',
  validationMode: 'singleDimension',
} satisfies PlotSchemaContract<typeof rankedBarSubType>

export const rankedBarChartConfigurationSchema = createPlotConfigurationSchema(
  rankedBarPlotSchemaContract,
)
