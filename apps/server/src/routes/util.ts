import { z } from '~/lib/openapi'

export type BaseResource = {
  id: string
  name?: string
  description?: string | null
  metadata?: any
  createdAt: Date
  updatedAt: Date
}

export const baseCreateResourceSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  metadata: z.any().optional(),
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
  description: z.string().nullable().optional(),
})

export const updatePayload = <T extends object>(data: T) => ({
  ...data,
  updatedAt: new Date(),
})
