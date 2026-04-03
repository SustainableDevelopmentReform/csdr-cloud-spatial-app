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
      email: 'indicator-admin@example.com',
      role: 'admin',
    }),
  )
  memberClient = createAppClient(
    await createSessionHeaders({
      email: 'indicator-user@example.com',
    }),
  )
})

describe('indicator route', () => {
  const createReportWithChartUsage = async (indicatorId: string) => {
    const reportJson = await expectJsonResponse<{ id: string }>(
      await adminClient.api.v0.report.$post({
        json: {
          name: `Indicator usage report ${indicatorId}`,
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
                    indicatorIds: [indicatorId],
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
  }

  const createDashboardWithChartUsage = async (indicatorId: string) => {
    await expectJsonResponse(
      await adminClient.api.v0.dashboard.$post({
        json: {
          name: `Indicator usage dashboard ${indicatorId}`,
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
  }

  it('returns read responses with expected messages', async () => {
    await createReportWithChartUsage(seededIds.indicator)
    await createDashboardWithChartUsage(seededIds.indicator)
    await createReportWithChartUsage(seededIds.derivedIndicator)
    await createDashboardWithChartUsage(seededIds.derivedIndicator)

    await expectJsonResponse(
      await createAppClient().api.v0.indicator.$get({ query: {} }),
      {
        status: 401,
        message: 'User is not authenticated',
        description: null,
      },
    )

    const listJson = await expectJsonResponse<{
      data: { id: string; type: 'measured' | 'derived' }[]
      totalCount: number
    }>(await memberClient.api.v0.indicator.$get({ query: {} }), {
      status: 200,
      message: 'OK',
    })
    expect(listJson.data.totalCount).toBeGreaterThanOrEqual(2)
    expect(
      listJson.data.data.some((item) => item.id === seededIds.indicator),
    ).toBe(true)
    expect(
      listJson.data.data.some((item) => item.id === seededIds.derivedIndicator),
    ).toBe(true)

    const measuredJson = await expectJsonResponse<{
      id: string
      type: 'measured'
      reportCount: number
      dashboardCount: number
    }>(
      await memberClient.api.v0.indicator.measured[':id'].$get({
        param: { id: seededIds.indicator },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )
    expect(measuredJson.data.id).toBe(seededIds.indicator)
    expect(measuredJson.data.type).toBe('measured')
    expect(measuredJson.data.reportCount).toBe(1)
    expect(measuredJson.data.dashboardCount).toBe(1)

    const derivedJson = await expectJsonResponse<{
      id: string
      type: 'derived'
      indicators: { id: string }[]
      reportCount: number
      dashboardCount: number
    }>(
      await memberClient.api.v0.indicator.derived[':id'].$get({
        param: { id: seededIds.derivedIndicator },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )
    expect(derivedJson.data.id).toBe(seededIds.derivedIndicator)
    expect(derivedJson.data.type).toBe('derived')
    expect(
      derivedJson.data.indicators.some(
        (item) => item.id === seededIds.indicator,
      ),
    ).toBe(true)
    expect(derivedJson.data.reportCount).toBe(1)
    expect(derivedJson.data.dashboardCount).toBe(1)

    const anyIndicatorJson = await expectJsonResponse<{
      id: string
      type: 'derived'
    }>(
      await memberClient.api.v0.indicator[':id'].$get({
        param: { id: seededIds.derivedIndicator },
      }),
      {
        status: 200,
        message: 'Indicator retrieved',
      },
    )
    expect(anyIndicatorJson.data.id).toBe(seededIds.derivedIndicator)
    expect(anyIndicatorJson.data.type).toBe('derived')

    await expectJsonResponse(
      await memberClient.api.v0.indicator[':id'].$get({
        param: { id: 'missing-indicator' },
      }),
      {
        status: 404,
        message: 'Failed to get indicator',
        description: "indicator you're looking for is not found",
      },
    )

    await expectJsonResponse(
      await memberClient.api.v0.indicator.derived[':id'].$get({
        param: { id: 'missing-derived-indicator' },
      }),
      {
        status: 404,
        message: 'Failed to get derived indicator',
        description: "derived indicator you're looking for is not found",
      },
    )
  })

  it('retrieves public indicators via the combined endpoint across organizations', async () => {
    const otherOrgClient = createAppClient(
      await createSessionHeaders({
        email: 'indicator-public-reader@example.com',
        organizationId: 'other-indicator-organization',
      }),
    )

    await expectJsonResponse(
      await adminClient.api.v0.indicator.measured[':id']['visibility'].$patch({
        param: { id: seededIds.indicator },
        json: {
          visibility: 'public',
        },
      }),
      {
        status: 200,
        message: 'Measured indicator visibility updated',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0.indicator.derived[':id']['visibility'].$patch({
        param: { id: seededIds.derivedIndicator },
        json: {
          visibility: 'public',
        },
      }),
      {
        status: 200,
        message: 'Derived indicator visibility updated',
      },
    )

    await expectJsonResponse(
      await otherOrgClient.api.v0.indicator.measured[':id'].$get({
        param: { id: seededIds.indicator },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    const measuredCombinedJson = await expectJsonResponse<{
      id: string
      type: 'measured'
    }>(
      await otherOrgClient.api.v0.indicator[':id'].$get({
        param: { id: seededIds.indicator },
      }),
      {
        status: 200,
        message: 'Indicator retrieved',
      },
    )
    expect(measuredCombinedJson.data.id).toBe(seededIds.indicator)
    expect(measuredCombinedJson.data.type).toBe('measured')

    await expectJsonResponse(
      await otherOrgClient.api.v0.indicator.derived[':id'].$get({
        param: { id: seededIds.derivedIndicator },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    const derivedCombinedJson = await expectJsonResponse<{
      id: string
      type: 'derived'
    }>(
      await otherOrgClient.api.v0.indicator[':id'].$get({
        param: { id: seededIds.derivedIndicator },
      }),
      {
        status: 200,
        message: 'Indicator retrieved',
      },
    )
    expect(derivedCombinedJson.data.id).toBe(seededIds.derivedIndicator)
    expect(derivedCombinedJson.data.type).toBe('derived')
  })

  it('returns write auth and success messages', async () => {
    await expectJsonResponse(
      await memberClient.api.v0.indicator.measured.$post({
        json: {
          name: 'Forbidden indicator',
          unit: '%',
        },
      }),
      {
        status: 403,
        message: 'User is not authorized',
        description: null,
      },
    )

    const createdMeasuredJson = await expectJsonResponse<{ id: string }>(
      await adminClient.api.v0.indicator.measured.$post({
        json: {
          name: 'Canopy Density',
          unit: '%',
          categoryId: seededIds.indicatorCategory,
        },
      }),
      {
        status: 201,
        message: 'Measured indicator created',
      },
    )

    const createdDerivedJson = await expectJsonResponse<{ id: string }>(
      await adminClient.api.v0.indicator.derived.$post({
        json: {
          name: 'Canopy Density x3',
          unit: '%',
          expression: '$1 * 3',
          categoryId: seededIds.indicatorCategory,
          indicatorIds: [createdMeasuredJson.data.id],
        },
      }),
      {
        status: 201,
        message: 'Derived indicator created',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0.indicator.measured[':id'].$patch({
        param: { id: createdMeasuredJson.data.id },
        json: {
          description: 'Updated measured indicator',
        },
      }),
      {
        status: 200,
        message: 'Measured indicator updated',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0.indicator.derived[':id'].$patch({
        param: { id: createdDerivedJson.data.id },
        json: {
          description: 'Updated derived indicator',
        },
      }),
      {
        status: 200,
        message: 'Derived indicator updated',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0.indicator.derived[':id'].$delete({
        param: { id: createdDerivedJson.data.id },
      }),
      {
        status: 200,
        message: 'Derived indicator deleted',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0.indicator.measured[':id'].$delete({
        param: { id: createdMeasuredJson.data.id },
      }),
      {
        status: 200,
        message: 'Measured indicator deleted',
      },
    )
  })

  it('allows another organization to create a derived indicator from a global measured indicator', async () => {
    const otherOrgAdminClient = createAppClient(
      await createSessionHeaders({
        email: 'indicator-global-derived-admin@example.com',
        organizationId: 'other-derived-indicator-organization',
        organizationRole: 'org_admin',
        twoFactorEnabled: true,
      }),
    )

    await expectJsonResponse(
      await adminClient.api.v0.indicator.measured[':id']['visibility'].$patch({
        param: { id: seededIds.indicator },
        json: {
          visibility: 'global',
        },
      }),
      {
        status: 200,
        message: 'Measured indicator visibility updated',
      },
    )

    const listJson = await expectJsonResponse<{
      data: { id: string; type: 'measured' | 'derived' }[]
    }>(
      await otherOrgAdminClient.api.v0.indicator.$get({
        query: { type: 'measure' },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    expect(
      listJson.data.data.some((item) => item.id === seededIds.indicator),
    ).toBe(true)

    const createdDerivedJson = await expectJsonResponse<{
      id: string
      indicators: { id: string }[]
      organizationId: string
    }>(
      await otherOrgAdminClient.api.v0.indicator.derived.$post({
        json: {
          name: 'Other org global derived indicator',
          unit: '%',
          expression: '$1 * 2',
          indicatorIds: [seededIds.indicator],
        },
      }),
      {
        status: 201,
        message: 'Derived indicator created',
      },
    )

    expect(createdDerivedJson.data.organizationId).toBe(
      'other-derived-indicator-organization',
    )
    expect(
      createdDerivedJson.data.indicators.some(
        (item) => item.id === seededIds.indicator,
      ),
    ).toBe(true)
  })

  it('blocks deleting indicators that are used by reports or dashboards', async () => {
    const reportJson = await expectJsonResponse<{ id: string }>(
      await adminClient.api.v0.report.$post({
        json: {
          name: 'Measured indicator report',
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

    expect(dashboardJson.data.id).toBeTruthy()

    await expectJsonResponse(
      await adminClient.api.v0.indicator.measured[':id'].$delete({
        param: { id: seededIds.indicator },
      }),
      {
        status: 400,
        message: 'Cannot delete measured indicator',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0.indicator.derived[':id'].$delete({
        param: { id: seededIds.derivedIndicator },
      }),
      {
        status: 400,
        message: 'Cannot delete derived indicator',
      },
    )
  })
})
