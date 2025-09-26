import { DBQueryConfig, ExtractTablesWithRelations } from 'drizzle-orm'
import { z } from '@hono/zod-openapi'
import * as schema from './index'

type TableSchema = ExtractTablesWithRelations<typeof schema>

export type QueryForTable<
  TableName extends keyof TableSchema,
  TRelationType extends 'one' | 'many' = 'one' | 'many',
> = DBQueryConfig<TRelationType, boolean, TableSchema, TableSchema[TableName]>

export const idColumns = {
  id: true,
  name: true,
} as const

export const idColumnsWithMainRunId = {
  id: true,
  name: true,
  mainRunId: true,
} as const

export const baseColumns = {
  id: true,
  name: true,
  description: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
} as const

export const baseRunColumns = {
  ...baseColumns,
  imageCode: true,
  imageTag: true,
  provenanceJson: true,
  provenanceUrl: true,
  dataUrl: true,
  dataType: true,
  dataSize: true,
  dataEtag: true,
} as const

export const baseIdResourceSchema = z.object({
  id: z.string(),
  name: z.string(),
})

export const baseIdResourceSchemaWithMainRunId = baseIdResourceSchema.extend({
  mainRunId: z.string().nullable(),
})

export const baseResourceSchema = baseIdResourceSchema.extend({
  description: z.string().nullable(),
  metadata: z.any().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

export const baseRunResourceSchema = baseResourceSchema.extend({
  imageCode: z.string().nullable(),
  imageTag: z.string().nullable(),
  provenanceJson: z.any().nullable(),
  provenanceUrl: z.string().nullable(),
  dataUrl: z.string().nullable(),
  dataType: z
    .enum(['parquet', 'geoparquet', 'stac-geoparquet', 'zarr'])
    .nullable(),
  dataSize: z.number().int().nullable(),
  dataEtag: z.string().nullable(),
})

export const createPayload = <T extends { name?: string; id?: string }>(
  data: T,
) => ({
  ...data,
  name: data.name ?? crypto.randomUUID(),
  id: data.id || crypto.randomUUID(),
  createdAt: new Date(),
  updatedAt: new Date(),
})

export const updatePayload = <T extends object>(data: T) => ({
  ...data,
  updatedAt: new Date(),
})
