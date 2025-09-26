import { z } from '~/lib/openapi'

export const baseCreateResourceSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  metadata: z.any().optional(),
})

export const baseCreateRunResourceSchema = baseCreateResourceSchema.extend({
  imageCode: z.string().optional(),
  imageTag: z.string().optional(),
  provenanceJson: z.any().optional(),
  provenanceUrl: z.string().optional(),
  dataUrl: z.string().optional(),
  dataType: z.enum(['parquet', 'geoparquet', 'stac-geoparquet', 'zarr']),
  dataSize: z.number().int().optional(),
  dataEtag: z.string().optional(),
})

export const createPayload = <T extends { name?: string; id?: string }>(
  data: T,
) => ({
  ...data,
  name: data.name ?? crypto.randomUUID(),
  id: data.id ?? crypto.randomUUID(),
  createdAt: new Date(),
  updatedAt: new Date(),
})

export const baseUpdateResourceSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
})

export const updatePayload = <T extends object>(data: T) => ({
  ...data,
  updatedAt: new Date(),
})
