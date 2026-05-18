import {
  createPlotConfigurationSchema,
  type PlotSchemaContract,
} from './schema-helpers'

export const areaSubType = 'area'

export const areaPlotSchemaContract = {
  subType: areaSubType,
  chartLabel: 'Area chart',
  validationMode: 'cartesian',
} satisfies PlotSchemaContract<typeof areaSubType>

export const areaChartConfigurationSchema = createPlotConfigurationSchema(
  areaPlotSchemaContract,
)
