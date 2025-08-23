import { z, ZodSchema } from 'zod'

export type BaseResource = {
  id: string
  name?: string
  description?: string | null
  metadata?: any
  createdAt: Date
  updatedAt: Date
}

export const baseCreateResourceSchema = z.object({
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  metadata: z.any().optional(),
})

export const transformCreateResource = <
  T extends Omit<BaseResource, 'id' | 'createdAt' | 'updatedAt'>,
>(
  schema: ZodSchema<T>,
) => {
  return schema.transform((data: T) => {
    return {
      ...data,
      id: crypto.randomUUID(),
      name: data.name ?? crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  })
}

export const baseUpdateResourceSchema = z.object({
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  metadata: z.any().optional(),
})

export const transformUpdateResource = <T extends z.ZodTypeAny>(schema: T) => {
  return schema.transform((data: z.infer<T>) => {
    return {
      ...data,
      updatedAt: new Date(),
    }
  })
}
