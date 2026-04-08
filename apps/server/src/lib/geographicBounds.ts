import { sql, type SQL, type SQLWrapper } from 'drizzle-orm'
import type { Polygon } from 'geojson'
import { ServerError } from './error'

export type ResourceBounds = {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export type GeographicBoundsFilter = {
  boundsMinX?: number
  boundsMinY?: number
  boundsMaxX?: number
  boundsMaxY?: number
}

const hasNumber = (value: number | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value)

export const toResourceBoundsPolygon = (bounds: ResourceBounds): Polygon => ({
  type: 'Polygon',
  bbox: [bounds.minX, bounds.minY, bounds.maxX, bounds.maxY],
  coordinates: [
    [
      [bounds.minX, bounds.minY],
      [bounds.maxX, bounds.minY],
      [bounds.maxX, bounds.maxY],
      [bounds.minX, bounds.maxY],
      [bounds.minX, bounds.minY],
    ],
  ],
})

export const toResourceBounds = (
  polygon: Polygon | null | undefined,
): ResourceBounds | null => {
  if (!polygon) {
    return null
  }

  const ring = polygon.coordinates[0]

  if (!ring || ring.length === 0) {
    return null
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const position of ring) {
    const x = position[0]
    const y = position[1]

    if (typeof x !== 'number' || typeof y !== 'number') {
      continue
    }

    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }

  if (
    !Number.isFinite(minX) ||
    !Number.isFinite(minY) ||
    !Number.isFinite(maxX) ||
    !Number.isFinite(maxY)
  ) {
    return null
  }

  return { minX, minY, maxX, maxY }
}

export const getBoundsFilterEnvelope = (
  query: GeographicBoundsFilter,
): SQL | null => {
  const providedCount = [
    query.boundsMinX,
    query.boundsMinY,
    query.boundsMaxX,
    query.boundsMaxY,
  ].filter((value) => value !== undefined).length

  if (providedCount === 0) {
    return null
  }

  if (
    !hasNumber(query.boundsMinX) ||
    !hasNumber(query.boundsMinY) ||
    !hasNumber(query.boundsMaxX) ||
    !hasNumber(query.boundsMaxY)
  ) {
    throw new ServerError({
      statusCode: 422,
      message: 'Validation Error',
      description:
        'boundsMinX, boundsMinY, boundsMaxX, and boundsMaxY must all be provided together',
    })
  }

  if (query.boundsMinX >= query.boundsMaxX) {
    throw new ServerError({
      statusCode: 422,
      message: 'Validation Error',
      description: 'boundsMinX must be less than boundsMaxX',
    })
  }

  if (query.boundsMinY >= query.boundsMaxY) {
    throw new ServerError({
      statusCode: 422,
      message: 'Validation Error',
      description: 'boundsMinY must be less than boundsMaxY',
    })
  }

  return sql`ST_MakeEnvelope(${query.boundsMinX}, ${query.boundsMinY}, ${query.boundsMaxX}, ${query.boundsMaxY}, 4326)`
}

export const buildGeometryIntersectsFilter = (
  geometryExpression: SQLWrapper,
  envelope: SQL | null,
): SQL | undefined => {
  if (!envelope) {
    return undefined
  }

  return sql`(${geometryExpression} && ${envelope} and ST_Intersects(${geometryExpression}, ${envelope}))`
}

export const buildExtentEnvelopeSql = (geometryExpression: SQLWrapper): SQL =>
  sql`ST_SetSRID(ST_Envelope(ST_Extent(${geometryExpression})), 4326)`

export const buildBoundsSelect = (geometryExpression: SQLWrapper) => ({
  minX: sql<number>`ST_XMin(${geometryExpression})`,
  minY: sql<number>`ST_YMin(${geometryExpression})`,
  maxX: sql<number>`ST_XMax(${geometryExpression})`,
  maxY: sql<number>`ST_YMax(${geometryExpression})`,
})
