import { beforeEach, describe, expect, it } from 'vitest'
import { seededIds, setupIsolatedTestFile } from '~/test-utils/integration'
import { expectJsonResponse } from './test-helpers'

const { createAppClient, createSessionHeaders } = await setupIsolatedTestFile(
  import.meta.url,
)

let adminClient: ReturnType<typeof createAppClient>
let memberClient: ReturnType<typeof createAppClient>

beforeEach(async () => {
  adminClient = createAppClient(
    await createSessionHeaders({
      email: 'geometry-output-admin@example.com',
      role: 'admin',
    }),
  )
  memberClient = createAppClient(
    await createSessionHeaders({
      email: 'geometry-output-user@example.com',
    }),
  )
})

describe('geometry-output route', () => {
  it('returns read responses with expected messages', async () => {
    await expectJsonResponse(
      await createAppClient().api.v0['geometry-output'][':id'].$get({
        param: { id: seededIds.tasmaniaGeometryOutput },
      }),
      {
        status: 401,
        message: 'User is not authenticated',
        description: null,
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
})
