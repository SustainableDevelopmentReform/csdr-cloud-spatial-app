import { beforeEach, describe, expect, it } from 'vitest'
import { seededIds, setupIsolatedTestFile } from '~/test-utils/integration'
import { expectJsonResponse } from '~/test-utils/route-test-helpers'

const { createAppClient, createSessionHeaders } = await setupIsolatedTestFile(
  import.meta.url,
)

let adminClient: ReturnType<typeof createAppClient>
let memberClient: ReturnType<typeof createAppClient>

beforeEach(async () => {
  adminClient = createAppClient(
    await createSessionHeaders({
      email: 'indicator-category-admin@example.com',
      role: 'admin',
    }),
  )
  memberClient = createAppClient(
    await createSessionHeaders({
      email: 'indicator-category-user@example.com',
    }),
  )
})

describe('indicator-category route', () => {
  it('returns read responses with expected messages', async () => {
    const anonymousListJson = await expectJsonResponse<{
      data: { id: string }[]
      totalCount: number
    }>(await createAppClient().api.v0['indicator-category'].$get(), {
      status: 200,
      message: 'OK',
    })
    expect(anonymousListJson.data.totalCount).toBe(0)
    expect(anonymousListJson.data.data).toEqual([])

    const listJson = await expectJsonResponse<{
      data: { id: string }[]
      totalCount: number
    }>(await memberClient.api.v0['indicator-category'].$get(), {
      status: 200,
      message: 'OK',
    })
    expect(listJson.data.totalCount).toBeGreaterThanOrEqual(1)
    expect(
      listJson.data.data.some(
        (item) => item.id === seededIds.indicatorCategory,
      ),
    ).toBe(true)

    const detailJson = await expectJsonResponse<{ id: string }>(
      await memberClient.api.v0['indicator-category'][':id'].$get({
        param: { id: seededIds.indicatorCategory },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )
    expect(detailJson.data.id).toBe(seededIds.indicatorCategory)

    await expectJsonResponse(
      await memberClient.api.v0['indicator-category'][':id'].$get({
        param: { id: 'missing-indicator-category' },
      }),
      {
        status: 404,
        message: 'Failed to get indicatorCategory',
        description: "indicatorCategory you're looking for is not found",
      },
    )
  })

  it('returns write auth and success messages', async () => {
    await expectJsonResponse(
      await memberClient.api.v0['indicator-category'].$post({
        json: {
          name: 'Forbidden category',
        },
      }),
      {
        status: 403,
        message: 'User is not authorized',
        description: null,
      },
    )

    const createdJson = await expectJsonResponse<{ id: string }>(
      await adminClient.api.v0['indicator-category'].$post({
        json: {
          name: 'Biodiversity',
          displayOrder: 10,
        },
      }),
      {
        status: 201,
        message: 'Indicator category created',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0['indicator-category'][':id'].$patch({
        param: { id: createdJson.data.id },
        json: {
          description: 'Updated category',
        },
      }),
      {
        status: 200,
        message: 'Indicator category updated',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0['indicator-category'][':id'].$delete({
        param: { id: createdJson.data.id },
      }),
      {
        status: 200,
        message: 'Indicator category deleted',
      },
    )
  })

  it('validates parent categories on create and update', async () => {
    await expectJsonResponse(
      await adminClient.api.v0['indicator-category'].$post({
        json: {
          name: 'Missing parent category',
          parentId: 'missing-indicator-category',
        },
      }),
      {
        status: 404,
        message: 'Failed to get indicatorCategory',
        description: "indicatorCategory you're looking for is not found",
      },
    )

    const parentJson = await expectJsonResponse<{ id: string }>(
      await adminClient.api.v0['indicator-category'].$post({
        json: {
          name: 'Parent category',
        },
      }),
      {
        status: 201,
        message: 'Indicator category created',
      },
    )

    const childJson = await expectJsonResponse<{
      id: string
      parent: { id: string } | null
    }>(
      await adminClient.api.v0['indicator-category'].$post({
        json: {
          name: 'Child category',
          parentId: parentJson.data.id,
        },
      }),
      {
        status: 201,
        message: 'Indicator category created',
      },
    )

    expect(childJson.data.parent?.id).toBe(parentJson.data.id)

    await expectJsonResponse(
      await adminClient.api.v0['indicator-category'][':id'].$patch({
        param: { id: childJson.data.id },
        json: {
          parentId: 'missing-indicator-category',
        },
      }),
      {
        status: 404,
        message: 'Failed to get indicatorCategory',
        description: "indicatorCategory you're looking for is not found",
      },
    )
  })

  it('updates indicator category visibility through the visibility endpoint', async () => {
    const createdJson = await expectJsonResponse<{
      id: string
      visibility: string
    }>(
      await adminClient.api.v0['indicator-category'].$post({
        json: {
          name: 'Visibility category',
        },
      }),
      {
        status: 201,
        message: 'Indicator category created',
      },
    )
    expect(createdJson.data.visibility).toBe('private')

    const visibilityJson = await expectJsonResponse<{
      id: string
      visibility: string
    }>(
      await adminClient.api.v0['indicator-category'][':id'].visibility.$patch({
        param: { id: createdJson.data.id },
        json: {
          visibility: 'public',
        },
      }),
      {
        status: 200,
        message: 'Indicator category visibility updated',
      },
    )

    expect(visibilityJson.data.id).toBe(createdJson.data.id)
    expect(visibilityJson.data.visibility).toBe('public')
  })
})
