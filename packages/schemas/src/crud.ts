import { z } from '@hono/zod-openapi'
import { MultiPolygonSchema, PolygonSchema } from './geojson'

export const baseQuerySchema = z.object({
  page: z.coerce.number().positive().optional(),
  size: z.coerce.number().optional(),
  search: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
})

export const baseCreateResourceSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  metadata: z.any().optional(),
})

export const baseCreateRunResourceSchema = baseCreateResourceSchema.extend({
  imageCode: z.string().optional(),
  imageTag: z.string().optional(),
  provenanceJson: z.any().optional(),
  provenanceUrl: z.string().optional(),
  dataUrl: z.string().optional(),
  dataType: z
    .enum(['parquet', 'geoparquet', 'stac-geoparquet', 'zarr'])
    .optional(),
  dataSize: z.coerce.number().int().optional(),
  dataEtag: z.string().optional(),
})

export const baseUpdateResourceSchema = z.object({
  name: z.string().optional(),
  description: z.string().nullable().optional(),
})

export const datasetQuerySchema = baseQuerySchema

export const createDatasetSchema = baseCreateResourceSchema.extend({
  sourceUrl: z.string().optional(),
  sourceMetadataUrl: z.string().optional(),
})

export const updateDatasetSchema = baseUpdateResourceSchema.extend({
  mainRunId: z.string().nullable().optional(),
})

export const datasetRunQuerySchema = baseQuerySchema

export const createDatasetRunSchema = baseCreateRunResourceSchema.extend({
  datasetId: z.string(),
})

export const updateDatasetRunSchema = baseUpdateResourceSchema

export const geometriesQuerySchema = baseQuerySchema

export const createGeometriesSchema = baseCreateResourceSchema.extend({
  sourceUrl: z.string().optional(),
  sourceMetadataUrl: z.string().optional(),
})

export const updateGeometriesSchema = baseUpdateResourceSchema.extend({
  mainRunId: z.string().nullable().optional(),
})

export const geometriesRunQuerySchema = baseQuerySchema

export const createGeometriesRunSchema = baseCreateRunResourceSchema.extend({
  // Override dataType to be geoparquet
  dataType: z.enum(['geoparquet']).optional(),
  dataPmtilesUrl: z.string().optional(),
  geometriesId: z.string(),
})

export const updateGeometriesRunSchema = baseUpdateResourceSchema.extend({})

export const geometryOutputQuerySchema = baseQuerySchema.extend({})

export const geometryOutputExportQuerySchema = z.object({
  geometryOutputIds: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val) => (Array.isArray(val) ? val : val ? [val] : undefined)),
})

export const createGeometryOutputSchema = baseCreateResourceSchema.extend({
  name: z.string(),
  geometriesRunId: z.string(),
  geometry: z.union([
    PolygonSchema.openapi({ title: 'GeoJSON Polygon' }),
    MultiPolygonSchema.openapi({
      title: 'GeoJSON MultiPolygon',
    }),
  ]),
  properties: z.any().optional(),
})

export const createManyGeometryOutputSchema = z.object({
  geometriesRunId: z.string(),
  outputs: z.array(
    baseCreateResourceSchema.extend({
      name: z.string(),
      geometry: z.union([
        PolygonSchema.openapi({ title: 'GeoJSON Polygon' }),
        MultiPolygonSchema.openapi({
          title: 'GeoJSON MultiPolygon',
        }),
      ]),
      properties: z.any().optional(),
    }),
  ),
})

export const updateGeometryOutputSchema = baseUpdateResourceSchema.omit({
  name: true,
})

export const productQuerySchema = baseQuerySchema.extend({
  datasetId: z.string().optional(),
  geometriesId: z.string().optional(),
})

export const createProductSchema = baseCreateResourceSchema.extend({
  datasetId: z.string(),
  geometriesId: z.string(),
  timePrecision: z.enum(['hour', 'day', 'month', 'year']),
})

export const updateProductSchema = baseUpdateResourceSchema.extend({
  mainRunId: z.string().nullable().optional(),
  timePrecision: z.enum(['hour', 'day', 'month', 'year']).optional(),
})

export const productRunQuerySchema = baseQuerySchema.extend({
  datasetRunId: z.string().optional(),
  geometriesRunId: z.string().optional(),
})

export const createProductRunSchema = baseCreateRunResourceSchema.extend({
  dataType: z.enum(['parquet']).optional(),
  productId: z.string(),
  datasetRunId: z.string(),
  geometriesRunId: z.string(),
})

export const updateProductRunSchema = baseUpdateResourceSchema

export const productOutputQuerySchema = baseQuerySchema.extend({
  geometryOutputId: z.string().optional(),
  variableId: z.string().optional(),
  timePoint: z.iso.datetime().optional(),
})

export const productOutputExportQuerySchema = z.object({
  variableId: z.union([z.string(), z.array(z.string())]).optional(),
  geometryOutputId: z.union([z.string(), z.array(z.string())]).optional(),
  timePoint: z.union([z.iso.datetime(), z.array(z.iso.datetime())]).optional(),
})

export const createProductOutputSchema = baseCreateResourceSchema.extend({
  productRunId: z.string(),
  geometryOutputId: z.string(),
  value: z.coerce.number(),
  variableId: z.string(),
  timePoint: z.iso.datetime(),
})

export const updateProductOutputSchema = baseUpdateResourceSchema

export const createManyProductOutputSchema = z.object({
  productRunId: z.string(),
  variableId: z.string(),
  timePoint: z.iso.datetime(),
  outputs: z.array(
    baseCreateResourceSchema.extend({
      geometryOutputId: z.string(),
      value: z.number(),
    }),
  ),
})

export const variableQuerySchema = baseQuerySchema

export const createVariableSchema = baseCreateResourceSchema.extend({
  name: z.string(),
  unit: z.string(),
  categoryId: z.string().nullable().optional(),
  displayOrder: z.number().optional(),
})

export const updateVariableSchema = baseUpdateResourceSchema.extend({
  unit: z.string().optional(),
  categoryId: z.string().nullable().optional(),
  displayOrder: z.number().nullable().optional(),
})

export const createVariableCategorySchema = baseCreateResourceSchema.extend({
  name: z.string().min(1),
  parentId: z.string().optional(),
  displayOrder: z.number().optional(),
})

export const updateVariableCategorySchema = baseUpdateResourceSchema.extend({
  parentId: z.string().optional(),
  displayOrder: z.number().optional(),
})

export const reportQuerySchema = baseQuerySchema
export const createReportSchema = baseCreateResourceSchema
export const updateReportSchema = baseUpdateResourceSchema.extend({
  content: z.any(),
})

const gridLayoutItemSchema = z.object({
  i: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  minH: z.number().optional(),
  minW: z.number().optional(),
  maxH: z.number().optional(),
  maxW: z.number().optional(),
  static: z.boolean().optional(),
  isDraggable: z.boolean().optional(),
  isResizable: z.boolean().optional(),
  moved: z.boolean().optional(),
})

export const dashboardLayoutSchema = z.array(gridLayoutItemSchema)

export const dashboardContentSchema = z.object({
  charts: z.record(z.string(), z.any()),
  layout: dashboardLayoutSchema,
})

export const dashboardQuerySchema = baseQuerySchema
export const createDashboardSchema = baseCreateResourceSchema.extend({
  content: dashboardContentSchema,
})
export const updateDashboardSchema = baseUpdateResourceSchema.extend({
  content: dashboardContentSchema.optional(),
})
