import { z } from 'zod'

// Adapted from https://github.com/timbtimbtimb/zod-geojson-schemas
// Under MIT license Copyright (c) 2025 Timothée Billiet Cadart
// Full License: https://github.com/timbtimbtimb/zod-geojson-schemas/blob/production/LICENSE

export const PositionSchema = z.array(z.number()).min(2)

export const BBoxSchema = z.union([
  z.tuple([z.number(), z.number(), z.number(), z.number()]),
  z.tuple([
    z.number(),
    z.number(),
    z.number(),
    z.number(),
    z.number(),
    z.number(),
  ]),
])

export const PolygonSchema = z.object({
  type: z.literal('Polygon'),
  bbox: BBoxSchema.optional(),
  coordinates: z.array(z.array(PositionSchema)),
})

export const MultiPolygonSchema = z.object({
  type: z.literal('MultiPolygon'),
  bbox: BBoxSchema.optional(),
  coordinates: z.array(z.array(z.array(PositionSchema))),
})
