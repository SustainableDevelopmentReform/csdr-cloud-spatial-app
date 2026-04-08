import { beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { reportIndicatorUsage } from '~/schemas/db'
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
  const buildChart = (
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> => ({
    type: 'plot',
    subType: 'line',
    productRunId: seededIds.productRun,
    indicatorIds: [seededIds.indicator],
    timePoints: ['2021-01-01T00:00:00.000Z'],
    ...overrides,
  })

  const buildReportContent = (...charts: Record<string, unknown>[]) => ({
    type: 'doc',
    content: charts.map((chart) => ({
      type: 'chart',
      attrs: { chart },
    })),
  })

  const createReport = async (name: string) => {
    const createdJson = await expectJsonResponse<{ id: string }>(
      await adminClient.api.v0.report.$post({
        json: { name },
      }),
      {
        status: 201,
        message: 'Report created',
      },
    )

    return createdJson.data.id
  }

  const validReportContent = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Updated report content' }],
      },
    ],
  }

  const createReportWithChartUsage = async (indicatorId: string) => {
    const reportId = await createReport(`Chart report ${indicatorId}`)

    await expectJsonResponse(
      await adminClient.api.v0.report[':id'].$patch({
        param: { id: reportId },
        json: {
          content: buildReportContent(
            buildChart({
              indicatorIds: [indicatorId],
              geometryOutputIds: [seededIds.tasmaniaGeometryOutput],
            }),
          ),
        },
      }),
      {
        status: 200,
        message: 'Report updated',
      },
    )

    return reportId
  }

  it('returns read responses with expected messages', async () => {
    const anonymousListJson = await expectJsonResponse<{
      data: { id: string }[]
      totalCount: number
    }>(await createAppClient().api.v0.report.$get({ query: {} }), {
      status: 200,
      message: 'OK',
    })
    expect(anonymousListJson.data.totalCount).toBe(0)
    expect(anonymousListJson.data.data).toEqual([])

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
          content: validReportContent,
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

  it('rejects invalid stored report content payloads', async () => {
    const createdJson = await expectJsonResponse<{ id: string }>(
      await adminClient.api.v0.report.$post({
        json: {
          name: 'Validated report',
        },
      }),
      {
        status: 201,
        message: 'Report created',
      },
    )

    const invalidJson = await expectJsonResponse<{
      issues: { path: string; message: string; code: string }[]
    }>(
      await adminClient.api.v0.report[':id'].$patch({
        param: { id: createdJson.data.id },
        json: {
          content: {},
        },
      }),
      {
        status: 422,
        message: 'Validation Error',
      },
    )

    expect(invalidJson.data.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'type',
          message: 'Invalid input: expected "doc"',
        }),
      ]),
    )
  })

  it('syncs report indicator usage rows from chart content', async () => {
    const createdJson = await expectJsonResponse<{ id: string }>(
      await adminClient.api.v0.report.$post({
        json: {
          name: 'Chart report',
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

    expect(
      await db.query.reportIndicatorUsage.findMany({
        where: eq(reportIndicatorUsage.reportId, createdJson.data.id),
      }),
    ).toEqual([
      expect.objectContaining({
        reportId: createdJson.data.id,
        productRunId: seededIds.productRun,
        indicatorId: seededIds.indicator,
        derivedIndicatorId: null,
      }),
    ])

    await expectJsonResponse(
      await adminClient.api.v0.report[':id'].$patch({
        param: { id: createdJson.data.id },
        json: {
          content: validReportContent,
        },
      }),
      {
        status: 200,
        message: 'Report updated',
      },
    )

    expect(
      await db.query.reportIndicatorUsage.findMany({
        where: eq(reportIndicatorUsage.reportId, createdJson.data.id),
      }),
    ).toEqual([])
  })

  it('filters reports by chart usage relationships', async () => {
    const reportId = await createReportWithChartUsage(seededIds.indicator)

    const filters = [
      { indicatorId: seededIds.indicator },
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
      }>(await memberClient.api.v0.report.$get({ query }), {
        status: 200,
        message: 'OK',
      })

      const returnedIds = filteredJson.data.data.map((item) => item.id)
      expect(returnedIds).toContain(reportId)
      expect(returnedIds).not.toContain(seededIds.report)
    }
  })

  it('stores report bounds from explicit map bbox over geometry output selections', async () => {
    const reportId = await createReport('Map bbox precedence report')

    await expectJsonResponse(
      await adminClient.api.v0.report[':id'].$patch({
        param: { id: reportId },
        json: {
          content: buildReportContent(
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
        },
      }),
      {
        status: 200,
        message: 'Report updated',
      },
    )

    const detailJson = await expectJsonResponse<{
      bounds: {
        minX: number
        minY: number
        maxX: number
        maxY: number
      } | null
    }>(
      await memberClient.api.v0.report[':id'].$get({
        param: { id: reportId },
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

  it('stores report bounds from explicit geometry outputs before whole-run fallback', async () => {
    const reportId = await createReport('Geometry bounds report')

    await expectJsonResponse(
      await adminClient.api.v0.report[':id'].$patch({
        param: { id: reportId },
        json: {
          content: buildReportContent(
            buildChart({
              geometryOutputIds: [seededIds.tasmaniaGeometryOutput],
            }),
          ),
        },
      }),
      {
        status: 200,
        message: 'Report updated',
      },
    )

    const detailJson = await expectJsonResponse<{
      bounds: {
        minX: number
        minY: number
        maxX: number
        maxY: number
      } | null
    }>(
      await memberClient.api.v0.report[':id'].$get({
        param: { id: reportId },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    expectBoundsToMatch(detailJson.data.bounds, seededTasmaniaBounds)
  })

  it('stores report bounds from whole geometries run when no chart geometry outputs are selected', async () => {
    const reportId = await createReport('Run fallback report')

    await expectJsonResponse(
      await adminClient.api.v0.report[':id'].$patch({
        param: { id: reportId },
        json: {
          content: buildReportContent(buildChart()),
        },
      }),
      {
        status: 200,
        message: 'Report updated',
      },
    )

    const detailJson = await expectJsonResponse<{
      bounds: {
        minX: number
        minY: number
        maxX: number
        maxY: number
      } | null
    }>(
      await memberClient.api.v0.report[':id'].$get({
        param: { id: reportId },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    expectBoundsToMatch(detailJson.data.bounds, seededFullRunBounds)
  })

  it('unions report bounds across all chart rectangles and filters by stored bounds', async () => {
    const reportId = await createReport('Union bounds report')

    await expectJsonResponse(
      await adminClient.api.v0.report[':id'].$patch({
        param: { id: reportId },
        json: {
          content: buildReportContent(
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
        },
      }),
      {
        status: 200,
        message: 'Report updated',
      },
    )

    const detailJson = await expectJsonResponse<{
      bounds: {
        minX: number
        minY: number
        maxX: number
        maxY: number
      } | null
    }>(
      await memberClient.api.v0.report[':id'].$get({
        param: { id: reportId },
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
      await memberClient.api.v0.report.$get({
        query: tasmaniaBoundsFilter,
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    expect(matchingJson.data.data.map((item) => item.id)).toContain(reportId)

    const noMatchJson = await expectJsonResponse<{
      data: { id: string }[]
    }>(
      await memberClient.api.v0.report.$get({
        query: remoteNoMatchBoundsFilter,
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    expect(noMatchJson.data.data.map((item) => item.id)).not.toContain(reportId)
  })
})
