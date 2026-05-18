import { describe, expect, it } from 'vitest'
import wkx from 'wkx'
import { WKBSchema } from '../src/geojson'

const polygonRing = [
  new wkx.Point(0, 0),
  new wkx.Point(1, 0),
  new wkx.Point(1, 1),
  new wkx.Point(0, 0),
]

const toBase64Ewkb = (geometry: wkx.Geometry) =>
  geometry.toEwkb().toString('base64')

describe('WKBSchema', () => {
  it('parses SRID 4326 Polygon EWKB into GeoJSON', () => {
    const parsed = WKBSchema.parse({
      wkb: toBase64Ewkb(new wkx.Polygon(polygonRing, [], 4326)),
    })

    expect(parsed).toEqual({
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 0],
        ],
      ],
      crs: {
        type: 'name',
        properties: {
          name: 'EPSG:4326',
        },
      },
    })
  })

  it('parses SRID 4326 MultiPolygon EWKB into GeoJSON', () => {
    const parsed = WKBSchema.parse({
      wkb: toBase64Ewkb(
        new wkx.MultiPolygon([new wkx.Polygon(polygonRing, [], 4326)], 4326),
      ),
    })

    expect(parsed.type).toBe('MultiPolygon')
    expect(parsed.coordinates).toEqual([
      [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 0],
        ],
      ],
    ])
  })

  it('rejects geometries with unsupported SRIDs', () => {
    expect(() =>
      WKBSchema.parse({
        wkb: toBase64Ewkb(new wkx.Polygon(polygonRing, [], 3857)),
      }),
    ).toThrow('only SRID 4326 is supported')
  })

  it('rejects unsupported geometry types', () => {
    expect(() =>
      WKBSchema.parse({
        wkb: toBase64Ewkb(new wkx.Point(0, 0, undefined, undefined, 4326)),
      }),
    ).toThrow('only Polygon and MultiPolygon are supported')
  })

  it('rejects invalid WKB payloads', () => {
    expect(() =>
      WKBSchema.parse({
        wkb: Buffer.from('not-wkb').toString('base64'),
      }),
    ).toThrow()
  })
})
