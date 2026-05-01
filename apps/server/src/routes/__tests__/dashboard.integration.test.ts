import { beforeEach, describe, expect, it } from 'vitest'
import type { PlotChartConfiguration } from '@repo/schemas/chart'
import type { DashboardContent } from '@repo/schemas/crud'
import { eq } from 'drizzle-orm'
import { dashboardIndicatorUsage } from '~/schemas/db'
import { seededIds, setupIsolatedTestFile } from '~/test-utils/integration'
import {
  expectBoundsToMatch,
  expectJsonResponse,
  remoteNoMatchBoundsFilter,
  seededFullRunBounds,
  seededTasmaniaBounds,
  tasmaniaBoundsFilter,
} from './test-helpers'

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
  const buildChart = (
    overrides: Partial<PlotChartConfiguration> = {},
  ): PlotChartConfiguration => ({
    type: 'plot',
    subType: 'line',
    productRunId: seededIds.productRun,
    indicatorIds: [seededIds.indicator],
    timePoints: ['2021-01-01T00:00:00.000Z'],
    ...overrides,
  })

  const buildDashboardContent = (
    ...charts: PlotChartConfiguration[]
  ): DashboardContent => ({
    charts: Object.fromEntries(
      charts.map((chart, index) => [`chart-${index}`, chart]),
    ),
    layout: charts.map((_, index) => ({
      i: `chart-${index}`,
      x: index * 2,
      y: 0,
      w: 4,
      h: 3,
    })),
  })

  const createDashboard = async (name: string, content?: DashboardContent) => {
    const nextContent = content ?? { charts: {}, layout: [] }

    const createdJson = await expectJsonResponse<{ id: string }>(
      await adminClient.api.v0.dashboard.$post({
        json: {
          name,
          content: nextContent,
        },
      }),
      {
        status: 201,
        message: 'Dashboard created',
      },
    )

    return createdJson.data.id
  }

  const createDashboardWithChartUsage = async (indicatorId: string) => {
    return createDashboard(
      `Chart dashboard ${indicatorId}`,
      buildDashboardContent(
        buildChart({
          indicatorIds: [indicatorId],
          geometryOutputIds: [seededIds.tasmaniaGeometryOutput],
        }),
      ),
    )
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

  it('derives live dashboard sources from chart usage', async () => {
    const dashboardId = await createDashboardWithChartUsage(seededIds.indicator)

    const detailJson = await expectJsonResponse<{
      sources: {
        resourceType: 'product' | 'dataset' | 'geometries'
        id: string
      }[]
    }>(
      await memberClient.api.v0.dashboard[':id'].$get({
        param: { id: dashboardId },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    const productSources = detailJson.data.sources.filter(
      (source) => source.resourceType === 'product',
    )
    const datasetSources = detailJson.data.sources.filter(
      (source) => source.resourceType === 'dataset',
    )
    const geometriesSources = detailJson.data.sources.filter(
      (source) => source.resourceType === 'geometries',
    )

    expect(productSources.map((source) => source.id)).toEqual([
      seededIds.product,
    ])
    expect(datasetSources.map((source) => source.id)).toEqual([
      seededIds.dataset,
    ])
    expect(geometriesSources.map((source) => source.id)).toEqual([
      seededIds.geometries,
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

  it('stores dashboard bounds from explicit map bbox over geometry output selections', async () => {
    const dashboardId = await createDashboard(
      'Map bbox precedence dashboard',
      buildDashboardContent(
        buildChart({
          geometryOutputIds: [seededIds.tasmaniaGeometryOutput],
          appearance: {
            mapBbox: {
              minLon: -9,
              minLat: 51,
              maxLon: -6,
              maxLat: 53,
            },
          },
        }),
      ),
    )

    const detailJson = await expectJsonResponse<{
      bounds: {
        minX: number
        minY: number
        maxX: number
        maxY: number
      } | null
    }>(
      await memberClient.api.v0.dashboard[':id'].$get({
        param: { id: dashboardId },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    expectBoundsToMatch(detailJson.data.bounds, {
      minX: -9,
      minY: 51,
      maxX: -6,
      maxY: 53,
    })
  })

  it('stores dashboard bounds from explicit geometry outputs before whole-run fallback', async () => {
    const dashboardId = await createDashboard(
      'Geometry bounds dashboard',
      buildDashboardContent(
        buildChart({
          geometryOutputIds: [seededIds.tasmaniaGeometryOutput],
        }),
      ),
    )

    const detailJson = await expectJsonResponse<{
      bounds: {
        minX: number
        minY: number
        maxX: number
        maxY: number
      } | null
    }>(
      await memberClient.api.v0.dashboard[':id'].$get({
        param: { id: dashboardId },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    expectBoundsToMatch(detailJson.data.bounds, seededTasmaniaBounds)
  })

  it('stores dashboard bounds from whole geometries run when no chart geometry outputs are selected', async () => {
    const dashboardId = await createDashboard(
      'Run fallback dashboard',
      buildDashboardContent(buildChart()),
    )

    const detailJson = await expectJsonResponse<{
      bounds: {
        minX: number
        minY: number
        maxX: number
        maxY: number
      } | null
    }>(
      await memberClient.api.v0.dashboard[':id'].$get({
        param: { id: dashboardId },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    expectBoundsToMatch(detailJson.data.bounds, seededFullRunBounds)
  })

  it('unions dashboard bounds across chart cards and filters by stored bounds', async () => {
    const dashboardId = await createDashboard(
      'Union bounds dashboard',
      buildDashboardContent(
        buildChart({
          geometryOutputIds: [seededIds.tasmaniaGeometryOutput],
        }),
        buildChart({
          appearance: {
            mapBbox: {
              minLon: -9,
              minLat: 51,
              maxLon: -6,
              maxLat: 53,
            },
          },
        }),
      ),
    )

    const detailJson = await expectJsonResponse<{
      bounds: {
        minX: number
        minY: number
        maxX: number
        maxY: number
      } | null
    }>(
      await memberClient.api.v0.dashboard[':id'].$get({
        param: { id: dashboardId },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    expectBoundsToMatch(detailJson.data.bounds, {
      minX: -9,
      minY: seededTasmaniaBounds.minY,
      maxX: seededTasmaniaBounds.maxX,
      maxY: 53,
    })

    const matchingJson = await expectJsonResponse<{
      data: { id: string }[]
    }>(
      await memberClient.api.v0.dashboard.$get({
        query: tasmaniaBoundsFilter,
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    expect(matchingJson.data.data.map((item) => item.id)).toContain(dashboardId)

    const noMatchJson = await expectJsonResponse<{
      data: { id: string }[]
    }>(
      await memberClient.api.v0.dashboard.$get({
        query: remoteNoMatchBoundsFilter,
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    expect(noMatchJson.data.data.map((item) => item.id)).not.toContain(
      dashboardId,
    )
  })

  it('duplicates a dashboard into a new private editable copy with synced chart usage', async () => {
    const dashboardId = await createDashboardWithChartUsage(seededIds.indicator)

    const duplicatedJson = await expectJsonResponse<{
      id: string
      name: string
      visibility: string
    }>(
      await adminClient.api.v0.dashboard[':id'].duplicate.$post({
        param: { id: dashboardId },
      }),
      {
        status: 201,
        message: 'Dashboard duplicated',
      },
    )

    expect(duplicatedJson.data.id).not.toBe(dashboardId)
    expect(duplicatedJson.data.name).toBe(
      `Chart dashboard ${seededIds.indicator} (Copy)`,
    )
    expect(duplicatedJson.data.visibility).toBe('private')

    expect(
      await db.query.dashboardIndicatorUsage.findMany({
        where: eq(dashboardIndicatorUsage.dashboardId, duplicatedJson.data.id),
      }),
    ).toEqual([
      expect.objectContaining({
        dashboardId: duplicatedJson.data.id,
        productRunId: seededIds.productRun,
        indicatorId: seededIds.indicator,
        derivedIndicatorId: null,
      }),
    ])
  })
})
