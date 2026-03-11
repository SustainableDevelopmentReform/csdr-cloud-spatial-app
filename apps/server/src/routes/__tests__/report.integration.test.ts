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
      email: 'report-admin@example.com',
      role: 'admin',
    }),
  )
  memberClient = createAppClient(
    await createSessionHeaders({
      email: 'report-user@example.com',
    }),
  )
})

describe('report route', () => {
  it('returns read responses with expected messages', async () => {
    await expectJsonResponse(
      await createAppClient().api.v0.report.$get({ query: {} }),
      {
        status: 401,
        message: 'User is not authenticated',
        description: null,
      },
    )

    const listJson = await expectJsonResponse<{
      data: { id: string }[]
      totalCount: number
    }>(await memberClient.api.v0.report.$get({ query: {} }), {
      status: 200,
      message: 'OK',
    })
    expect(listJson.data.totalCount).toBeGreaterThanOrEqual(1)
    expect(
      listJson.data.data.some((item) => item.id === seededIds.report),
    ).toBe(true)

    const detailJson = await expectJsonResponse<{ id: string }>(
      await memberClient.api.v0.report[':id'].$get({
        param: { id: seededIds.report },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )
    expect(detailJson.data.id).toBe(seededIds.report)

    await expectJsonResponse(
      await memberClient.api.v0.report[':id'].$get({
        param: { id: 'missing-report' },
      }),
      {
        status: 404,
        message: 'Failed to get report',
      },
    )
  })

  it('returns write auth and success messages', async () => {
    await expectJsonResponse(
      await memberClient.api.v0.report.$post({
        json: {
          name: 'Forbidden report',
        },
      }),
      {
        status: 403,
        message: 'User is not authorized',
        description: null,
      },
    )

    const createdJson = await expectJsonResponse<{ id: string }>(
      await adminClient.api.v0.report.$post({
        json: {
          name: 'Created report',
          description: 'Created in test',
        },
      }),
      {
        status: 201,
        message: 'Report created',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0.report[':id'].$patch({
        param: { id: createdJson.data.id },
        json: {
          description: 'Updated report',
          content: {},
        },
      }),
      {
        status: 200,
        message: 'Report updated',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0.report[':id'].$delete({
        param: { id: createdJson.data.id },
      }),
      {
        status: 200,
        message: 'Report deleted',
      },
    )
  })
})
