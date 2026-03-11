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
      email: 'product-output-admin@example.com',
      role: 'admin',
    }),
  )
  memberClient = createAppClient(
    await createSessionHeaders({
      email: 'product-output-user@example.com',
    }),
  )
})

describe('product-output route', () => {
  it('returns read responses with expected messages', async () => {
    await expectJsonResponse(
      await createAppClient().api.v0['product-output'][':id'].$get({
        param: { id: seededIds.productOutputTasmania2021 },
      }),
      {
        status: 401,
        message: 'User is not authenticated',
        description: null,
      },
    )

    const detailJson = await expectJsonResponse<{
      id: string
      indicator: { id: string } | null
    }>(
      await memberClient.api.v0['product-output'][':id'].$get({
        param: { id: seededIds.productOutputTasmania2021 },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )
    expect(detailJson.data.id).toBe(seededIds.productOutputTasmania2021)
    expect(detailJson.data.indicator?.id).toBe(seededIds.indicator)

    await expectJsonResponse(
      await memberClient.api.v0['product-output'][':id'].$get({
        param: { id: 'missing-product-output' },
      }),
      {
        status: 404,
        message: 'Failed to get productOutput',
        description: "productOutput you're looking for is not found",
      },
    )
  })

  it('returns write auth and success messages', async () => {
    await expectJsonResponse(
      await memberClient.api.v0['product-output'].$post({
        json: {
          productRunId: seededIds.productRun,
          geometryOutputId: seededIds.tasmaniaGeometryOutput,
          indicatorId: seededIds.indicator,
          timePoint: '2023-01-01T00:00:00.000Z',
          value: 123,
        },
      }),
      {
        status: 403,
        message: 'User is not authorized',
        description: null,
      },
    )

    const createdJson = await expectJsonResponse<{ id: string }>(
      await adminClient.api.v0['product-output'].$post({
        json: {
          productRunId: seededIds.productRun,
          geometryOutputId: seededIds.tasmaniaGeometryOutput,
          indicatorId: seededIds.indicator,
          timePoint: '2023-01-01T00:00:00.000Z',
          value: 123,
        },
      }),
      {
        status: 201,
        message: 'Product output created',
      },
    )

    const bulkJson = await expectJsonResponse<{ id: string }[]>(
      await adminClient.api.v0['product-output'].bulk.$post({
        json: {
          productRunId: seededIds.productRun,
          indicatorId: seededIds.indicator,
          timePoint: '2024-01-01T00:00:00.000Z',
          outputs: [
            {
              geometryOutputId: seededIds.tasmaniaGeometryOutput,
              value: 500,
            },
            {
              geometryOutputId: seededIds.mainlandGeometryOutput,
              value: 600,
            },
          ],
        },
      }),
      {
        status: 201,
        message: 'Product output created',
      },
    )
    expect(bulkJson.data).toHaveLength(2)

    await expectJsonResponse(
      await adminClient.api.v0['product-output'][':id'].$patch({
        param: { id: createdJson.data.id },
        json: {
          description: 'Updated product output',
        },
      }),
      {
        status: 200,
        message: 'Product output updated',
      },
    )

    const importJson = await expectJsonResponse<{
      insertedCount: number
      warnings: { message: string }[]
    }>(
      await adminClient.api.v0['product-output'].import.$post({
        form: {
          productRunId: seededIds.productRun,
          geometryColumn: 'geometryId',
          indicatorMappings: JSON.stringify([
            {
              column: 'forest_area',
              indicatorId: seededIds.indicator,
              timePoint: '2025-01-01T00:00:00.000Z',
            },
          ]),
          csvFile: new File(
            [
              ['geometryId,forest_area', 'tasmania,111', 'mainland,222'].join(
                '\n',
              ),
            ],
            'outputs.csv',
            { type: 'text/csv' },
          ),
        },
      }),
      {
        status: 201,
        message: 'Product outputs imported successfully',
      },
    )
    expect(importJson.data.insertedCount).toBe(2)
    expect(importJson.data.warnings).toEqual([])
  })
})
