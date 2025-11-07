import { customType } from 'drizzle-orm/pg-core'
import { SQL, sql } from 'drizzle-orm'
import {
  Geometry as GeoJSONGeometry,
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

function toDriver(value: GeoJSONGeometry) {
  return sql`ST_GeomFromGeoJSON(${JSON.stringify(value)})`
}

export function fromDriver<T extends GeoJSONGeometry>(value: string) {
  const b = Buffer.from(value, 'hex')
  return wkx.Geometry.parse(b).toGeoJSON({ shortCrs: true }) as T
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
  driverData: string
}>({
  dataType: (options) =>
    dataType({ type: `MultiPolygon${options?.is3D ? 'Z' : ''}`, ...options }),
  toDriver: (mp: GeoJSONMultiPolygon) => toDriver(mp),
  fromDriver: (value) => fromDriver<GeoJSONMultiPolygon>(value),
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
