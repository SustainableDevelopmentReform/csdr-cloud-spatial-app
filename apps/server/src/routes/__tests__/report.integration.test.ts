import { beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import {
  product,
  productRun,
  productRunAssignedDerivedIndicator,
  productRunAssignedDerivedIndicatorDependency,
  report,
  reportIndicatorUsage,
} from '~/schemas/db'
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

  it('publishes a report, stores PDF metadata, and locks future changes', async () => {
    const createdJson = await expectJsonResponse<{
      id: string
    }>(
      await adminClient.api.v0.report.$post({
        json: {
          name: 'Publishable report',
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
          content: validReportContent,
        },
      }),
      {
        status: 200,
        message: 'Report updated',
      },
    )

    const publishedJson = await expectJsonResponse<{
      id: string
      publishedAt: string | null
      publishedByUserId: string | null
      publishedPdfAvailable: boolean
    }>(
      await adminClient.api.v0.report[':id'].publish.$post({
        param: { id: createdJson.data.id },
      }),
      {
        status: 200,
        message: 'Report published',
      },
    )

    expect(publishedJson.data.publishedAt).not.toBeNull()
    expect(publishedJson.data.publishedByUserId).toBeDefined()
    expect(publishedJson.data.publishedPdfAvailable).toBe(true)

    const storedReport = await db.query.report.findFirst({
      where: eq(report.id, createdJson.data.id),
    })

    expect(storedReport?.publishedAt).not.toBeNull()
    expect(storedReport?.publishedByUserId).not.toBeNull()
    expect(storedReport?.publishedPdfKey).toBe(
      `reports/${createdJson.data.id}/published.pdf`,
    )

    await expectJsonResponse(
      await adminClient.api.v0.report[':id'].$patch({
        param: { id: createdJson.data.id },
        json: {
          description: 'Should fail',
        },
      }),
      {
        status: 409,
        message: 'Report is published',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0.report[':id'].visibility.$patch({
        param: { id: createdJson.data.id },
        json: {
          visibility: 'public',
        },
      }),
      {
        status: 409,
        message: 'Report is published',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0.report[':id'].publish.$post({
        param: { id: createdJson.data.id },
      }),
      {
        status: 409,
        message: 'Report is published',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0.report[':id'].$delete({
        param: { id: createdJson.data.id },
      }),
      {
        status: 409,
        message: 'Report is published',
      },
    )
  })

  it('serves a published report PDF and rejects unpublished reports', async () => {
    const createdJson = await expectJsonResponse<{ id: string }>(
      await adminClient.api.v0.report.$post({
        json: {
          name: 'PDF report',
        },
      }),
      {
        status: 201,
        message: 'Report created',
      },
    )

    await expectJsonResponse(
      await memberClient.api.v0.report[':id'].pdf.$get({
        param: { id: createdJson.data.id },
      }),
      {
        status: 409,
        message: 'Failed to get report PDF',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0.report[':id'].publish.$post({
        param: { id: createdJson.data.id },
      }),
      {
        status: 200,
        message: 'Report published',
      },
    )

    const pdfResponse = await memberClient.api.v0.report[':id'].pdf.$get({
      param: { id: createdJson.data.id },
    })

    expect(pdfResponse.status).toBe(200)
    expect(pdfResponse.headers.get('content-type')).toContain('application/pdf')
    expect((await pdfResponse.arrayBuffer()).byteLength).toBeGreaterThan(0)
  })

  it('derives live report sources from chart usage and dedupes shared datasets and geometries', async () => {
    const dependencyProductId = 'forest-cover-product-dependency'
    const dependencyProductRunId = 'forest-cover-product-run-dependency'
    const assignedDerivedIndicatorId = 'forest-cover-assigned-derived-indicator'

    await db.insert(product).values({
      id: dependencyProductId,
      name: 'Forest Cover Dependency Product',
      description: 'Dependency product for derived indicator sources',
      metadata: null,
      organizationId: seededIds.organization,
      createdByUserId: seededIds.adminUser,
      visibility: 'private',
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      updatedAt: new Date('2025-01-01T00:00:00.000Z'),
      datasetId: seededIds.dataset,
      geometriesId: seededIds.geometries,
      mainRunId: null,
    })

    await db.insert(productRun).values({
      id: dependencyProductRunId,
      name: 'forest-cover-product-run-dependency',
      description: 'Dependency product run for derived indicator sources',
      metadata: null,
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      updatedAt: new Date('2025-01-01T00:00:00.000Z'),
      productId: dependencyProductId,
      datasetRunId: seededIds.datasetRun,
      geometriesRunId: seededIds.geometriesRun,
      imageCode: null,
      imageTag: null,
      provenanceJson: null,
      provenanceUrl: null,
      dataUrl: null,
      dataType: 'parquet',
      dataSize: null,
      dataEtag: null,
    })

    await db.insert(productRunAssignedDerivedIndicator).values({
      id: assignedDerivedIndicatorId,
      productRunId: seededIds.productRun,
      derivedIndicatorId: seededIds.derivedIndicator,
    })

    await db.insert(productRunAssignedDerivedIndicatorDependency).values({
      assignedDerivedIndicatorId,
      indicatorId: seededIds.indicator,
      sourceProductRunId: dependencyProductRunId,
    })

    const createdJson = await expectJsonResponse<{ id: string }>(
      await adminClient.api.v0.report.$post({
        json: {
          name: 'Derived source report',
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
                    indicatorIds: [seededIds.derivedIndicator],
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

    const detailJson = await expectJsonResponse<{
      sources: {
        resourceType: 'product' | 'dataset' | 'geometries'
        id: string
      }[]
    }>(
      await memberClient.api.v0.report[':id'].$get({
        param: { id: createdJson.data.id },
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

    expect(productSources.map((source) => source.id).sort()).toEqual(
      [dependencyProductId, seededIds.product].sort(),
    )
    expect(datasetSources.map((source) => source.id)).toEqual([
      seededIds.dataset,
    ])
    expect(geometriesSources.map((source) => source.id)).toEqual([
      seededIds.geometries,
    ])
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

  it('duplicates a report into a new private unpublished draft with synced chart usage', async () => {
    const reportId = await createReportWithChartUsage(seededIds.indicator)

    const duplicatedJson = await expectJsonResponse<{
      id: string
      name: string
      visibility: string
      publishedAt: string | null
      publishedPdfAvailable: boolean
    }>(
      await adminClient.api.v0.report[':id'].duplicate.$post({
        param: { id: reportId },
      }),
      {
        status: 201,
        message: 'Report duplicated',
      },
    )

    expect(duplicatedJson.data.id).not.toBe(reportId)
    expect(duplicatedJson.data.name).toBe(
      `Chart report ${seededIds.indicator} (Copy)`,
    )
    expect(duplicatedJson.data.visibility).toBe('private')
    expect(duplicatedJson.data.publishedAt).toBeNull()
    expect(duplicatedJson.data.publishedPdfAvailable).toBe(false)

    expect(
      await db.query.reportIndicatorUsage.findMany({
        where: eq(reportIndicatorUsage.reportId, duplicatedJson.data.id),
      }),
    ).toEqual([
      expect.objectContaining({
        reportId: duplicatedJson.data.id,
        productRunId: seededIds.productRun,
        indicatorId: seededIds.indicator,
        derivedIndicatorId: null,
      }),
    ])
  })
})
