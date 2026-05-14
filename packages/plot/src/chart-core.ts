import { z } from '@hono/zod-openapi'

function values<const TValue extends readonly [string, ...string[]]>(
  ...items: TValue
) {
  return items
}

function entries<const TValue extends readonly [unknown, ...unknown[]]>(
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
export const plotSubTypeValues = values(
  'line',
  'area',
  'stacked-area',
  'stacked-bar',
  'grouped-bar',
  'ranked-bar',
  'dot',
  'donut',
  'sample',
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

export type CategoricalColorScheme =
  (typeof categoricalColorSchemeValues)[number]
export type SequentialColorScheme = (typeof sequentialColorSchemeValues)[number]
export type DivergingColorScheme = (typeof divergingColorSchemeValues)[number]
export type CurveType = (typeof curveTypeValues)[number]
export type LegendPosition = (typeof legendPositionValues)[number]
export type DatePrecision = (typeof datePrecisionValues)[number]
export type PlotSubType = (typeof plotSubTypeValues)[number]
export type TableChartDimension = (typeof tableChartDimensionValues)[number]
export type ChartDataDimension = (typeof chartDataDimensionValues)[number]
export type ChartType = 'plot' | 'map' | 'table' | 'kpi'
export type PlotGroupBy = 'geometryOutputName' | 'indicatorName' | 'timePoint'

const MAX_CLASSES = 100

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
  })
  .openapi('BaseChartConfigurationSchema')

export type BaseChartConfiguration = z.infer<
  typeof baseChartConfigurationSchema
>

const multiSeriesSelectionSchema = baseChartConfigurationSchema.extend({
  indicatorIds: z
    .array(z.string())
    .max(MAX_CLASSES, `At most ${MAX_CLASSES} indicators can be selected`)
    .min(1, 'At least one indicator must be selected'),
  geometryOutputIds: z
    .array(z.string())
    .max(
      MAX_CLASSES,
      `At most ${MAX_CLASSES} boundary features can be selected`,
    )
    .optional(),
  timePoints: z.array(z.string()).optional(),
})

export const plotChartConfigurationSchema = multiSeriesSelectionSchema
  .extend({
    type: z.literal('plot'),
    subType: z.enum(plotSubTypeValues).openapi({
      description: 'Specific plot variant to render.',
    }),
  })
  .superRefine((data, context) => {
    const multipleIndicatorsSelected = data.indicatorIds.length > 1
    const multipleGeometryOutputsSelected =
      (data.geometryOutputIds?.length ?? 0) > 1 ||
      !data.geometryOutputIds?.length
    const multipleTimePointsSelected =
      (data.timePoints?.length ?? 0) > 1 || !data.timePoints?.length

    if (data.subType === 'donut' || data.subType === 'ranked-bar') {
      const chartLabel =
        data.subType === 'donut' ? 'Donut chart' : 'Ranked bar chart'
      const multipleCount =
        (multipleIndicatorsSelected ? 1 : 0) +
        (multipleGeometryOutputsSelected ? 1 : 0) +
        (multipleTimePointsSelected ? 1 : 0)

      if (multipleCount > 1) {
        if (multipleIndicatorsSelected) {
          context.addIssue({
            code: 'custom',
            message: `${chartLabel} can only vary one dimension — select a single indicator`,
            path: ['indicatorIds'],
            input: data.indicatorIds,
          })
        }
        if (multipleGeometryOutputsSelected) {
          context.addIssue({
            code: 'custom',
            message: `${chartLabel} can only vary one dimension — select a single boundary`,
            path: ['geometryOutputIds'],
            input: data.geometryOutputIds,
          })
        }
        if (multipleTimePointsSelected) {
          context.addIssue({
            code: 'custom',
            message: `${chartLabel} can only vary one dimension — select a single time point`,
            path: ['timePoints'],
            input: data.timePoints,
          })
        }
      }
      return
    }

    const multiCount =
      (multipleIndicatorsSelected ? 1 : 0) +
      (multipleGeometryOutputsSelected ? 1 : 0) +
      (multipleTimePointsSelected ? 1 : 0)

    if (multiCount > 2) {
      context.addIssue({
        code: 'custom',
        message:
          'Each chart element must map to one product output — select a single indicator',
        path: ['indicatorIds'],
        input: data.indicatorIds,
      })
      context.addIssue({
        code: 'custom',
        message:
          'Each chart element must map to one product output — select a single boundary',
        path: ['geometryOutputIds'],
        input: data.geometryOutputIds,
      })
      context.addIssue({
        code: 'custom',
        message:
          'Each chart element must map to one product output — select a single time point',
        path: ['timePoints'],
        input: data.timePoints,
      })
    } else if (multipleIndicatorsSelected && multipleGeometryOutputsSelected) {
      context.addIssue({
        code: 'custom',
        message:
          'Each chart element must map to one product output — select a single indicator or a single boundary',
        path: ['indicatorIds'],
        input: data.indicatorIds,
      })
      context.addIssue({
        code: 'custom',
        message:
          'Each chart element must map to one product output — select a single indicator or a single boundary',
        path: ['geometryOutputIds'],
        input: data.geometryOutputIds,
      })
    }
  })
  .openapi('PlotChartConfigurationSchema', {
    description:
      'Cartesian and single-dimension plot charts. Validation messages explain when multiple selections are not compatible with the selected plot subtype.',
  })

