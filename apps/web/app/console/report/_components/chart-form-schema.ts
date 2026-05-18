import {
  chartConfigurationSchema,
  type ChartConfiguration,
} from '@repo/plot/types'
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
  const normalizedValues =
    values.transform?.timeChange?.mode === 'none'
      ? { ...values, transform: undefined }
      : values

  return chartConfigurationSchema.parse(normalizedValues)
}
