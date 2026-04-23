import { beforeEach, describe, expect, it } from 'vitest'
import { seededIds, setupIsolatedTestFile } from '~/test-utils/integration'
import {
  expectJsonResponse,
  noMatchBoundsFilter,
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
      email: 'geometries-admin@example.com',
      role: 'admin',
    }),
  )
  memberClient = createAppClient(
    await createSessionHeaders({
      email: 'geometries-user@example.com',
    }),
  )
})

describe('geometries route', () => {
  const createUsageArtifacts = async () => {
    const reportJson = await expectJsonResponse<{ id: string }>(
      await adminClient.api.v0.report.$post({
        json: {
          name: 'Geometries usage report',
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
          name: 'Geometries usage dashboard',
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
    }>(await createAppClient().api.v0.geometries.$get({ query: {} }), {
      status: 200,
      message: 'OK',
    })
    expect(anonymousListJson.data.totalCount).toBe(0)
    expect(anonymousListJson.data.data).toEqual([])

    const listJson = await expectJsonResponse<{
      data: { id: string }[]
      totalCount: number
    }>(await memberClient.api.v0.geometries.$get({ query: {} }), {
      status: 200,
      message: 'OK',
    })
    expect(listJson.data.totalCount).toBeGreaterThanOrEqual(1)
    expect(
      listJson.data.data.some((item) => item.id === seededIds.geometries),
    ).toBe(true)

    const detailJson = await expectJsonResponse<{
      id: string
      mainRun: { id: string } | null
      runCount: number
      productCount: number
      reportCount: number
      dashboardCount: number
    }>(
      await memberClient.api.v0.geometries[':id'].$get({
        param: { id: seededIds.geometries },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )
    expect(detailJson.data.id).toBe(seededIds.geometries)
    expect(detailJson.data.mainRun?.id).toBe(seededIds.geometriesRun)
    expect(detailJson.data.runCount).toBe(1)
    expect(detailJson.data.productCount).toBe(1)
    expect(detailJson.data.reportCount).toBe(1)
    expect(detailJson.data.dashboardCount).toBe(1)

    const runsJson = await expectJsonResponse<{
      data: { id: string }[]
      totalCount: number
    }>(
      await memberClient.api.v0.geometries[':id'].runs.$get({
        param: { id: seededIds.geometries },
        query: {},
      }),
      {
        status: 200,
        message: 'OK',
      },
    )
    expect(runsJson.data.totalCount).toBe(1)
    expect(runsJson.data.data[0]?.id).toBe(seededIds.geometriesRun)

    await expectJsonResponse(
      await memberClient.api.v0.geometries[':id'].$get({
        param: { id: 'missing-geometries' },
      }),
      {
        status: 404,
        message: 'Failed to get geometries',
      },
    )
  })

  it('returns write auth and success messages', async () => {
    await expectJsonResponse(
      await memberClient.api.v0.geometries.$post({
        json: {
          name: 'Forbidden geometries',
        },
      }),
      {
        status: 403,
        message: 'User is not authorized',
        description: null,
      },
    )

    const createdJson = await expectJsonResponse<{ id: string }>(
      await adminClient.api.v0.geometries.$post({
        json: {
          name: 'Created geometries',
          description: 'Created in test',
        },
      }),
      {
        status: 201,
        message: 'Geometries created',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0.geometries[':id'].$patch({
        param: { id: createdJson.data.id },
        json: {
          description: 'Updated geometries',
        },
      }),
      {
        status: 200,
        message: 'Geometries updated',
      },
    )

    const createdRunJson = await expectJsonResponse<{ id: string }>(
      await adminClient.api.v0['geometries-run'].$post({
        json: {
          geometriesId: createdJson.data.id,
          name: 'Created geometries run',
        },
      }),
      {
        status: 201,
        message: 'Geometries run created',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0.geometries[':id'].$patch({
        param: { id: seededIds.geometries },
        json: {
          mainRunId: createdRunJson.data.id,
        },
      }),
      {
        status: 404,
        message: 'Failed to get geometries',
      },
    )

    const mainRunJson = await expectJsonResponse<{
      mainRun: { id: string } | null
    }>(
      await adminClient.api.v0.geometries[':id'].$patch({
        param: { id: createdJson.data.id },
        json: {
          mainRunId: createdRunJson.data.id,
        },
      }),
      {
        status: 200,
        message: 'Geometries updated',
      },
    )
    expect(mainRunJson.data.mainRun?.id).toBe(createdRunJson.data.id)

    const clearedMainRunJson = await expectJsonResponse<{
      mainRun: { id: string } | null
    }>(
      await adminClient.api.v0.geometries[':id'].$patch({
        param: { id: createdJson.data.id },
        json: {
          mainRunId: null,
        },
      }),
      {
        status: 200,
        message: 'Geometries updated',
      },
    )
    expect(clearedMainRunJson.data.mainRun).toBeNull()

    await expectJsonResponse(
      await adminClient.api.v0.geometries[':id'].$delete({
        param: { id: createdJson.data.id },
      }),
      {
        status: 200,
        message: 'Geometries deleted',
      },
    )
  })

  it('filters geometries and geometries runs by intersecting geometry outputs', async () => {
    const matchingGeometriesJson = await expectJsonResponse<{
      data: { id: string }[]
    }>(
      await memberClient.api.v0.geometries.$get({
        query: tasmaniaBoundsFilter,
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    expect(matchingGeometriesJson.data.data.map((item) => item.id)).toContain(
      seededIds.geometries,
    )

    const matchingRunsJson = await expectJsonResponse<{
      data: { id: string }[]
    }>(
      await memberClient.api.v0.geometries[':id'].runs.$get({
        param: { id: seededIds.geometries },
        query: tasmaniaBoundsFilter,
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    expect(matchingRunsJson.data.data.map((item) => item.id)).toContain(
      seededIds.geometriesRun,
    )

    const noMatchGeometriesJson = await expectJsonResponse<{
      data: { id: string }[]
    }>(
      await memberClient.api.v0.geometries.$get({
        query: noMatchBoundsFilter,
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    expect(
      noMatchGeometriesJson.data.data.map((item) => item.id),
    ).not.toContain(seededIds.geometries)
  })
})
