import { beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { dashboardIndicatorUsage } from '~/schemas/db'
import { seededIds, setupIsolatedTestFile } from '~/test-utils/integration'
import { expectJsonResponse } from './test-helpers'

const { createAppClient, createSessionHeaders, db } =
  await setupIsolatedTestFile(import.meta.url)

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
  const createDashboardWithChartUsage = async (indicatorId: string) => {
    const createdJson = await expectJsonResponse<{ id: string }>(
      await adminClient.api.v0.dashboard.$post({
        json: {
          name: `Chart dashboard ${indicatorId}`,
          content: {
            charts: {
              primary: {
                type: 'plot',
                subType: 'line',
                productRunId: seededIds.productRun,
                indicatorIds: [indicatorId],
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

    return createdJson.data.id
  }

  it('returns read responses with expected messages', async () => {
    const anonymousListJson = await expectJsonResponse<{
      data: { id: string }[]
      totalCount: number
    }>(await createAppClient().api.v0.dashboard.$get({ query: {} }), {
      status: 200,
      message: 'OK',
    })
    expect(anonymousListJson.data.totalCount).toBe(0)
    expect(anonymousListJson.data.data).toEqual([])

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

  it('syncs dashboard indicator usage rows from chart cards', async () => {
    const dashboardId = await createDashboardWithChartUsage(seededIds.indicator)

    expect(
      await db.query.dashboardIndicatorUsage.findMany({
        where: eq(dashboardIndicatorUsage.dashboardId, dashboardId),
      }),
    ).toEqual([
      expect.objectContaining({
        dashboardId,
        productRunId: seededIds.productRun,
        indicatorId: seededIds.indicator,
        derivedIndicatorId: null,
      }),
    ])
  })

  it('filters dashboards by chart usage relationships', async () => {
    const dashboardId = await createDashboardWithChartUsage(
      seededIds.derivedIndicator,
    )

    const filters = [
      { indicatorId: seededIds.derivedIndicator },
      { productId: seededIds.product },
      { productRunId: seededIds.productRun },
      { datasetId: seededIds.dataset },
      { datasetRunId: seededIds.datasetRun },
      { geometriesId: seededIds.geometries },
      { geometriesRunId: seededIds.geometriesRun },
    ]

    for (const query of filters) {
      const filteredJson = await expectJsonResponse<{
        data: { id: string }[]
      }>(await memberClient.api.v0.dashboard.$get({ query }), {
        status: 200,
        message: 'OK',
      })

      const returnedIds = filteredJson.data.data.map((item) => item.id)
      expect(returnedIds).toContain(dashboardId)
      expect(returnedIds).not.toContain(seededIds.dashboard)
    }
  })
})
