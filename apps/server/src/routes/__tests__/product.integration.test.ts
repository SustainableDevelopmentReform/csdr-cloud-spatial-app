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
      email: 'product-admin@example.com',
      role: 'admin',
    }),
  )
  memberClient = createAppClient(
    await createSessionHeaders({
      email: 'product-user@example.com',
    }),
  )
})

describe('product route', () => {
  it('returns read responses with expected messages', async () => {
    await expectJsonResponse(
      await createAppClient().api.v0.product.$get({ query: {} }),
      {
        status: 401,
        message: 'User is not authenticated',
        description: null,
      },
    )

    const listJson = await expectJsonResponse<{
      data: { id: string }[]
      totalCount: number
    }>(await memberClient.api.v0.product.$get({ query: {} }), {
      status: 200,
      message: 'OK',
    })
    expect(listJson.data.totalCount).toBeGreaterThanOrEqual(1)
    expect(
      listJson.data.data.some((item) => item.id === seededIds.product),
    ).toBe(true)

    const detailJson = await expectJsonResponse<{
      id: string
      mainRun: { id: string } | null
      dataset: { id: string } | null
      geometries: { id: string } | null
      runCount: number
    }>(
      await memberClient.api.v0.product[':id'].$get({
        param: { id: seededIds.product },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )
    expect(detailJson.data.id).toBe(seededIds.product)
    expect(detailJson.data.mainRun?.id).toBe(seededIds.productRun)
    expect(detailJson.data.dataset?.id).toBe(seededIds.dataset)
    expect(detailJson.data.geometries?.id).toBe(seededIds.geometries)
    expect(detailJson.data.runCount).toBe(1)

    const runsJson = await expectJsonResponse<{
      data: { id: string }[]
      totalCount: number
    }>(
      await memberClient.api.v0.product[':id'].runs.$get({
        param: { id: seededIds.product },
        query: {},
      }),
      {
        status: 200,
        message: 'OK',
      },
    )
    expect(runsJson.data.totalCount).toBe(1)

    await expectJsonResponse(
      await memberClient.api.v0.product[':id'].$get({
        param: { id: 'missing-product' },
      }),
      {
        status: 404,
        message: 'Failed to get product',
      },
    )
  })

  it('returns write auth and success messages', async () => {
    await expectJsonResponse(
      await memberClient.api.v0.product.$post({
        json: {
          name: 'Forbidden product',
          timePrecision: 'year',
        },
      }),
      {
        status: 403,
        message: 'User is not authorized',
        description: null,
      },
    )

    const createdJson = await expectJsonResponse<{ id: string }>(
      await adminClient.api.v0.product.$post({
        json: {
          name: 'Created product',
          description: 'Created in test',
          datasetId: seededIds.dataset,
          geometriesId: seededIds.geometries,
          timePrecision: 'year',
        },
      }),
      {
        status: 201,
        message: 'Product created',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0.product[':id'].$patch({
        param: { id: createdJson.data.id },
        json: {
          description: 'Updated product',
        },
      }),
      {
        status: 200,
        message: 'Product updated',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0.product[':id'].$delete({
        param: { id: createdJson.data.id },
      }),
      {
        status: 200,
        message: 'Product deleted',
      },
    )
  })
})
