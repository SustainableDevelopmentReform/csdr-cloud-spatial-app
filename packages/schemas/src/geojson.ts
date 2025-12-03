import { z } from '@hono/zod-openapi'
import type { Position, BBox, Polygon, MultiPolygon } from 'geojson'

// Adapted from https://github.com/timbtimbtimb/zod-geojson-schemas
// Under MIT license Copyright (c) 2025 Timothée Billiet Cadart
// Full License: https://github.com/timbtimbtimb/zod-geojson-schemas/blob/production/LICENSE

export const PositionSchema = z
  .array(z.number())
  .min(2) satisfies z.ZodType<Position>

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
]) satisfies z.ZodType<BBox>

export const PolygonSchema = z.object({
  type: z.literal('Polygon'),
  bbox: BBoxSchema.optional(),
  coordinates: z.array(z.array(PositionSchema)),
}) satisfies z.ZodType<Polygon>

export const MultiPolygonSchema = z.object({
  type: z.literal('MultiPolygon'),
  bbox: BBoxSchema.optional(),
  coordinates: z.array(z.array(z.array(PositionSchema))),
}) satisfies z.ZodType<MultiPolygon>
