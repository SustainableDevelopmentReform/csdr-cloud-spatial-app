import {
  createPlotConfigurationSchema,
  type PlotSchemaContract,
} from './schema-helpers'

export const dotSubType = 'dot'

export const dotPlotSchemaContract = {
  subType: dotSubType,
  chartLabel: 'Scatter chart',
  validationMode: 'cartesian',
} satisfies PlotSchemaContract<typeof dotSubType>

export const dotChartConfigurationSchema = createPlotConfigurationSchema(
  dotPlotSchemaContract,
)
