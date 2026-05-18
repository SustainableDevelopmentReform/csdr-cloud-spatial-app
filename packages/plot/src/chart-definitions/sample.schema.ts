import { z } from '@hono/zod-openapi'
import { multiSeriesSelectionSchema } from '@repo/plot/chart-primitives'
import type { PlotSchemaContract } from '@repo/plot/chart-definitions/schema-helpers'

export const sampleSubType = 'sample'

// Pure persisted schema contract. This file is safe for server/shared schema
// imports because it contains no React code.
export const samplePlotSchemaContract = {
  subType: sampleSubType,
  chartLabel: 'Sample chart',
  validationMode: 'cartesian',
} satisfies PlotSchemaContract<typeof sampleSubType>

export const sampleChartConfigurationSchema = multiSeriesSelectionSchema.extend(
  {
    type: z.literal('plot'),
    subType: z.literal(sampleSubType),
    sampleOption: z.string().optional(),
  },
)
