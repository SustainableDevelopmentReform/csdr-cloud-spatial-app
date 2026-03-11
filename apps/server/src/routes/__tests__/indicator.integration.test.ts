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
  it('returns read responses with expected messages', async () => {
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

    const derivedJson = await expectJsonResponse<{
      id: string
      type: 'derived'
      indicators: { id: string }[]
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
})
