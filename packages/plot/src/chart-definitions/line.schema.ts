import {
  createPlotConfigurationSchema,
  type PlotSchemaContract,
} from '@repo/plot/chart-definitions/schema-helpers'

export const lineSubType = 'line'

export const linePlotSchemaContract = {
  subType: lineSubType,
  chartLabel: 'Line chart',
  validationMode: 'cartesian',
} satisfies PlotSchemaContract<typeof lineSubType>

export const lineChartConfigurationSchema = createPlotConfigurationSchema(
  linePlotSchemaContract,
)