export type PlotChartConfiguration = z.infer<
  typeof plotChartConfigurationSchema
>

export const mapChartConfigurationSchema = baseChartConfigurationSchema
  .extend({
    type: z.literal('map'),
    indicatorId: z.string().openapi({
      description: 'Map charts require exactly one indicator selection.',
    }),
    timePoint: z.string().openapi({
      description: 'Map charts require exactly one time point selection.',
    }),
    geometryOutputIds: z
      .array(z.string())
      .max(10, 'At most 10 boundary features can be selected')
      .optional()
      .openapi({
        description:
          'Optional boundary filter for zooming or limiting the map view.',
      }),
  })
  .openapi('MapChartConfigurationSchema', {
    description:
      'Spatial map view for a single indicator at a single time point.',
  })

export type MapChartConfiguration = z.infer<typeof mapChartConfigurationSchema>

export const kpiChartConfigurationSchema = baseChartConfigurationSchema
  .extend({
    type: z.literal('kpi'),
    indicatorId: z.string().openapi({
      description: 'KPI cards require exactly one indicator selection.',
    }),
    timePoint: z.string().openapi({
      description: 'KPI cards require exactly one time point selection.',
    }),
    geometryOutputIds: z
      .array(z.string())
      .min(1, 'KPI requires a selected boundary')
      .max(1, 'KPI requires exactly one boundary')
      .openapi({
        description: 'KPI cards require exactly one selected boundary feature.',
      }),
  })
  .openapi('KpiChartConfigurationSchema', {
    description:
      'Single highlighted value for one indicator, boundary, and time point.',
  })

export type KpiChartConfiguration = z.infer<typeof kpiChartConfigurationSchema>

