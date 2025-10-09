import { z } from '@hono/zod-openapi'
import { MultiPolygonSchema, PolygonSchema } from './geojson'

export const paginatedQuerySchema = z.object({
  page: z.coerce.number().positive().optional(),
  size: z.coerce.number().optional(),
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

export const datasetQuerySchema = paginatedQuerySchema

export const createDatasetSchema = baseCreateResourceSchema.extend({
  sourceUrl: z.string().optional(),
  sourceMetadataUrl: z.string().optional(),
})

export const updateDatasetSchema = baseUpdateResourceSchema.extend({
  mainRunId: z.string().nullable().optional(),
})

export const datasetRunQuerySchema = paginatedQuerySchema

export const createDatasetRunSchema = baseCreateRunResourceSchema.extend({
  datasetId: z.string(),
})

export const updateDatasetRunSchema = baseUpdateResourceSchema

export const geometriesQuerySchema = paginatedQuerySchema

export const createGeometriesSchema = baseCreateResourceSchema.extend({
  sourceUrl: z.string().optional(),
  sourceMetadataUrl: z.string().optional(),
})

export const updateGeometriesSchema = baseUpdateResourceSchema.extend({
  mainRunId: z.string().nullable().optional(),
})

export const geometriesRunQuerySchema = paginatedQuerySchema

export const createGeometriesRunSchema = baseCreateRunResourceSchema.extend({
  // Override dataType to be geoparquet
  dataType: z.enum(['geoparquet']).optional(),
  dataPmtilesUrl: z.string().optional(),
  geometriesId: z.string(),
})

export const updateGeometriesRunSchema = baseUpdateResourceSchema.extend({})

export const geometryOutputQuerySchema = paginatedQuerySchema

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

export const productQuerySchema = paginatedQuerySchema.extend({
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

export const productRunQuerySchema = paginatedQuerySchema.extend({
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

export const productOutputQuerySchema = paginatedQuerySchema.extend({
  geometryOutputId: z.string().optional(),
  variableId: z.string().optional(),
  timePoint: z.iso.datetime().optional(),
})

export const productOutputExportQuerySchema = z.object({
  variableId: z.string(),
  geometryOutputId: z.string().optional(),
  timePoint: z.iso.datetime().optional(),
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

export const variableQuerySchema = paginatedQuerySchema

export const createVariableSchema = baseCreateResourceSchema.extend({
  name: z.string(),
  unit: z.string(),
  categoryId: z.string().nullable().optional(),
  displayOrder: z.number().optional(),
})

export const updateVariableSchema = baseUpdateResourceSchema.extend({
  unit: z.string().optional(),
  categoryId: z.string().nullable().optional(),
  displayOrder: z.number().optional(),
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
