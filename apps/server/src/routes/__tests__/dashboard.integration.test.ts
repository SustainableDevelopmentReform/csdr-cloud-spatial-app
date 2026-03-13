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
      email: 'dashboard-admin@example.com',
      role: 'admin',
    }),
  )
  memberClient = createAppClient(
    await createSessionHeaders({
      email: 'dashboard-user@example.com',
    }),
  )
})

describe('dashboard route', () => {
  it('returns read responses with expected messages', async () => {
    await expectJsonResponse(
      await createAppClient().api.v0.dashboard.$get({ query: {} }),
      {
        status: 401,
        message: 'User is not authenticated',
        description: null,
      },
    )

    const listJson = await expectJsonResponse<{
      data: { id: string }[]
      totalCount: number
    }>(await memberClient.api.v0.dashboard.$get({ query: {} }), {
      status: 200,
      message: 'OK',
    })
    expect(listJson.data.totalCount).toBeGreaterThanOrEqual(1)
    expect(
      listJson.data.data.some((item) => item.id === seededIds.dashboard),
    ).toBe(true)

    const detailJson = await expectJsonResponse<{ id: string }>(
      await memberClient.api.v0.dashboard[':id'].$get({
        param: { id: seededIds.dashboard },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )
    expect(detailJson.data.id).toBe(seededIds.dashboard)

    await expectJsonResponse(
      await memberClient.api.v0.dashboard[':id'].$get({
        param: { id: 'missing-dashboard' },
      }),
      {
        status: 404,
        message: 'Failed to get dashboard',
      },
    )
  })

  it('returns write auth and success messages', async () => {
    await expectJsonResponse(
      await memberClient.api.v0.dashboard.$post({
        json: {
          name: 'Forbidden dashboard',
          content: {
            charts: {},
            layout: [],
          },
        },
      }),
      {
        status: 403,
        message: 'User is not authorized',
        description: null,
      },
    )

    const createdJson = await expectJsonResponse<{ id: string }>(
      await adminClient.api.v0.dashboard.$post({
        json: {
          name: 'Created dashboard',
          description: 'Created in test',
          content: {
            charts: {},
            layout: [],
          },
        },
      }),
      {
        status: 201,
        message: 'Dashboard created',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0.dashboard[':id'].$patch({
        param: { id: createdJson.data.id },
        json: {
          description: 'Updated dashboard',
        },
      }),
      {
        status: 200,
        message: 'Dashboard updated',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0.dashboard[':id'].$delete({
        param: { id: createdJson.data.id },
      }),
      {
        status: 200,
        message: 'Dashboard deleted',
      },
    )
  })
})
