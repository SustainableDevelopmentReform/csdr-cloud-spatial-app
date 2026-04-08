import { customType } from 'drizzle-orm/pg-core'
import { SQL, sql } from 'drizzle-orm'
import {
  Geometry as GeoJSONGeometry,
  Polygon as GeoJSONPolygon,
  MultiPolygon as GeoJSONMultiPolygon,
} from 'geojson'
import wkx from 'wkx'

export interface TstzRange {
  start: Date
  end: Date
  bounds: '[)' | '(]' | '()'
}

export const tstzrange = customType<{
  data: TstzRange
  driverData: string
}>({
  dataType() {
    return 'tstzrange'
  },
  toDriver(value: TstzRange): string {
    const start = value.start.toISOString()
    const end = value.end.toISOString()
    return `${value.bounds[0]}"${start}","${end}"${value.bounds[1]}`
  },
  fromDriver(value: string): TstzRange {
    const boundsString = `${value[0]}${value[value.length - 1]}`
    if (
      boundsString !== '[)' &&
      boundsString !== '(]' &&
      boundsString !== '()'
    ) {
      throw new Error(
        `Invalid tstzrange value: ${value} - Expected bounds to be [), (], or ()`,
      )
    }
    const bounds = boundsString
    const parts = value.substring(2, value.length - 2).split('","')

    if (typeof parts[0] === 'undefined' || typeof parts[1] === 'undefined') {
      throw new Error(`Invalid tstzrange value: ${value}`)
    }

    return {
      start: new Date(parts[0]),
      end: new Date(parts[1]),
      bounds: bounds,
    }
  },
})

export type BaseGeometryType =
  | 'Point'
  | 'MultiPoint'
  | 'LineString'
  | 'MultiLineString'
  | 'Polygon'
  | 'MultiPolygon'
  | 'GeometryCollection'

export type GeometryType = BaseGeometryType | `${BaseGeometryType}Z`

export type GeometrySubtypeOptions = { srid?: number; is3D?: boolean }

export type GeometryOptions =
  | { type?: GeometryType; srid?: never; is3D?: boolean }
  | { type: GeometryType; srid: number; is3D?: boolean }

type SerializedBuffer = {
  type: 'Buffer'
  data: number[]
}

type GeometryDriverValue = string | Buffer | GeoJSONGeometry | SerializedBuffer

function toDriver(value: GeoJSONGeometry) {
  return sql`ST_GeomFromGeoJSON(${JSON.stringify(value)})`
}

const isSerializedBuffer = (value: unknown): value is SerializedBuffer =>
  typeof value === 'object' &&
  value !== null &&
  'type' in value &&
  value.type === 'Buffer' &&
  'data' in value &&
  Array.isArray(value.data)

const isGeoJSONGeometry = (value: unknown): value is GeoJSONGeometry => {
  if (typeof value !== 'object' || value === null || !('type' in value)) {
    return false
  }

  const geometryType = value.type

  if (typeof geometryType !== 'string') {
    return false
  }

  if (geometryType === 'GeometryCollection') {
    return 'geometries' in value && Array.isArray(value.geometries)
  }

  return 'coordinates' in value && Array.isArray(value.coordinates)
}

const parseGeometryBuffer = (value: Buffer) =>
  wkx.Geometry.parse(value).toGeoJSON({ shortCrs: true })

export function fromDriver<T extends GeoJSONGeometry>(
  value: GeometryDriverValue,
) {
  if (typeof value === 'string') {
    return parseGeometryBuffer(Buffer.from(value, 'hex')) as T
  }

  if (Buffer.isBuffer(value)) {
    return parseGeometryBuffer(value) as T
  }

  if (isSerializedBuffer(value)) {
    return parseGeometryBuffer(Buffer.from(value.data)) as T
  }

  if (isGeoJSONGeometry(value)) {
    return value as T
  }

  throw new Error(`Invalid geometry value: ${JSON.stringify(value)}`)
}

const dataType = (options?: GeometryOptions) => {
  let result = 'geometry'
  if (options?.type) {
    result += `(${options.type}`
    if (options?.srid) {
      result += `,${options.srid}`
    }

    return `${result})`
  }
  return `${result}(Geometry)`
}

/**
 * A MultiPolygon is a collection of non-overlapping, non-adjacent Polygons.
 *
 * Polygons in the collection may touch only at a finite number of points.
 *
 * @example `MULTIPOLYGON (((1 5, 5 5, 5 1, 1 1, 1 5)), ((6 5, 9 1, 6 1, 6 5)))`
 *
 * @link https://postgis.net/docs/using_postgis_dbmanagement.html#MultiPolygon
 */
export const multiPolygon = customType<{
  data: GeoJSONMultiPolygon
  config: GeometrySubtypeOptions
  driverData: GeometryDriverValue
}>({
  dataType: (options) =>
    dataType({ type: `MultiPolygon${options?.is3D ? 'Z' : ''}`, ...options }),
  toDriver: (mp: GeoJSONMultiPolygon) => toDriver(mp),
  fromDriver: (value) => fromDriver<GeoJSONMultiPolygon>(value),
})

export const polygon = customType<{
  data: GeoJSONPolygon
  config: GeometrySubtypeOptions
  driverData: GeometryDriverValue
}>({
  dataType: (options) =>
    dataType({ type: `Polygon${options?.is3D ? 'Z' : ''}`, ...options }),
  toDriver: (p: GeoJSONPolygon) => toDriver(p),
  fromDriver: (value) => fromDriver<GeoJSONPolygon>(value),
})

/** Constructs a PostGIS geometry object from the GeoJSON representation.
 *
 * ST_GeomFromGeoJSON works only for JSON Geometry fragments. It throws an error if you try to use it on a whole JSON document.
 *
 * @group Geometry Inputs
 * @link https://postgis.net/docs/ST_GeomFromGeoJSON.html
 */
export function geomFromGeoJSON(
  expression: Record<string, unknown>,
): SQL<GeoJSONGeometry> {
  return sql`ST_GeomFromGeoJSON(${JSON.stringify(expression)})`.mapWith(
    fromDriver,
  )
}
