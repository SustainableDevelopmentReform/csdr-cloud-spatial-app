import { beforeEach, describe, expect, it } from 'vitest'
import { seededIds, setupIsolatedTestFile } from '~/test-utils/integration'
import {
  createChartUsageArtifacts,
  expectJsonResponse,
  noMatchBoundsFilter,
  tasmaniaBoundsFilter,
} from '~/test-utils/route-test-helpers'

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
    await createChartUsageArtifacts(adminClient, 'Product')

    const anonymousListJson = await expectJsonResponse<{
      data: { id: string }[]
      totalCount: number
    }>(await createAppClient().api.v0.product.$get({ query: {} }), {
      status: 200,
      message: 'OK',
    })
    expect(anonymousListJson.data.totalCount).toBe(0)
    expect(anonymousListJson.data.data).toEqual([])

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
      reportCount: number
      dashboardCount: number
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
    expect(detailJson.data.reportCount).toBe(1)
    expect(detailJson.data.dashboardCount).toBe(1)

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

    const createdRunJson = await expectJsonResponse<{ id: string }>(
      await adminClient.api.v0['product-run'].$post({
        json: {
          productId: createdJson.data.id,
          datasetRunId: seededIds.datasetRun,
          geometriesRunId: seededIds.geometriesRun,
          name: 'Created product run',
        },
      }),
      {
        status: 201,
        message: 'Product run created',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0.product[':id'].$patch({
        param: { id: seededIds.product },
        json: {
          mainRunId: createdRunJson.data.id,
        },
      }),
      {
        status: 404,
        message: 'Failed to get product',
      },
    )

    const mainRunJson = await expectJsonResponse<{
      mainRun: { id: string } | null
    }>(
      await adminClient.api.v0.product[':id'].$patch({
        param: { id: createdJson.data.id },
        json: {
          mainRunId: createdRunJson.data.id,
        },
      }),
      {
        status: 200,
        message: 'Product updated',
      },
    )
    expect(mainRunJson.data.mainRun?.id).toBe(createdRunJson.data.id)

    const clearedMainRunJson = await expectJsonResponse<{
      mainRun: { id: string } | null
    }>(
      await adminClient.api.v0.product[':id'].$patch({
        param: { id: createdJson.data.id },
        json: {
          mainRunId: null,
        },
      }),
      {
        status: 200,
        message: 'Product updated',
      },
    )
    expect(clearedMainRunJson.data.mainRun).toBeNull()

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

  it('filters products and product runs by refreshed product summary bounds', async () => {
    await expectJsonResponse(
      await adminClient.api.v0['product-run'][':id']['refresh-summary'].$post({
        param: { id: seededIds.productRun },
      }),
      {
        status: 200,
        message: 'Product run summary refreshed',
      },
    )

    const matchingProductsJson = await expectJsonResponse<{
      data: { id: string }[]
    }>(
      await memberClient.api.v0.product.$get({
        query: tasmaniaBoundsFilter,
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    expect(matchingProductsJson.data.data.map((item) => item.id)).toContain(
      seededIds.product,
    )

    const matchingRunsJson = await expectJsonResponse<{
      data: { id: string }[]
    }>(
      await memberClient.api.v0.product[':id'].runs.$get({
        param: { id: seededIds.product },
        query: tasmaniaBoundsFilter,
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    expect(matchingRunsJson.data.data.map((item) => item.id)).toContain(
      seededIds.productRun,
    )

    const noMatchProductsJson = await expectJsonResponse<{
      data: { id: string }[]
    }>(
      await memberClient.api.v0.product.$get({
        query: noMatchBoundsFilter,
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    expect(noMatchProductsJson.data.data.map((item) => item.id)).not.toContain(
      seededIds.product,
    )
  })
})
