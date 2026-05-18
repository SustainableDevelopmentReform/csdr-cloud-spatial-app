import { beforeEach, describe, expect, it } from 'vitest'
import { seededIds, setupIsolatedTestFile } from '~/test-utils/integration'
import { expectJsonResponse } from '~/test-utils/route-test-helpers'

const { app, createAppClient, createSessionHeaders } =
  await setupIsolatedTestFile(import.meta.url)

let adminClient: ReturnType<typeof createAppClient>
let memberClient: ReturnType<typeof createAppClient>
let adminHeaders: Headers

beforeEach(async () => {
  adminHeaders = await createSessionHeaders({
    email: 'geometry-output-admin@example.com',
    role: 'admin',
  })
  adminClient = createAppClient(adminHeaders)
  memberClient = createAppClient(
    await createSessionHeaders({
      email: 'geometry-output-user@example.com',
    }),
  )
})

const createGeoJsonFile = (features: unknown[]) =>
  new File(
    [
      JSON.stringify({
        type: 'FeatureCollection',
        features,
      }),
    ],
    'geometries.geojson',
    { type: 'application/geo+json' },
  )

const postRawJson = async (path: string, body: unknown) => {
  const headers = new Headers(adminHeaders)
  headers.set('content-type', 'application/json')

  return app.request(path, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

describe('geometry-output route', () => {
  it('returns read responses with expected messages', async () => {
    await expectJsonResponse(
      await createAppClient().api.v0['geometry-output'][':id'].$get({
        param: { id: seededIds.tasmaniaGeometryOutput },
      }),
      {
        status: 404,
        message: 'Failed to get geometryOutput',
        description: "geometryOutput you're looking for is not found",
      },
    )

    const detailJson = await expectJsonResponse<{
      id: string
      geometry: { type: string }
    }>(
      await memberClient.api.v0['geometry-output'][':id'].$get({
        param: { id: seededIds.tasmaniaGeometryOutput },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )
    expect(detailJson.data.id).toBe(seededIds.tasmaniaGeometryOutput)
    expect(detailJson.data.geometry.type).toBe('MultiPolygon')

    await expectJsonResponse(
      await memberClient.api.v0['geometry-output'][':id'].$get({
        param: { id: 'missing-geometry-output' },
      }),
      {
        status: 404,
        message: 'Failed to get geometryOutput',
        description: "geometryOutput you're looking for is not found",
      },
    )
  })

  it('returns write auth and success messages', async () => {
    await expectJsonResponse(
      await memberClient.api.v0['geometry-output'].$post({
        json: {
          geometriesRunId: seededIds.geometriesRun,
          name: 'Forbidden geometry output',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [140, -40],
                [141, -40],
                [141, -41],
                [140, -40],
              ],
            ],
          },
        },
      }),
      {
        status: 403,
        message: 'User is not authorized',
        description: null,
      },
    )

    const createdJson = await expectJsonResponse<{
      id: string
      geometry: { type: string }
    }>(
      await adminClient.api.v0['geometry-output'].$post({
        json: {
          geometriesRunId: seededIds.geometriesRun,
          name: 'Created geometry output',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [140, -40],
                [141, -40],
                [141, -41],
                [140, -40],
              ],
            ],
          },
          properties: {
            localId: 'created',
          },
        },
      }),
      {
        status: 201,
        message: 'Geometry output created',
      },
    )
    expect(createdJson.data.geometry.type).toBe('MultiPolygon')

    const bulkJson = await expectJsonResponse<{ id: string }[]>(
      await adminClient.api.v0['geometry-output'].bulk.$post({
        json: {
          geometriesRunId: seededIds.geometriesRun,
          outputs: [
            {
              name: 'Bulk geometry 1',
              geometry: {
                type: 'Polygon',
                coordinates: [
                  [
                    [142, -40],
                    [143, -40],
                    [143, -41],
                    [142, -40],
                  ],
                ],
              },
            },
            {
              name: 'Bulk geometry 2',
              geometry: {
                type: 'Polygon',
                coordinates: [
                  [
                    [144, -40],
                    [145, -40],
                    [145, -41],
                    [144, -40],
                  ],
                ],
              },
            },
          ],
        },
      }),
      {
        status: 201,
        message: 'Geometry output created',
      },
    )
    expect(bulkJson.data).toHaveLength(2)

    await expectJsonResponse(
      await adminClient.api.v0['geometry-output'][':id'].$patch({
        param: { id: createdJson.data.id },
        json: {
          description: 'Updated geometry output',
        },
      }),
      {
        status: 200,
        message: 'Geometry output updated',
      },
    )

    const importJson = await expectJsonResponse<{
      numberOfFeatures: number
      warnings: { message: string }[]
    }>(
      await adminClient.api.v0['geometry-output'].import.$post({
        form: {
          geometriesRunId: seededIds.geometriesRun,
          geojsonIdProperty: 'localId',
          geojsonNameProperty: 'displayName',
          geojsonFile: new File(
            [
              JSON.stringify({
                type: 'FeatureCollection',
                features: [
                  {
                    type: 'Feature',
                    properties: {
                      localId: 'bass-strait',
                      displayName: 'Bass Strait',
                    },
                    geometry: {
                      type: 'Polygon',
                      coordinates: [
                        [
                          [146, -39],
                          [147, -39],
                          [147, -40],
                          [146, -39],
                        ],
                      ],
                    },
                  },
                ],
              }),
            ],
            'geometries.geojson',
            { type: 'application/geo+json' },
          ),
        },
      }),
      {
        status: 201,
        message: 'Geometries run imported successfully',
      },
    )
    expect(importJson.data.numberOfFeatures).toBe(1)
    expect(importJson.data.warnings).toEqual([])

    await expectJsonResponse(
      await adminClient.api.v0['geometry-output'][':id'].$delete({
        param: { id: createdJson.data.id },
      }),
      {
        status: 200,
        message: 'Geometry output deleted',
      },
    )
  })

  it('rejects missing geometry payloads at the validation boundary', async () => {
    await expectJsonResponse(
      await postRawJson('/api/v0/geometry-output', {
        geometriesRunId: seededIds.geometriesRun,
        name: 'Missing geometry output',
      }),
      {
        status: 422,
        message: 'Validation Error',
      },
    )

    await expectJsonResponse(
      await postRawJson('/api/v0/geometry-output/bulk', {
        geometriesRunId: seededIds.geometriesRun,
        outputs: [
          {
            name: 'Missing bulk geometry output',
          },
        ],
      }),
      {
        status: 422,
        message: 'Validation Error',
      },
    )
  })

  it('returns import errors for invalid or empty GeoJSON files', async () => {
    await expectJsonResponse(
      await adminClient.api.v0['geometry-output'].import.$post({
        form: {
          geometriesRunId: seededIds.geometriesRun,
          geojsonIdProperty: 'localId',
          geojsonNameProperty: 'displayName',
          geojsonFile: new File(['not json'], 'invalid.geojson', {
            type: 'application/geo+json',
          }),
        },
      }),
      {
        status: 400,
        message: 'Invalid GeoJSON upload',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0['geometry-output'].import.$post({
        form: {
          geometriesRunId: seededIds.geometriesRun,
          geojsonIdProperty: 'localId',
          geojsonNameProperty: 'displayName',
          geojsonFile: createGeoJsonFile([]),
        },
      }),
      {
        status: 400,
        message: 'Invalid GeoJSON upload',
        description: 'GeoJSON file does not contain any features',
      },
    )
  })

  it('imports valid GeoJSON features while returning warnings for skipped features', async () => {
    const importJson = await expectJsonResponse<{
      numberOfFeatures: number
      warnings: { message: string }[]
    }>(
      await adminClient.api.v0['geometry-output'].import.$post({
        form: {
          geometriesRunId: seededIds.geometriesRun,
          geojsonIdProperty: 'localId',
          geojsonNameProperty: 'displayName',
          geojsonFile: createGeoJsonFile([
            {
              type: 'Feature',
              properties: {
                localId: 'warning-valid',
                displayName: 'Warning Valid',
              },
              geometry: {
                type: 'Polygon',
                coordinates: [
                  [
                    [150, -39],
                    [151, -39],
                    [151, -40],
                    [150, -39],
                  ],
                ],
              },
            },
            {
              type: 'Feature',
              properties: {
                localId: 'missing-geometry',
                displayName: 'Missing Geometry',
              },
              geometry: null,
            },
            {
              type: 'Feature',
              properties: {
                localId: 'line-string',
                displayName: 'Line String',
              },
              geometry: {
                type: 'LineString',
                coordinates: [
                  [150, -39],
                  [151, -40],
                ],
              },
            },
            {
              type: 'Feature',
              properties: {
                displayName: 'Missing ID',
              },
              geometry: {
                type: 'Polygon',
                coordinates: [
                  [
                    [152, -39],
                    [153, -39],
                    [153, -40],
                    [152, -39],
                  ],
                ],
              },
            },
            {
              type: 'Feature',
              properties: {
                localId: 'missing-name',
              },
              geometry: {
                type: 'Polygon',
                coordinates: [
                  [
                    [154, -39],
                    [155, -39],
                    [155, -40],
                    [154, -39],
                  ],
                ],
              },
            },
          ]),
        },
      }),
      {
        status: 201,
        message: 'Geometries run imported successfully',
      },
    )

    expect(importJson.data.numberOfFeatures).toBe(1)
    expect(importJson.data.warnings.map((warning) => warning.message)).toEqual([
      'Feature at index 1 is missing geometry',
      'Feature at index 2 must be a Polygon or MultiPolygon',
      'Feature at index 3 does not contain property localId',
      'Feature at index 4 does not contain property displayName',
    ])
  })

  it('surfaces database details when an imported geometry output conflicts', async () => {
    const duplicateFile = createGeoJsonFile([
      {
        type: 'Feature',
        properties: {
          localId: 'duplicate-feature',
          displayName: 'Duplicate Feature',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [156, -39],
              [157, -39],
              [157, -40],
              [156, -39],
            ],
          ],
        },
      },
    ])

    await expectJsonResponse(
      await adminClient.api.v0['geometry-output'].import.$post({
        form: {
          geometriesRunId: seededIds.geometriesRun,
          geojsonIdProperty: 'localId',
          geojsonNameProperty: 'displayName',
          geojsonFile: duplicateFile,
        },
      }),
      {
        status: 201,
        message: 'Geometries run imported successfully',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0['geometry-output'].import.$post({
        form: {
          geometriesRunId: seededIds.geometriesRun,
          geojsonIdProperty: 'localId',
          geojsonNameProperty: 'displayName',
          geojsonFile: duplicateFile,
        },
      }),
      {
        status: 500,
        message:
          'Failed to create geometry output (name:Duplicate Feature, id:duplicate-feature, index:0)',
      },
    )
  })
})
