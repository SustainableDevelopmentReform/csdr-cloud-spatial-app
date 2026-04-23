import { beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import {
  dashboardIndicatorUsage,
  dataset,
  datasetRun,
  geometries,
  geometriesRun,
  indicator,
  organization,
  product,
  productOutput,
  productRun,
  productRunAssignedDerivedIndicator,
  productRunAssignedDerivedIndicatorDependency,
} from '~/schemas/db'
import { seededIds, setupIsolatedTestFile } from '~/test-utils/integration'
import {
  expectBoundsToMatch,
  expectJsonResponse,
  noMatchBoundsFilter,
  seededFullRunBounds,
  tasmaniaBoundsFilter,
} from './test-helpers'

const { createAppClient, createSessionHeaders, db } =
  await setupIsolatedTestFile(import.meta.url)

let adminClient: ReturnType<typeof createAppClient>
let memberClient: ReturnType<typeof createAppClient>

const createExtraDatasetRun = async (suffix: string) => {
  const now = new Date('2025-03-01T00:00:00.000Z')
  const datasetId = `${suffix}-dataset`
  const datasetRunId = `${suffix}-dataset-run`

  await db.insert(dataset).values({
    id: datasetId,
    name: `${suffix} dataset`,
    description: null,
    metadata: null,
    organizationId: seededIds.organization,
    createdByUserId: seededIds.adminUser,
    visibility: 'private',
    createdAt: now,
    updatedAt: now,
    sourceUrl: null,
    sourceMetadataUrl: null,
    mainRunId: null,
  })

  await db.insert(datasetRun).values({
    id: datasetRunId,
    name: `${suffix} dataset run`,
    description: null,
    metadata: null,
    createdAt: now,
    updatedAt: now,
    datasetId,
    imageCode: null,
    imageTag: null,
    provenanceJson: null,
    provenanceUrl: null,
    dataUrl: null,
    dataType: 'parquet',
    dataSize: null,
    dataEtag: null,
  })

  return datasetRunId
}

const createExtraGeometriesRun = async (suffix: string) => {
  const now = new Date('2025-03-01T00:00:00.000Z')
  const geometriesId = `${suffix}-geometries`
  const geometriesRunId = `${suffix}-geometries-run`

  await db.insert(geometries).values({
    id: geometriesId,
    name: `${suffix} geometries`,
    description: null,
    metadata: null,
    organizationId: seededIds.organization,
    createdByUserId: seededIds.adminUser,
    visibility: 'private',
    createdAt: now,
    updatedAt: now,
    sourceUrl: null,
    sourceMetadataUrl: null,
    mainRunId: null,
  })

  await db.insert(geometriesRun).values({
    id: geometriesRunId,
    name: `${suffix} geometries run`,
    description: null,
    metadata: null,
    createdAt: now,
    updatedAt: now,
    geometriesId,
    imageCode: null,
    imageTag: null,
    provenanceJson: null,
    provenanceUrl: null,
    dataUrl: null,
    dataPmtilesUrl: null,
    dataType: 'geoparquet',
    dataSize: null,
    dataEtag: null,
  })

  return {
    geometriesId,
    geometriesRunId,
  }
}

const createProductRunFixture = async (options: {
  suffix: string
  geometriesId: string
  geometriesRunId: string
  organizationId?: string
}) => {
  const now = new Date('2025-03-01T00:00:00.000Z')
  const organizationId = options.organizationId ?? seededIds.organization
  const productId = `${options.suffix}-product`
  const productRunId = `${options.suffix}-product-run`

  if (organizationId !== seededIds.organization) {
    await db.insert(organization).values({
      id: organizationId,
      slug: organizationId,
      name: `${options.suffix} organization`,
      createdAt: now,
      metadata: '{}',
    })
  }

  await db.insert(product).values({
    id: productId,
    name: `${options.suffix} product`,
    description: null,
    metadata: null,
    organizationId,
    createdByUserId: seededIds.adminUser,
    visibility: 'private',
    createdAt: now,
    updatedAt: now,
    datasetId: seededIds.dataset,
    geometriesId: options.geometriesId,
    mainRunId: null,
  })

  await db.insert(productRun).values({
    id: productRunId,
    name: `${options.suffix} product run`,
    description: null,
    metadata: null,
    createdAt: now,
    updatedAt: now,
    productId,
    datasetRunId: seededIds.datasetRun,
    geometriesRunId: options.geometriesRunId,
    imageCode: null,
    imageTag: null,
    provenanceJson: null,
    provenanceUrl: null,
    dataUrl: null,
    dataType: 'parquet',
    dataSize: null,
    dataEtag: null,
  })

  return productRunId
}

const createUnrelatedIndicator = async () => {
  const now = new Date('2025-03-01T00:00:00.000Z')
  const indicatorId = 'unrelated-product-run-indicator'

  await db.insert(indicator).values({
    id: indicatorId,
    name: 'Unrelated Product Run Indicator',
    categoryId: seededIds.indicatorCategory,
    description: null,
    unit: 'count',
    displayOrder: 5,
    metadata: null,
    organizationId: seededIds.organization,
    createdByUserId: seededIds.adminUser,
    visibility: 'private',
    createdAt: now,
    updatedAt: now,
  })

  return indicatorId
}

beforeEach(async () => {
  adminClient = createAppClient(
    await createSessionHeaders({
      email: 'product-run-admin@example.com',
      role: 'admin',
    }),
  )
  memberClient = createAppClient(
    await createSessionHeaders({
      email: 'product-run-user@example.com',
    }),
  )
})

describe('product-run route', () => {
  const createUsageArtifacts = async () => {
    const reportJson = await expectJsonResponse<{ id: string }>(
      await adminClient.api.v0.report.$post({
        json: {
          name: 'Product run usage report',
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
          name: 'Product run usage dashboard',
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
      await createAppClient().api.v0['product-run'][':id'].$get({
        param: { id: seededIds.productRun },
      }),
      {
        status: 404,
        message: 'Failed to get productRun',
        description: "productRun you're looking for is not found",
      },
    )

    const detailJson = await expectJsonResponse<{
      id: string
      outputSummary: {
        outputCount: number
        indicators: { indicator: { id: string } | null }[]
      } | null
      reportCount: number
      dashboardCount: number
    }>(
      await memberClient.api.v0['product-run'][':id'].$get({
        param: { id: seededIds.productRun },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )
    expect(detailJson.data.id).toBe(seededIds.productRun)
    expect(detailJson.data.outputSummary?.outputCount).toBe(4)
    expect(
      detailJson.data.outputSummary?.indicators.some(
        (entry) => entry.indicator?.id === seededIds.indicator,
      ),
    ).toBe(true)
    expect(detailJson.data.reportCount).toBe(1)
    expect(detailJson.data.dashboardCount).toBe(1)

    const outputsJson = await expectJsonResponse<{
      data: { id: string }[]
      totalCount: number
    }>(
      await memberClient.api.v0['product-run'][':id'].outputs.$get({
        param: { id: seededIds.productRun },
        query: {},
      }),
      {
        status: 200,
        message: 'OK',
      },
    )
    expect(outputsJson.data.totalCount).toBe(4)

    const exportJson = await expectJsonResponse<{
      data: { id: string }[]
    }>(
      await memberClient.api.v0['product-run'][':id'].outputs.export.$get({
        param: { id: seededIds.productRun },
        query: {},
      }),
      {
        status: 200,
        message: 'OK',
      },
    )
    expect(exportJson.data.data).toHaveLength(4)

    const derivedListJson = await expectJsonResponse<{ id: string }[]>(
      await memberClient.api.v0['product-run'][':id'][
        'derived-indicators'
      ].$get({
        param: { id: seededIds.productRun },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )
    expect(derivedListJson.data).toEqual([])

    await expectJsonResponse(
      await memberClient.api.v0['product-run'][':id'].$get({
        param: { id: 'missing-product-run' },
      }),
      {
        status: 404,
        message: 'Failed to get productRun',
        description: "productRun you're looking for is not found",
      },
    )
  })

  it('returns write auth and success messages', async () => {
    await expectJsonResponse(
      await memberClient.api.v0['product-run'].$post({
        json: {
          productId: seededIds.product,
          name: 'Forbidden product run',
        },
      }),
      {
        status: 403,
        message: 'User is not authorized',
        description: null,
      },
    )

    const createdJson = await expectJsonResponse<{ id: string }>(
      await adminClient.api.v0['product-run'].$post({
        json: {
          productId: seededIds.product,
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
      await adminClient.api.v0['product-run'][':id'].$patch({
        param: { id: createdJson.data.id },
        json: {
          description: 'Updated product run',
        },
      }),
      {
        status: 200,
        message: 'Product run updated',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0['product-run'][':id']['set-as-main-run'].$post({
        param: { id: createdJson.data.id },
      }),
      {
        status: 200,
        message: 'Product run set as main',
      },
    )
    const updatedProduct = await db.query.product.findFirst({
      where: eq(product.id, seededIds.product),
    })
    expect(updatedProduct?.mainRunId).toBe(createdJson.data.id)

    await expectJsonResponse(
      await adminClient.api.v0['product-run'][':id']['refresh-summary'].$post({
        param: { id: seededIds.productRun },
      }),
      {
        status: 200,
        message: 'Product run summary refreshed',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0['product-run'][':id'][
        'derived-indicators'
      ].$post({
        param: { id: seededIds.productRun },
        json: {
          derivedIndicatorId: seededIds.derivedIndicator,
          dependencies: [
            {
              indicatorId: seededIds.indicator,
              sourceProductRunId: seededIds.productRun,
            },
          ],
        },
      }),
      {
        status: 201,
        message: 'Derived indicator assigned',
      },
    )

    const derivedAfterAssignJson = await expectJsonResponse<
      {
        id: string
        derivedIndicator: { id: string }
      }[]
    >(
      await memberClient.api.v0['product-run'][':id'][
        'derived-indicators'
      ].$get({
        param: { id: seededIds.productRun },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )
    expect(derivedAfterAssignJson.data).toHaveLength(1)
    const assignedDerivedIndicator = derivedAfterAssignJson.data[0]

    if (!assignedDerivedIndicator) {
      throw new Error('Expected assigned derived indicator to exist')
    }

    expect(assignedDerivedIndicator.derivedIndicator.id).toBe(
      seededIds.derivedIndicator,
    )

    const computeJson = await expectJsonResponse<{
      productRun: { id: string }
      insertedCount: number
      warnings: { message: string }[]
    }>(
      await adminClient.api.v0['product-run'][':id'][
        'compute-derived-indicators'
      ].$post({
        param: { id: seededIds.productRun },
      }),
      {
        status: 200,
        message: 'Derived indicators computed',
      },
    )
    expect(computeJson.data.productRun.id).toBe(seededIds.productRun)
    expect(computeJson.data.insertedCount).toBe(4)
    expect(computeJson.data.warnings).toEqual([])

    const derivedOutputCount = await db.$count(
      productOutput,
      eq(productOutput.derivedIndicatorId, seededIds.derivedIndicator),
    )
    expect(derivedOutputCount).toBe(4)

    const dashboardJson = await expectJsonResponse<{ id: string }>(
      await adminClient.api.v0.dashboard.$post({
        json: {
          name: 'Derived indicator dashboard',
          content: {
            charts: {
              primary: {
                type: 'plot',
                subType: 'line',
                productRunId: seededIds.productRun,
                indicatorIds: [seededIds.derivedIndicator],
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

    expect(
      await db.query.dashboardIndicatorUsage.findMany({
        where: eq(dashboardIndicatorUsage.dashboardId, dashboardJson.data.id),
      }),
    ).toEqual([
      expect.objectContaining({
        dashboardId: dashboardJson.data.id,
        productRunId: seededIds.productRun,
        indicatorId: null,
        derivedIndicatorId: seededIds.derivedIndicator,
      }),
    ])

    await expectJsonResponse(
      await adminClient.api.v0['product-run'][':id']['derived-indicators'][
        ':assignedDerivedIndicatorId'
      ].$delete({
        param: {
          id: seededIds.productRun,
          assignedDerivedIndicatorId: assignedDerivedIndicator.id,
        },
      }),
      {
        status: 400,
        message: 'Cannot delete derived indicator',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0['product-run'][':id'].$delete({
        param: { id: seededIds.productRun },
      }),
      {
        status: 400,
        message: 'Cannot delete product run',
      },
    )

    const tempRunJson = await expectJsonResponse<{ id: string }>(
      await adminClient.api.v0['product-run'].$post({
        json: {
          productId: seededIds.product,
          datasetRunId: seededIds.datasetRun,
          geometriesRunId: seededIds.geometriesRun,
          name: 'Temporary product run',
        },
      }),
      {
        status: 201,
        message: 'Product run created',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0['product-run'][':id'][
        'derived-indicators'
      ].$post({
        param: { id: tempRunJson.data.id },
        json: {
          derivedIndicatorId: seededIds.derivedIndicator,
          dependencies: [
            {
              indicatorId: seededIds.indicator,
              sourceProductRunId: seededIds.productRun,
            },
          ],
        },
      }),
      {
        status: 201,
        message: 'Derived indicator assigned',
      },
    )

    const tempAssignedJson = await expectJsonResponse<
      {
        id: string
        derivedIndicator: { id: string }
      }[]
    >(
      await memberClient.api.v0['product-run'][':id'][
        'derived-indicators'
      ].$get({
        param: { id: tempRunJson.data.id },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )
    expect(tempAssignedJson.data).toHaveLength(1)
    const tempAssignedIndicator = tempAssignedJson.data[0]

    if (!tempAssignedIndicator) {
      throw new Error('Expected temporary assigned derived indicator to exist')
    }

    await expectJsonResponse(
      await adminClient.api.v0['product-run'][':id']['derived-indicators'][
        ':assignedDerivedIndicatorId'
      ].$delete({
        param: {
          id: tempRunJson.data.id,
          assignedDerivedIndicatorId: tempAssignedIndicator.id,
        },
      }),
      {
        status: 200,
        message: 'Assigned derived indicator deleted',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0['product-run'][':id'].$delete({
        param: { id: tempRunJson.data.id },
      }),
      {
        status: 200,
        message: 'Product run deleted',
      },
    )
  })

  it('rejects product runs whose upstream runs do not match the product', async () => {
    const foreignDatasetRunId = await createExtraDatasetRun(
      'product-run-foreign-dataset',
    )
    const foreignGeometries = await createExtraGeometriesRun(
      'product-run-foreign-geometries',
    )

    await expectJsonResponse(
      await adminClient.api.v0['product-run'].$post({
        json: {
          productId: seededIds.product,
          datasetRunId: foreignDatasetRunId,
          geometriesRunId: seededIds.geometriesRun,
          name: 'Mismatched dataset product run',
        },
      }),
      {
        status: 400,
        message: 'Failed to create productRun',
        description:
          'Dataset run must belong to the dataset declared by the product.',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0['product-run'].$post({
        json: {
          productId: seededIds.product,
          datasetRunId: seededIds.datasetRun,
          geometriesRunId: foreignGeometries.geometriesRunId,
          name: 'Mismatched geometries product run',
        },
      }),
      {
        status: 400,
        message: 'Failed to create productRun',
        description:
          'Geometries run must belong to the geometries declared by the product.',
      },
    )
  })

  it('rejects unsafe derived indicator dependency assignments', async () => {
    const duplicateDependency = {
      indicatorId: seededIds.indicator,
      sourceProductRunId: seededIds.productRun,
    }
    await expectJsonResponse(
      await adminClient.api.v0['product-run'][':id'][
        'derived-indicators'
      ].$post({
        param: { id: seededIds.productRun },
        json: {
          derivedIndicatorId: seededIds.derivedIndicator,
          dependencies: [duplicateDependency, duplicateDependency],
        },
      }),
      {
        status: 400,
        message: 'Failed to assign derived indicator',
        description:
          'Each derived indicator dependency can only be assigned once.',
      },
    )

    const unrelatedIndicatorId = await createUnrelatedIndicator()
    await expectJsonResponse(
      await adminClient.api.v0['product-run'][':id'][
        'derived-indicators'
      ].$post({
        param: { id: seededIds.productRun },
        json: {
          derivedIndicatorId: seededIds.derivedIndicator,
          dependencies: [
            {
              indicatorId: unrelatedIndicatorId,
              sourceProductRunId: seededIds.productRun,
            },
          ],
        },
      }),
      {
        status: 400,
        message: 'Failed to assign derived indicator',
        description:
          'Assigned dependency indicator must be required by the derived indicator.',
      },
    )

    const foreignGeometries = await createExtraGeometriesRun(
      'derived-source-foreign-geometries',
    )
    const differentGeometriesProductRunId = await createProductRunFixture({
      suffix: 'derived-source-foreign-geometries',
      geometriesId: foreignGeometries.geometriesId,
      geometriesRunId: foreignGeometries.geometriesRunId,
    })

    await expectJsonResponse(
      await adminClient.api.v0['product-run'][':id'][
        'derived-indicators'
      ].$post({
        param: { id: seededIds.productRun },
        json: {
          derivedIndicatorId: seededIds.derivedIndicator,
          dependencies: [
            {
              indicatorId: seededIds.indicator,
              sourceProductRunId: differentGeometriesProductRunId,
            },
          ],
        },
      }),
      {
        status: 400,
        message: 'Failed to assign derived indicator',
        description:
          'Dependency source product run must use the same geometries run as the target product run.',
      },
    )

    const privateForeignProductRunId = await createProductRunFixture({
      suffix: 'derived-source-private-foreign',
      geometriesId: seededIds.geometries,
      geometriesRunId: seededIds.geometriesRun,
      organizationId: 'private-foreign-product-run-org',
    })

    await expectJsonResponse(
      await adminClient.api.v0['product-run'][':id'][
        'derived-indicators'
      ].$post({
        param: { id: seededIds.productRun },
        json: {
          derivedIndicatorId: seededIds.derivedIndicator,
          dependencies: [
            {
              indicatorId: seededIds.indicator,
              sourceProductRunId: privateForeignProductRunId,
            },
          ],
        },
      }),
      {
        status: 404,
        message: 'Failed to get productRun',
      },
    )
  })

  it('revalidates persisted derived dependencies before compute', async () => {
    const foreignGeometries = await createExtraGeometriesRun(
      'persisted-derived-foreign-geometries',
    )
    const differentGeometriesProductRunId = await createProductRunFixture({
      suffix: 'persisted-derived-foreign-geometries',
      geometriesId: foreignGeometries.geometriesId,
      geometriesRunId: foreignGeometries.geometriesRunId,
    })
    const assignedDerivedIndicatorId = 'persisted-invalid-derived-assignment'

    await db.insert(productRunAssignedDerivedIndicator).values({
      id: assignedDerivedIndicatorId,
      productRunId: seededIds.productRun,
      derivedIndicatorId: seededIds.derivedIndicator,
    })

    await db.insert(productRunAssignedDerivedIndicatorDependency).values({
      assignedDerivedIndicatorId,
      indicatorId: seededIds.indicator,
      sourceProductRunId: differentGeometriesProductRunId,
    })

    await expectJsonResponse(
      await adminClient.api.v0['product-run'][':id'][
        'compute-derived-indicators'
      ].$post({
        param: { id: seededIds.productRun },
      }),
      {
        status: 400,
        message: 'Failed to compute derived indicators',
        description:
          'Dependency source product run must use the same geometries run as the target product run.',
      },
    )

    const derivedOutputCount = await db.$count(
      productOutput,
      eq(productOutput.derivedIndicatorId, seededIds.derivedIndicator),
    )
    expect(derivedOutputCount).toBe(0)
  })

  it('filters product outputs by intersecting linked geometry outputs', async () => {
    const filteredOutputsJson = await expectJsonResponse<{
      data: { id: string }[]
    }>(
      await memberClient.api.v0['product-run'][':id'].outputs.$get({
        param: { id: seededIds.productRun },
        query: tasmaniaBoundsFilter,
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    expect(filteredOutputsJson.data.data.map((item) => item.id)).toEqual([
      seededIds.productOutputTasmania2022,
      seededIds.productOutputTasmania2021,
    ])

    const noMatchOutputsJson = await expectJsonResponse<{
      data: { id: string }[]
    }>(
      await memberClient.api.v0['product-run'][':id'].outputs.$get({
        param: { id: seededIds.productRun },
        query: noMatchBoundsFilter,
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    expect(noMatchOutputsJson.data.data).toEqual([])
  })

  it('refreshes product summary bounds from linked geometry outputs only', async () => {
    await expectJsonResponse(
      await adminClient.api.v0['dataset-run'][':id'].$patch({
        param: { id: seededIds.datasetRun },
        json: {
          bounds: {
            minX: -10,
            minY: 50,
            maxX: 10,
            maxY: 60,
          },
        },
      }),
      {
        status: 200,
        message: 'Dataset run updated',
      },
    )

    const beforeRefreshJson = await expectJsonResponse<{
      outputSummary: {
        bounds: {
          minX: number
          minY: number
          maxX: number
          maxY: number
        } | null
      } | null
    }>(
      await memberClient.api.v0['product-run'][':id'].$get({
        param: { id: seededIds.productRun },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    expect(beforeRefreshJson.data.outputSummary?.bounds).toBeNull()

    const refreshedJson = await expectJsonResponse<{
      outputSummary: {
        bounds: {
          minX: number
          minY: number
          maxX: number
          maxY: number
        } | null
      } | null
    }>(
      await adminClient.api.v0['product-run'][':id']['refresh-summary'].$post({
        param: { id: seededIds.productRun },
      }),
      {
        status: 200,
        message: 'Product run summary refreshed',
      },
    )

    expectBoundsToMatch(
      refreshedJson.data.outputSummary?.bounds,
      seededFullRunBounds,
    )
  })
})
