import { beforeEach, describe, expect, it } from 'vitest'
import { seededIds, setupIsolatedTestFile } from '~/test-utils/integration'
import {
  createChartUsageArtifacts,
  expectBoundsToMatch,
  expectJsonResponse,
  seededMainlandBounds,
  seededTasmaniaBounds,
} from '~/test-utils/route-test-helpers'

const { createAppClient, createSessionHeaders } = await setupIsolatedTestFile(
  import.meta.url,
)

let adminClient: ReturnType<typeof createAppClient>
let memberClient: ReturnType<typeof createAppClient>

beforeEach(async () => {
  adminClient = createAppClient(
    await createSessionHeaders({
      email: 'dataset-run-admin@example.com',
      role: 'admin',
    }),
  )
  memberClient = createAppClient(
    await createSessionHeaders({
      email: 'dataset-run-user@example.com',
    }),
  )
})

describe('dataset-run route', () => {
  it('returns read responses with expected messages', async () => {
    await createChartUsageArtifacts(adminClient, 'Dataset run')

    await expectJsonResponse(
      await createAppClient().api.v0['dataset-run'][':id'].$get({
        param: { id: seededIds.datasetRun },
      }),
      {
        status: 404,
        message: 'Failed to get datasetRun',
        description: "datasetRun you're looking for is not found",
      },
    )

    const detailJson = await expectJsonResponse<{
      id: string
      dataset: { id: string }
      productRunCount: number
      reportCount: number
      dashboardCount: number
      bounds: {
        minX: number
        minY: number
        maxX: number
        maxY: number
      } | null
    }>(
      await memberClient.api.v0['dataset-run'][':id'].$get({
        param: { id: seededIds.datasetRun },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )
    expect(detailJson.data.id).toBe(seededIds.datasetRun)
    expect(detailJson.data.dataset.id).toBe(seededIds.dataset)
    expect(detailJson.data.productRunCount).toBe(1)
    expect(detailJson.data.reportCount).toBe(1)
    expect(detailJson.data.dashboardCount).toBe(1)
    expect(detailJson.data.bounds).toBeNull()

    await expectJsonResponse(
      await memberClient.api.v0['dataset-run'][':id'].$get({
        param: { id: 'missing-dataset-run' },
      }),
      {
        status: 404,
        message: 'Failed to get datasetRun',
      },
    )
  })

  it('returns write auth and success messages', async () => {
    await expectJsonResponse(
      await memberClient.api.v0['dataset-run'].$post({
        json: {
          datasetId: seededIds.dataset,
          name: 'Forbidden dataset run',
        },
      }),
      {
        status: 403,
        message: 'User is not authorized',
        description: null,
      },
    )

    const createdJson = await expectJsonResponse<{ id: string }>(
      await adminClient.api.v0['dataset-run'].$post({
        json: {
          datasetId: seededIds.dataset,
          name: 'Created dataset run',
        },
      }),
      {
        status: 201,
        message: 'Dataset run created',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0['dataset-run'][':id'].$patch({
        param: { id: createdJson.data.id },
        json: {
          description: 'Updated dataset run',
        },
      }),
      {
        status: 200,
        message: 'Dataset run updated',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0['dataset-run'][':id']['set-as-main-run'].$post({
        param: { id: createdJson.data.id },
      }),
      {
        status: 200,
        message: 'Dataset run set as main',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0['dataset-run'][':id'].$delete({
        param: { id: createdJson.data.id },
      }),
      {
        status: 400,
        message: 'Cannot delete dataset run',
        description:
          'Unset or replace the dataset main run before deleting this run.',
      },
    )

    const deleteTargetJson = await expectJsonResponse<{ id: string }>(
      await adminClient.api.v0['dataset-run'].$post({
        json: {
          datasetId: seededIds.dataset,
          name: 'Delete dataset run',
        },
      }),
      {
        status: 201,
        message: 'Dataset run created',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0['dataset-run'][':id'].$delete({
        param: { id: deleteTargetJson.data.id },
      }),
      {
        status: 200,
        message: 'Dataset run deleted',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0['dataset-run'].$post({
        json: {
          datasetId: seededIds.dataset,
          name: 'Loopback PMTiles run',
          dataPmtilesUrl: 'https://127.0.0.1/data.pmtiles',
        },
      }),
      {
        status: 422,
        message: 'Invalid PMTiles URL',
        description:
          'PMTiles URLs cannot target local or private network hosts.',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0['dataset-run'].$post({
        json: {
          datasetId: seededIds.dataset,
          name: 'Allowed PMTiles run',
          dataPmtilesUrl: 'https://allowed.example.com/data.pmtiles',
        },
      }),
      {
        status: 201,
        message: 'Dataset run created',
      },
    )
  })

  it('round-trips manual bounds on create and update', async () => {
    const createdJson = await expectJsonResponse<{
      id: string
      bounds: {
        minX: number
        minY: number
        maxX: number
        maxY: number
      } | null
    }>(
      await adminClient.api.v0['dataset-run'].$post({
        json: {
          datasetId: seededIds.dataset,
          name: 'Bounded dataset run',
          bounds: seededTasmaniaBounds,
        },
      }),
      {
        status: 201,
        message: 'Dataset run created',
      },
    )

    expectBoundsToMatch(createdJson.data.bounds, seededTasmaniaBounds)

    const updatedJson = await expectJsonResponse<{
      id: string
      bounds: {
        minX: number
        minY: number
        maxX: number
        maxY: number
      } | null
    }>(
      await adminClient.api.v0['dataset-run'][':id'].$patch({
        param: { id: createdJson.data.id },
        json: {
          bounds: seededMainlandBounds,
        },
      }),
      {
        status: 200,
        message: 'Dataset run updated',
      },
    )

    expectBoundsToMatch(updatedJson.data.bounds, seededMainlandBounds)

    const clearedJson = await expectJsonResponse<{
      bounds: {
        minX: number
        minY: number
        maxX: number
        maxY: number
      } | null
    }>(
      await adminClient.api.v0['dataset-run'][':id'].$patch({
        param: { id: createdJson.data.id },
        json: {
          bounds: null,
        },
      }),
      {
        status: 200,
        message: 'Dataset run updated',
      },
    )

    expect(clearedJson.data.bounds).toBeNull()
  })

  it('accepts missing or null bounds on create', async () => {
    const withoutBoundsJson = await expectJsonResponse<{
      bounds: {
        minX: number
        minY: number
        maxX: number
        maxY: number
      } | null
    }>(
      await adminClient.api.v0['dataset-run'].$post({
        json: {
          datasetId: seededIds.dataset,
          name: 'Unbounded dataset run',
        },
      }),
      {
        status: 201,
        message: 'Dataset run created',
      },
    )

    expect(withoutBoundsJson.data.bounds).toBeNull()

    const nullBoundsJson = await expectJsonResponse<{
      bounds: {
        minX: number
        minY: number
        maxX: number
        maxY: number
      } | null
    }>(
      await adminClient.api.v0['dataset-run'].$post({
        json: {
          datasetId: seededIds.dataset,
          name: 'Null-bounds dataset run',
          bounds: null,
        },
      }),
      {
        status: 201,
        message: 'Dataset run created',
      },
    )

    expect(nullBoundsJson.data.bounds).toBeNull()
  })
})
