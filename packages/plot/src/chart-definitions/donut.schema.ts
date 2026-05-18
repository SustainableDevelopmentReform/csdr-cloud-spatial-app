import {
  createPlotConfigurationSchema,
  type PlotSchemaContract,
} from './schema-helpers'

export const donutSubType = 'donut'

export const donutPlotSchemaContract = {
  subType: donutSubType,
  chartLabel: 'Donut chart',
  validationMode: 'singleDimension',
} satisfies PlotSchemaContract<typeof donutSubType>

export const donutChartConfigurationSchema = createPlotConfigurationSchema(
  donutPlotSchemaContract,
)
