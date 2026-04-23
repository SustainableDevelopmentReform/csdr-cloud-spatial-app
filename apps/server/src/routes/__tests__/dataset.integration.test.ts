import { beforeEach, describe, expect, it } from 'vitest'
import { seededIds, setupIsolatedTestFile } from '~/test-utils/integration'
import {
  expectJsonResponse,
  noMatchBoundsFilter,
  seededTasmaniaBounds,
  tasmaniaBoundsFilter,
} from './test-helpers'

const { createAppClient, createSessionHeaders } = await setupIsolatedTestFile(
  import.meta.url,
)

let adminClient: ReturnType<typeof createAppClient>
let memberClient: ReturnType<typeof createAppClient>

beforeEach(async () => {
  adminClient = createAppClient(
    await createSessionHeaders({
      email: 'dataset-admin@example.com',
      role: 'admin',
    }),
  )
  memberClient = createAppClient(
    await createSessionHeaders({
      email: 'dataset-user@example.com',
    }),
  )
})

describe('dataset route', () => {
  const createUsageArtifacts = async () => {
    const reportJson = await expectJsonResponse<{ id: string }>(
      await adminClient.api.v0.report.$post({
        json: {
          name: 'Dataset usage report',
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
          name: 'Dataset usage dashboard',
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

    const anonymousListJson = await expectJsonResponse<{
      data: { id: string }[]
      totalCount: number
    }>(await createAppClient().api.v0.dataset.$get({ query: {} }), {
      status: 200,
      message: 'OK',
    })
    expect(anonymousListJson.data.totalCount).toBe(0)
    expect(anonymousListJson.data.data).toEqual([])

    const listJson = await expectJsonResponse<{
      data: { id: string }[]
      totalCount: number
    }>(await memberClient.api.v0.dataset.$get({ query: {} }), {
      status: 200,
      message: 'OK',
    })
    expect(listJson.data.totalCount).toBeGreaterThanOrEqual(1)
    expect(
      listJson.data.data.some((item) => item.id === seededIds.dataset),
    ).toBe(true)

    const detailJson = await expectJsonResponse<{
      id: string
      mainRun: { id: string } | null
      runCount: number
      productCount: number
      reportCount: number
      dashboardCount: number
    }>(
      await memberClient.api.v0.dataset[':id'].$get({
        param: { id: seededIds.dataset },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )
    expect(detailJson.data.id).toBe(seededIds.dataset)
    expect(detailJson.data.mainRun?.id).toBe(seededIds.datasetRun)
    expect(detailJson.data.runCount).toBe(1)
    expect(detailJson.data.productCount).toBe(1)
    expect(detailJson.data.reportCount).toBe(1)
    expect(detailJson.data.dashboardCount).toBe(1)

    const runsJson = await expectJsonResponse<{
      data: { id: string }[]
      totalCount: number
    }>(
      await memberClient.api.v0.dataset[':id'].runs.$get({
        param: { id: seededIds.dataset },
        query: {},
      }),
      {
        status: 200,
        message: 'OK',
      },
    )
    expect(runsJson.data.totalCount).toBe(1)
    expect(runsJson.data.data[0]?.id).toBe(seededIds.datasetRun)

    await expectJsonResponse(
      await memberClient.api.v0.dataset[':id'].$get({
        param: { id: 'missing-dataset' },
      }),
      {
        status: 404,
        message: 'Failed to get dataset',
      },
    )
  })

  it('returns write auth and success messages', async () => {
    await expectJsonResponse(
      await memberClient.api.v0.dataset.$post({
        json: {
          name: 'Forbidden dataset',
        },
      }),
      {
        status: 403,
        message: 'User is not authorized',
        description: null,
      },
    )

    const createdJson = await expectJsonResponse<{ id: string }>(
      await adminClient.api.v0.dataset.$post({
        json: {
          name: 'Created dataset',
          description: 'Created in test',
          sourceUrl: 'https://example.com/datasets/created',
        },
      }),
      {
        status: 201,
        message: 'Dataset created',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0.dataset[':id'].$patch({
        param: { id: createdJson.data.id },
        json: {
          description: 'Updated dataset',
        },
      }),
      {
        status: 200,
        message: 'Dataset updated',
      },
    )

    const createdRunJson = await expectJsonResponse<{ id: string }>(
      await adminClient.api.v0['dataset-run'].$post({
        json: {
          datasetId: createdJson.data.id,
          name: 'Created dataset run',
        },
      }),
      {
        status: 201,
        message: 'Dataset run created',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0.dataset[':id'].$patch({
        param: { id: seededIds.dataset },
        json: {
          mainRunId: createdRunJson.data.id,
        },
      }),
      {
        status: 404,
        message: 'Failed to get dataset',
      },
    )

    const mainRunJson = await expectJsonResponse<{
      mainRun: { id: string } | null
    }>(
      await adminClient.api.v0.dataset[':id'].$patch({
        param: { id: createdJson.data.id },
        json: {
          mainRunId: createdRunJson.data.id,
        },
      }),
      {
        status: 200,
        message: 'Dataset updated',
      },
    )
    expect(mainRunJson.data.mainRun?.id).toBe(createdRunJson.data.id)

    const clearedMainRunJson = await expectJsonResponse<{
      mainRun: { id: string } | null
    }>(
      await adminClient.api.v0.dataset[':id'].$patch({
        param: { id: createdJson.data.id },
        json: {
          mainRunId: null,
        },
      }),
      {
        status: 200,
        message: 'Dataset updated',
      },
    )
    expect(clearedMainRunJson.data.mainRun).toBeNull()

    await expectJsonResponse(
      await adminClient.api.v0.dataset[':id'].$delete({
        param: { id: createdJson.data.id },
      }),
      {
        status: 200,
        message: 'Dataset deleted',
      },
    )
  })

  it('filters datasets and dataset runs by stored dataset run bounds', async () => {
    await expectJsonResponse(
      await adminClient.api.v0['dataset-run'][':id'].$patch({
        param: { id: seededIds.datasetRun },
        json: {
          bounds: seededTasmaniaBounds,
        },
      }),
      {
        status: 200,
        message: 'Dataset run updated',
      },
    )

    const matchingDatasetsJson = await expectJsonResponse<{
      data: { id: string }[]
    }>(
      await memberClient.api.v0.dataset.$get({
        query: tasmaniaBoundsFilter,
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    expect(matchingDatasetsJson.data.data.map((item) => item.id)).toContain(
      seededIds.dataset,
    )

    const matchingRunsJson = await expectJsonResponse<{
      data: { id: string }[]
    }>(
      await memberClient.api.v0.dataset[':id'].runs.$get({
        param: { id: seededIds.dataset },
        query: tasmaniaBoundsFilter,
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    expect(matchingRunsJson.data.data.map((item) => item.id)).toContain(
      seededIds.datasetRun,
    )

    const noMatchDatasetsJson = await expectJsonResponse<{
      data: { id: string }[]
    }>(
      await memberClient.api.v0.dataset.$get({
        query: noMatchBoundsFilter,
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    expect(noMatchDatasetsJson.data.data.map((item) => item.id)).not.toContain(
      seededIds.dataset,
    )
  })
})
