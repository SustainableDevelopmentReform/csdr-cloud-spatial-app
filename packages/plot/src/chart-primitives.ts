import { z } from '@hono/zod-openapi'

export function values<const TValue extends readonly [string, ...string[]]>(
  ...items: TValue
) {
  return items
}

export function entries<const TValue extends readonly [unknown, ...unknown[]]>(
  ...items: TValue
) {
  return items
}

export const categoricalColorSchemeValues = values(
  'tableau10',
  'category10',
  'paired',
  'set1',
  'set2',
  'set3',
  'dark2',
  'accent',
  'observable10',
)

export const sequentialColorSchemeValues = values(
  'ylOrRd',
  'viridis',
  'plasma',
  'inferno',
  'blues',
  'greens',
  'oranges',
  'ylGnBu',
  'buPu',
)

export const divergingColorSchemeValues = values(
  'rdBu',
  'brBG',
  'piYG',
  'prGn',
  'rdYlGn',
)

export const curveTypeValues = values('monotone', 'linear', 'step')
export const legendPositionValues = values('top', 'bottom', 'none')
export const datePrecisionValues = values(
  'year',
  'year-month',
  'year-month-day',
  'full',
)
export const tableChartDimensionValues = values(
  'timePoint',
  'indicatorName',
  'geometryOutputName',
)
export const chartDataDimensionValues = values(
  'indicators',
  'geometries',
  'time',
)
export const timeChangeModeValues = values('none', 'delta', 'percentDelta')
export const timeChangeBaselineValues = values('firstTimePoint')

export type CategoricalColorScheme =
  (typeof categoricalColorSchemeValues)[number]
export type SequentialColorScheme = (typeof sequentialColorSchemeValues)[number]
export type DivergingColorScheme = (typeof divergingColorSchemeValues)[number]
export type CurveType = (typeof curveTypeValues)[number]
export type LegendPosition = (typeof legendPositionValues)[number]
export type DatePrecision = (typeof datePrecisionValues)[number]
export type TableChartDimension = (typeof tableChartDimensionValues)[number]
export type ChartDataDimension = (typeof chartDataDimensionValues)[number]
export type TimeChangeMode = (typeof timeChangeModeValues)[number]
export type TimeChangeBaseline = (typeof timeChangeBaselineValues)[number]
export type ChartType = 'plot' | 'map' | 'table' | 'kpi'
export type PlotGroupBy = 'geometryOutputName' | 'indicatorName' | 'timePoint'

export const MAX_CHART_SELECTIONS = 100

export const chartTimePointSchema = z.iso
  .datetime()
  .transform((timePoint) => new Date(timePoint).toISOString())

export const appearanceConfigSchema = z
  .object({
    categoricalScheme: z.enum(categoricalColorSchemeValues).optional().openapi({
      description: 'Categorical colour palette used for plot series.',
    }),
    colorOverrides: z.record(z.string(), z.string()).optional().openapi({
      description:
        'Per-series colour overrides keyed by rendered series label.',
    }),
    sequentialScheme: z.enum(sequentialColorSchemeValues).optional().openapi({
      description: 'Sequential colour palette used for table and map scales.',
    }),
    divergingScheme: z.enum(divergingColorSchemeValues).optional().openapi({
      description: 'Diverging colour palette used for table and map scales.',
    }),
    colorScaleType: z.enum(['sequential', 'diverging']).optional(),
    divergingMidpoint: z.number().optional(),
    colorScaleMin: z.number().optional(),
    colorScaleMax: z.number().optional(),
    reverseColorScale: z.boolean().optional(),
    includeZero: z.boolean().optional(),
    yMin: z.number().optional(),
    yMax: z.number().optional(),
    legendPosition: z.enum(legendPositionValues).optional(),
    showGrid: z.boolean().optional(),
    curveType: z.enum(curveTypeValues).optional(),
    showDots: z.boolean().optional(),
    areaOpacity: z.number().min(0).max(1).optional(),
    barRadius: z.number().min(0).max(20).optional(),
    donutInnerRadius: z.number().min(0).max(100).optional(),
    showOutlines: z.boolean().optional(),
    mapBbox: z
      .object({
        minLon: z.number().min(-360).max(360),
        minLat: z.number().min(-90).max(90),
        maxLon: z.number().min(-360).max(360),
        maxLat: z.number().min(-90).max(90),
      })
      .optional(),
    decimalPlaces: z.number().int().min(0).max(6).optional(),
    compactNumbers: z.boolean().optional(),
    datePrecision: z.enum(datePrecisionValues).optional(),
  })
  .openapi('ChartAppearanceSchema', {
    description: 'Presentation settings shared across persisted chart types.',
  })

export type AppearanceConfig = z.infer<typeof appearanceConfigSchema>

export const timeChangeTransformConfigSchema = z
  .object({
    mode: z.enum(timeChangeModeValues).openapi({
      description:
        'Value transform applied before rendering multi-time charts. `none` keeps raw values, `delta` renders step-over-step change, and `percentDelta` renders step-over-step percent change.',
    }),
    baseline: z.enum(timeChangeBaselineValues).openapi({
      description:
        'Compatibility field for time-change transforms. Only `firstTimePoint` is currently accepted in persisted chart JSON.',
    }),
  })
  .openapi('TimeChangeTransformConfigSchema', {
    description:
      'Optional value transform for charts that support change over time.',
  })

export const chartTransformConfigSchema = z
  .object({
    timeChange: timeChangeTransformConfigSchema.optional().openapi({
      description:
        'Optional change-over-time transform applied to raw product-output values before rendering.',
    }),
  })
  .openapi('ChartTransformConfigSchema', {
    description:
      'Data transforms applied before chart rendering. Omitted transforms leave persisted chart behaviour unchanged.',
  })

export type TimeChangeTransformConfig = z.infer<
  typeof timeChangeTransformConfigSchema
>
export type ChartTransformConfig = z.infer<typeof chartTransformConfigSchema>

export const baseChartConfigurationSchema = z
  .object({
    productRunId: z.string().openapi({
      description: 'Product run providing the chart data.',
    }),
    title: z.string().optional().openapi({
      description: 'Optional chart title shown in reports and dashboards.',
    }),
    description: z.string().optional().openapi({
      description: 'Optional chart description shown under the title.',
    }),
    appearance: appearanceConfigSchema.optional(),
    transform: chartTransformConfigSchema.optional().openapi({
      description:
        'Optional data transforms. Omit this field to render the saved raw chart exactly as before.',
    }),
  })
  .openapi('BaseChartConfigurationSchema')

export type BaseChartConfiguration = z.infer<
  typeof baseChartConfigurationSchema
>

export const multiSeriesSelectionSchema = baseChartConfigurationSchema.extend({
  indicatorIds: z
    .array(z.string())
    .max(
      MAX_CHART_SELECTIONS,
      `At most ${MAX_CHART_SELECTIONS} indicators can be selected`,
    )
    .min(1, 'At least one indicator must be selected'),
  geometryOutputIds: z
    .array(z.string())
    .max(
      MAX_CHART_SELECTIONS,
      `At most ${MAX_CHART_SELECTIONS} boundary features can be selected`,
    )
    .optional(),
  timePoints: z.array(chartTimePointSchema).optional(),
})

export const tableChartDimensionMetadata = entries(
  { value: 'timePoint', label: 'Time' },
  { value: 'indicatorName', label: 'Indicator' },
  { value: 'geometryOutputName', label: 'Boundary' },
) satisfies readonly {
  value: TableChartDimension
  label: string
}[]
