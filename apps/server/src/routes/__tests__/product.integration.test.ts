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
  const createUsageArtifacts = async () => {
    const reportJson = await expectJsonResponse<{ id: string }>(
      await adminClient.api.v0.report.$post({
        json: {
          name: 'Product usage report',
        },
      }),
      {
        status: 201,
        message: 'Report created',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0.report[':id'].$patch({
        param: { id: reportJson.data.id },
        json: {
          content: {
            type: 'doc',
            content: [
              {
                type: 'chart',
                attrs: {
                  chart: {
                    type: 'plot',
                    subType: 'line',
                    productRunId: seededIds.productRun,
                    indicatorIds: [seededIds.indicator],
                    geometryOutputIds: [seededIds.tasmaniaGeometryOutput],
                    timePoints: ['2021-01-01T00:00:00.000Z'],
                  },
                },
              },
            ],
          },
        },
      }),
      {
        status: 200,
        message: 'Report updated',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0.dashboard.$post({
        json: {
          name: 'Product usage dashboard',
          content: {
            charts: {
              primary: {
                type: 'plot',
                subType: 'line',
                productRunId: seededIds.productRun,
                indicatorIds: [seededIds.indicator],
                geometryOutputIds: [seededIds.tasmaniaGeometryOutput],
                timePoints: ['2021-01-01T00:00:00.000Z'],
              },
            },
            layout: [{ i: 'primary', x: 0, y: 0, w: 4, h: 3 }],
          },
        },
      }),
      {
        status: 201,
        message: 'Dashboard created',
      },
    )
  }

  it('returns read responses with expected messages', async () => {
    await createUsageArtifacts()

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
