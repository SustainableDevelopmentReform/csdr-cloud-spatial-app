import {
  chartConfigurationSchema,
  type ChartConfiguration,
} from '@repo/plot/types'
import { getChartDefinitionForValues } from '@repo/plot/chart-definitions'
import { z } from 'zod'

export const chartFormSchema = z.intersection(
  z.object({
    productId: z.string().optional(),
  }),
  chartConfigurationSchema,
)

export type ChartFormValues = z.infer<typeof chartFormSchema>

export const toPersistedChartConfiguration = (
  values: ChartFormValues,
): ChartConfiguration => {
  const definition = getChartDefinitionForValues(values)
  const timeChangeMode = values.transform?.timeChange?.mode
  const supportsSelectedTimeChange =
    (timeChangeMode === 'delta' || timeChangeMode === 'percentDelta') &&
    definition?.timeChange?.modes.some((mode) => mode === timeChangeMode) ===
      true
  const normalizedValues = !supportsSelectedTimeChange
    ? { ...values, transform: undefined }
    : values

  return chartConfigurationSchema.parse(normalizedValues)
}
