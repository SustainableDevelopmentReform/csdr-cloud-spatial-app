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
      email: 'geometries-admin@example.com',
      role: 'admin',
    }),
  )
  memberClient = createAppClient(
    await createSessionHeaders({
      email: 'geometries-user@example.com',
    }),
  )
})

describe('geometries route', () => {
  it('returns read responses with expected messages', async () => {
    await expectJsonResponse(
      await createAppClient().api.v0.geometries.$get({ query: {} }),
      {
        status: 401,
        message: 'User is not authenticated',
        description: null,
      },
    )

    const listJson = await expectJsonResponse<{
      data: { id: string }[]
      totalCount: number
    }>(await memberClient.api.v0.geometries.$get({ query: {} }), {
      status: 200,
      message: 'OK',
    })
    expect(listJson.data.totalCount).toBeGreaterThanOrEqual(1)
    expect(
      listJson.data.data.some((item) => item.id === seededIds.geometries),
    ).toBe(true)

    const detailJson = await expectJsonResponse<{
      id: string
      mainRun: { id: string } | null
      runCount: number
      productCount: number
    }>(
      await memberClient.api.v0.geometries[':id'].$get({
        param: { id: seededIds.geometries },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )
    expect(detailJson.data.id).toBe(seededIds.geometries)
    expect(detailJson.data.mainRun?.id).toBe(seededIds.geometriesRun)
    expect(detailJson.data.runCount).toBe(1)
    expect(detailJson.data.productCount).toBe(1)

    const runsJson = await expectJsonResponse<{
      data: { id: string }[]
      totalCount: number
    }>(
      await memberClient.api.v0.geometries[':id'].runs.$get({
        param: { id: seededIds.geometries },
        query: {},
      }),
      {
        status: 200,
        message: 'OK',
      },
    )
    expect(runsJson.data.totalCount).toBe(1)
    expect(runsJson.data.data[0]?.id).toBe(seededIds.geometriesRun)

    await expectJsonResponse(
      await memberClient.api.v0.geometries[':id'].$get({
        param: { id: 'missing-geometries' },
      }),
      {
        status: 404,
        message: 'Failed to get geometries',
      },
    )
  })

  it('returns write auth and success messages', async () => {
    await expectJsonResponse(
      await memberClient.api.v0.geometries.$post({
        json: {
          name: 'Forbidden geometries',
        },
      }),
      {
        status: 403,
        message: 'User is not authorized',
        description: null,
      },
    )

    const createdJson = await expectJsonResponse<{ id: string }>(
      await adminClient.api.v0.geometries.$post({
        json: {
          name: 'Created geometries',
          description: 'Created in test',
        },
      }),
      {
        status: 201,
        message: 'Geometries created',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0.geometries[':id'].$patch({
        param: { id: createdJson.data.id },
        json: {
          description: 'Updated geometries',
        },
      }),
      {
        status: 200,
        message: 'Geometries updated',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0.geometries[':id'].$delete({
        param: { id: createdJson.data.id },
      }),
      {
        status: 200,
        message: 'Geometries deleted',
      },
    )
  })
})
