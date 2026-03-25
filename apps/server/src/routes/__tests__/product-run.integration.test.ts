import { beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { dashboardIndicatorUsage, product, productOutput } from '~/schemas/db'
import { seededIds, setupIsolatedTestFile } from '~/test-utils/integration'
import { expectJsonResponse } from './test-helpers'

const { createAppClient, createSessionHeaders, db } =
  await setupIsolatedTestFile(import.meta.url)

let adminClient: ReturnType<typeof createAppClient>
let memberClient: ReturnType<typeof createAppClient>

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
  it('returns read responses with expected messages', async () => {
    await expectJsonResponse(
      await createAppClient().api.v0['product-run'][':id'].$get({
        param: { id: seededIds.productRun },
      }),
      {
        status: 401,
        message: 'User is not authenticated',
        description: null,
      },
    )

    const detailJson = await expectJsonResponse<{
      id: string
      outputSummary: {
        outputCount: number
        indicators: { indicator: { id: string } | null }[]
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
    expect(detailJson.data.id).toBe(seededIds.productRun)
    expect(detailJson.data.outputSummary?.outputCount).toBe(4)
    expect(
      detailJson.data.outputSummary?.indicators.some(
        (entry) => entry.indicator?.id === seededIds.indicator,
      ),
    ).toBe(true)

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
})
