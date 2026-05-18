import { z } from '@hono/zod-openapi'
import {
  baseChartConfigurationSchema,
  chartTimePointSchema,
  multiSeriesSelectionSchema,
  tableChartDimensionValues,
} from '@repo/plot/chart-primitives'

type PlotValidationMode = 'cartesian' | 'singleDimension'

export type PlotSchemaContract<TSubType extends string = string> = {
  subType: TSubType
  chartLabel: string
  validationMode: PlotValidationMode
}

type ChartValidationContext = {
  addIssue(_issue: {
    code: 'custom'
    message: string
    path: (string | number)[]
    input: unknown
  }): void
}

function addSingleDimensionPlotIssues({
  context,
  data,
  chartLabel,
}: {
  context: ChartValidationContext
  data: {
    indicatorIds: string[]
    geometryOutputIds?: string[]
    timePoints?: string[]
  }
  chartLabel: string
}) {
  const multipleIndicatorsSelected = data.indicatorIds.length > 1
  const multipleGeometryOutputsSelected =
    (data.geometryOutputIds?.length ?? 0) > 1 || !data.geometryOutputIds?.length
  const multipleTimePointsSelected =
    (data.timePoints?.length ?? 0) > 1 || !data.timePoints?.length
  const multipleCount =
    (multipleIndicatorsSelected ? 1 : 0) +
    (multipleGeometryOutputsSelected ? 1 : 0) +
    (multipleTimePointsSelected ? 1 : 0)

  if (multipleCount <= 1) return

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

function addCartesianPlotIssues({
  context,
  data,
}: {
  context: ChartValidationContext
  data: {
    indicatorIds: string[]
    geometryOutputIds?: string[]
    timePoints?: string[]
  }
}) {
  const multipleIndicatorsSelected = data.indicatorIds.length > 1
  const multipleGeometryOutputsSelected =
    (data.geometryOutputIds?.length ?? 0) > 1 || !data.geometryOutputIds?.length
  const multipleTimePointsSelected =
    (data.timePoints?.length ?? 0) > 1 || !data.timePoints?.length
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
    return
  }

  if (multipleIndicatorsSelected && multipleGeometryOutputsSelected) {
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
}

/**
 * Builds the persisted schema for a product-output plot subtype.
 *
 * The JSON shape is always the existing persisted plot shape:
 * `{ type: "plot", subType, productRunId, indicatorIds, geometryOutputIds,
 * timePoints, title, description, appearance }`.
 */
export function createPlotConfigurationSchema<const TSubType extends string>({
  subType,
  chartLabel,
  validationMode,
}: {
  subType: TSubType
  chartLabel: string
  validationMode: PlotValidationMode
}) {
  return multiSeriesSelectionSchema
    .extend({
      type: z.literal('plot'),
      subType: z.literal(subType).openapi({
        description: 'Specific plot variant to render.',
      }),
    })
    .superRefine((data, context) => {
      if (validationMode === 'singleDimension') {
        addSingleDimensionPlotIssues({
          context,
          data,
          chartLabel,
        })
        return
      }

      addCartesianPlotIssues({ context, data })
    })
}

/**
 * Builds the public persisted plot schema from chart-owned plot contracts.
 *
 * This keeps the external JSON contract identical to the previous single
 * `type: "plot"` schema while allowing each plot file to own its subtype and
 * validation mode.
 */
export function createUnifiedPlotConfigurationSchema<
  const TSubTypes extends readonly [string, ...string[]],
>({
  subTypes,
  validationModes,
}: {
  subTypes: TSubTypes
  validationModes: readonly PlotSchemaContract<TSubTypes[number]>[]
}) {
  return multiSeriesSelectionSchema
    .extend({
      type: z.literal('plot'),
      subType: z.enum(subTypes).openapi({
        description: 'Specific plot variant to render.',
      }),
    })
    .superRefine((data, context) => {
      const validationMode = validationModes.find(
        (candidate) => candidate.subType === data.subType,
      )

      if (validationMode?.validationMode === 'singleDimension') {
        addSingleDimensionPlotIssues({
          context,
          data,
          chartLabel: validationMode.chartLabel,
        })
        return
      }

      addCartesianPlotIssues({ context, data })
    })
    .openapi('PlotChartConfigurationSchema', {
      description:
        'Cartesian and single-dimension plot charts. Validation messages explain when multiple selections are not compatible with the selected plot subtype.',
    })
}

/**
 * Builds the persisted schema for map charts without changing the stored JSON
 * contract used by reports, dashboards, and product-run map defaults.
 */
export function createMapConfigurationSchema() {
  return baseChartConfigurationSchema
    .extend({
      type: z.literal('map'),
      indicatorId: z.string().openapi({
        description: 'Map charts require exactly one indicator selection.',
      }),
      timePoint: chartTimePointSchema.openapi({
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
}

/**
 * Builds the persisted schema for KPI cards while keeping the existing JSON
 * shape and validation messages.
 */
export function createKpiConfigurationSchema() {
  return baseChartConfigurationSchema
    .extend({
      type: z.literal('kpi'),
      indicatorId: z.string().openapi({
        description: 'KPI cards require exactly one indicator selection.',
      }),
      timePoint: chartTimePointSchema.openapi({
        description: 'KPI cards require exactly one time point selection.',
      }),
      geometryOutputIds: z
        .array(z.string())
        .min(1, 'KPI requires a selected boundary')
        .max(1, 'KPI requires exactly one boundary')
        .openapi({
          description:
            'KPI cards require exactly one selected boundary feature.',
        }),
    })
    .openapi('KpiChartConfigurationSchema', {
      description:
        'Single highlighted value for one indicator, boundary, and time point.',
    })
}

/**
 * Builds the persisted schema for table charts. The axis-specific validation
 * is generic table behavior, so table chart files only choose this helper.
 */
export function createTableConfigurationSchema() {
  return multiSeriesSelectionSchema
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
        data.xDimension === 'indicatorName' ||
        data.yDimension === 'indicatorName'
      if (!allowsMultipleIndicators && multipleIndicatorsSelected) {
        context.addIssue({
          code: 'custom',
          message:
            'Indicator is not used as a table axis, one must be selected.',
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
}
