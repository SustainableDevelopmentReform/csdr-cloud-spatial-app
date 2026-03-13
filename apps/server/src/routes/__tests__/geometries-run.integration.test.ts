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
      email: 'geometries-run-admin@example.com',
      role: 'admin',
    }),
  )
  memberClient = createAppClient(
    await createSessionHeaders({
      email: 'geometries-run-user@example.com',
    }),
  )
})

describe('geometries-run route', () => {
  it('returns read responses with expected messages', async () => {
    await expectJsonResponse(
      await createAppClient().api.v0['geometries-run'][':id'].$get({
        param: { id: seededIds.geometriesRun },
      }),
      {
        status: 401,
        message: 'User is not authenticated',
        description: null,
      },
    )

    const detailJson = await expectJsonResponse<{
      id: string
      outputCount: number
      productRunCount: number
      bounds: { minX: number; maxX: number }
    }>(
      await memberClient.api.v0['geometries-run'][':id'].$get({
        param: { id: seededIds.geometriesRun },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )
    expect(detailJson.data.id).toBe(seededIds.geometriesRun)
    expect(detailJson.data.outputCount).toBe(2)
    expect(detailJson.data.productRunCount).toBe(1)
    expect(detailJson.data.bounds.minX).toBeLessThan(
      detailJson.data.bounds.maxX,
    )

    const outputsJson = await expectJsonResponse<{
      data: { id: string }[]
      totalCount: number
    }>(
      await memberClient.api.v0['geometries-run'][':id'].outputs.$get({
        param: { id: seededIds.geometriesRun },
        query: {},
      }),
      {
        status: 200,
        message: 'OK',
      },
    )
    expect(outputsJson.data.totalCount).toBe(2)

    const exportJson = await expectJsonResponse<{
      data: { id: string; geometry: { type: string } }[]
    }>(
      await memberClient.api.v0['geometries-run'][':id'].outputs.export.$get({
        param: { id: seededIds.geometriesRun },
        query: {},
      }),
      {
        status: 200,
        message: 'OK',
      },
    )
    expect(exportJson.data.data).toHaveLength(2)
    expect(exportJson.data.data[0]?.geometry.type).toBe('MultiPolygon')

    const tileResponse = await memberClient.api.v0['geometries-run'][
      ':id'
    ].outputs.mvt[':z'][':x'][':y'].$get({
      param: {
        id: seededIds.geometriesRun,
        z: '0',
        x: '0',
        y: '0',
      },
    })
    expect(tileResponse.status).toBe(200)
    expect(tileResponse.headers.get('content-type')).toBe(
      'image/vnd.mapbox-vector-tile',
    )

    await expectJsonResponse(
      await memberClient.api.v0['geometries-run'][':id'].$get({
        param: { id: 'missing-geometries-run' },
      }),
      {
        status: 404,
        message: 'Failed to get geometriesRun',
      },
    )
  })

  it('returns write auth and success messages', async () => {
    await expectJsonResponse(
      await memberClient.api.v0['geometries-run'].$post({
        json: {
          geometriesId: seededIds.geometries,
          name: 'Forbidden geometries run',
        },
      }),
      {
        status: 403,
        message: 'User is not authorized',
        description: null,
      },
    )

    const createdJson = await expectJsonResponse<{ id: string }>(
      await adminClient.api.v0['geometries-run'].$post({
        json: {
          geometriesId: seededIds.geometries,
          name: 'Created geometries run',
        },
      }),
      {
        status: 201,
        message: 'Geometries run created',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0['geometries-run'][':id'].$patch({
        param: { id: createdJson.data.id },
        json: {
          description: 'Updated geometries run',
        },
      }),
      {
        status: 200,
        message: 'Geometries run updated',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0['geometries-run'][':id'][
        'set-as-main-run'
      ].$post({
        param: { id: createdJson.data.id },
      }),
      {
        status: 200,
        message: 'Geometries run set as main',
      },
    )

    const deleteTargetJson = await expectJsonResponse<{ id: string }>(
      await adminClient.api.v0['geometries-run'].$post({
        json: {
          geometriesId: seededIds.geometries,
          name: 'Delete geometries run',
        },
      }),
      {
        status: 201,
        message: 'Geometries run created',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0['geometries-run'][':id'].$delete({
        param: { id: deleteTargetJson.data.id },
      }),
      {
        status: 200,
        message: 'Geometries run deleted',
      },
    )
  })
})