export const tableChartConfigurationSchema = multiSeriesSelectionSchema
  .extend({
    type: z.literal('table'),
    xDimension: z.enum(tableChartDimensionValues),
    yDimension: z.enum(tableChartDimensionValues),
  })
  .superRefine((data, context) => {
    const multipleIndicatorsSelected = data.indicatorIds.length > 1
    const multipleGeometryOutputsSelected =
      (data.geometryOutputIds?.length ?? 0) > 1 ||
      !data.geometryOutputIds?.length
    const multipleTimePointsSelected =
      (data.timePoints?.length ?? 0) > 1 || !data.timePoints?.length

    const allowsMultipleIndicators =
      data.xDimension === 'indicatorName' || data.yDimension === 'indicatorName'
    if (!allowsMultipleIndicators && multipleIndicatorsSelected) {
      context.addIssue({
        code: 'custom',
        message: 'Indicator is not used as a table axis, one must be selected.',
        path: ['indicatorIds'],
        input: data.indicatorIds,
      })
    }

    const allowsMultipleGeometry =
      data.xDimension === 'geometryOutputName' ||
      data.yDimension === 'geometryOutputName'
    if (!allowsMultipleGeometry && multipleGeometryOutputsSelected) {
      context.addIssue({
        code: 'custom',
        message:
          'Boundary feature is not used as a table axis, one must be selected.',
        path: ['geometryOutputIds'],
        input: data.geometryOutputIds,
      })
    }

    const allowsMultipleTimePoints =
      data.xDimension === 'timePoint' || data.yDimension === 'timePoint'
    if (!allowsMultipleTimePoints && multipleTimePointsSelected) {
      context.addIssue({
        code: 'custom',
        message:
          'Time point is not used as a table axis, one must be selected.',
        path: ['timePoints'],
        input: data.timePoints,
      })
    }
  })
  .openapi('TableChartConfigurationSchema', {
    description:
      'Colour-coded table view. Dimensions not placed on an axis must be narrowed to a single selection.',
  })

export type TableChartConfiguration = z.infer<
  typeof tableChartConfigurationSchema
>

export const chartConfigurationSchema = z
  .discriminatedUnion('type', [
    plotChartConfigurationSchema,
    mapChartConfigurationSchema,
    kpiChartConfigurationSchema,
    tableChartConfigurationSchema,
  ])
  .openapi('ChartConfigurationSchema', {
    description:
      'Persisted chart configuration used by report chart nodes and dashboard cards.',
  })

export type ChartConfiguration = z.infer<typeof chartConfigurationSchema>

export type ChartIndicatorSelection = {
  productRunId: string
  indicatorIds: string[]
}

export const tableChartDimensionMetadata = entries(
  { value: 'timePoint', label: 'Time' },
  { value: 'indicatorName', label: 'Indicator' },
  { value: 'geometryOutputName', label: 'Boundary' },
) satisfies readonly {
  value: TableChartDimension
  label: string
}[]

export type ChartConfigurationDraft = Partial<{
  productId: string
  productRunId: string
  type: ChartType
  subType: PlotSubType
  indicatorId: string | null
  indicatorIds: string[]
  geometryOutputIds: string[]
  timePoint: string | null
  timePoints: string[]
  xDimension: TableChartDimension
  yDimension: TableChartDimension
  title: string
  description: string
  appearance: AppearanceConfig
}>

export function getChartConfigKey(
  values: Pick<ChartConfigurationDraft, 'type' | 'subType'>,
): string | null {
  if (values.type === 'plot') return values.subType ?? null
  if (values.type === 'map') return 'map'
  if (values.type === 'table') return 'table'
  if (values.type === 'kpi') return 'kpi'
  return null
}

export function getPlotChartGroupBy({
  geometryOutputIds,
  indicatorIds,
  timePoints,
}: Pick<
  PlotChartConfiguration,
  'geometryOutputIds' | 'indicatorIds' | 'timePoints'
>): PlotGroupBy {
  const geoMulti = !geometryOutputIds || geometryOutputIds.length > 1
  const indMulti = !indicatorIds || indicatorIds.length > 1
  const timeMulti = !timePoints || timePoints.length > 1

  if (geoMulti) return 'geometryOutputName'
  if (indMulti) return 'indicatorName'
  if (timeMulti) return 'timePoint'
  return 'indicatorName'
}

export function getChartSeriesGroupBy(
  values: Pick<
    ChartConfigurationDraft,
    'type' | 'subType' | 'geometryOutputIds' | 'indicatorIds' | 'timePoints'
  >,
): PlotGroupBy | null {
  if (values.type !== 'plot') return null
  return getPlotChartGroupBy({
    geometryOutputIds: values.geometryOutputIds,
    indicatorIds: values.indicatorIds ?? [],
    timePoints: values.timePoints,
  })
}

