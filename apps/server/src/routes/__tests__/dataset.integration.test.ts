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
      email: 'dataset-admin@example.com',
      role: 'admin',
    }),
  )
  memberClient = createAppClient(
    await createSessionHeaders({
      email: 'dataset-user@example.com',
    }),
  )
})

describe('dataset route', () => {
  it('returns read responses with expected messages', async () => {
    await expectJsonResponse(
      await createAppClient().api.v0.dataset.$get({ query: {} }),
      {
        status: 401,
        message: 'User is not authenticated',
        description: null,
      },
    )

    const listJson = await expectJsonResponse<{
      data: { id: string }[]
      totalCount: number
    }>(await memberClient.api.v0.dataset.$get({ query: {} }), {
      status: 200,
      message: 'OK',
    })
    expect(listJson.data.totalCount).toBeGreaterThanOrEqual(1)
    expect(
      listJson.data.data.some((item) => item.id === seededIds.dataset),
    ).toBe(true)

    const detailJson = await expectJsonResponse<{
      id: string
      mainRun: { id: string } | null
      runCount: number
      productCount: number
    }>(
      await memberClient.api.v0.dataset[':id'].$get({
        param: { id: seededIds.dataset },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )
    expect(detailJson.data.id).toBe(seededIds.dataset)
    expect(detailJson.data.mainRun?.id).toBe(seededIds.datasetRun)
    expect(detailJson.data.runCount).toBe(1)
    expect(detailJson.data.productCount).toBe(1)

    const runsJson = await expectJsonResponse<{
      data: { id: string }[]
      totalCount: number
    }>(
      await memberClient.api.v0.dataset[':id'].runs.$get({
        param: { id: seededIds.dataset },
        query: {},
      }),
      {
        status: 200,
        message: 'OK',
      },
    )
    expect(runsJson.data.totalCount).toBe(1)
    expect(runsJson.data.data[0]?.id).toBe(seededIds.datasetRun)

    await expectJsonResponse(
      await memberClient.api.v0.dataset[':id'].$get({
        param: { id: 'missing-dataset' },
      }),
      {
        status: 404,
        message: 'Failed to get dataset',
      },
    )
  })

  it('returns write auth and success messages', async () => {
    await expectJsonResponse(
      await memberClient.api.v0.dataset.$post({
        json: {
          name: 'Forbidden dataset',
        },
      }),
      {
        status: 403,
        message: 'User is not authorized',
        description: null,
      },
    )

    const createdJson = await expectJsonResponse<{ id: string }>(
      await adminClient.api.v0.dataset.$post({
        json: {
          name: 'Created dataset',
          description: 'Created in test',
          sourceUrl: 'https://example.com/datasets/created',
        },
      }),
      {
        status: 201,
        message: 'Dataset created',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0.dataset[':id'].$patch({
        param: { id: createdJson.data.id },
        json: {
          description: 'Updated dataset',
        },
      }),
      {
        status: 200,
        message: 'Dataset updated',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0.dataset[':id'].$delete({
        param: { id: createdJson.data.id },
      }),
      {
        status: 200,
        message: 'Dataset deleted',
      },
    )
  })
})