const dedupeIndicatorIds = (indicatorIds: string[]): string[] =>
  Array.from(new Set(indicatorIds))

export function extractChartIndicatorSelection(
  chart: ChartConfiguration,
): ChartIndicatorSelection {
  if (chart.type === 'plot' || chart.type === 'table') {
    return {
      productRunId: chart.productRunId,
      indicatorIds: dedupeIndicatorIds(chart.indicatorIds),
    }
  }

  return {
    productRunId: chart.productRunId,
    indicatorIds: [chart.indicatorId],
  }
}

export type ChartTitleIndicator = {
  id: string | null | undefined
  name: string | null | undefined
}

export type ChartTitleGeometry = {
  id: string
  name: string | null | undefined
}

function resolveSingleIndicatorName(
  indicators: readonly ChartTitleIndicator[],
  ids: readonly string[] | undefined,
): string | null {
  if (!ids || ids.length !== 1) return null
  const match = indicators.find((indicator) => indicator.id === ids[0])
  return match?.name ?? null
}

function resolveSingleGeometryName(
  geometries: readonly ChartTitleGeometry[],
  ids: readonly string[] | undefined,
): string | null {
  if (!ids || ids.length !== 1) return null
  const match = geometries.find((geometry) => geometry.id === ids[0])
  return match?.name ?? null
}

function resolveTimeLabel(
  timePoint: string | null | undefined,
  datePrecision?: DatePrecision,
): string | null {
  if (!timePoint) return null
  const date = new Date(timePoint)
  if (Number.isNaN(date.getTime())) return null

  if (datePrecision === 'year') {
    return new Intl.DateTimeFormat(undefined, { year: 'numeric' }).format(date)
  }
  if (datePrecision === 'year-month-day') {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date)
  }
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
  }).format(date)
}

function joinTitleParts(parts: readonly (string | null | undefined)[]) {
  return parts.filter((part): part is string => Boolean(part)).join(' — ')
}

export function getSuggestedChartTitle({
  productName,
  values: chart,
  seriesDimension,
  indicators,
  geometries,
  titleStrategy,
  datePrecision = 'year-month',
}: {
  productName: string | null | undefined
  values: ChartConfigurationDraft
  seriesDimension: ChartDataDimension
  indicators: readonly ChartTitleIndicator[]
  geometries: readonly ChartTitleGeometry[]
  titleStrategy: 'plot' | 'map' | 'product' | 'table'
  datePrecision?: DatePrecision
}): string {
  if (!productName) return ''

  const indicatorName = resolveSingleIndicatorName(
    indicators,
    chart.indicatorIds,
  )
  const geometryName = resolveSingleGeometryName(
    geometries,
    chart.geometryOutputIds,
  )
  const timeName =
    chart.timePoints?.length === 1
      ? resolveTimeLabel(chart.timePoints[0], datePrecision)
      : null

  if (titleStrategy === 'map') {
    const mapIndicatorName =
      indicators.find((indicator) => indicator.id === chart.indicatorId)
        ?.name ?? null
    const mapTimeName = resolveTimeLabel(chart.timePoint, datePrecision)
    return (
      joinTitleParts([mapIndicatorName, geometryName, mapTimeName]) ||
      productName
    )
  }

  if (titleStrategy === 'product') return productName

  if (titleStrategy === 'table') {
    return (
      joinTitleParts([productName, indicatorName, geometryName, timeName]) ||
      productName
    )
  }

  if (seriesDimension === 'geometries') {
    return joinTitleParts([indicatorName, productName, timeName]) || productName
  }
  if (seriesDimension === 'time') {
    return (
      joinTitleParts([indicatorName, productName, geometryName]) || productName
    )
  }
  return joinTitleParts([productName, geometryName, timeName]) || productName
}
