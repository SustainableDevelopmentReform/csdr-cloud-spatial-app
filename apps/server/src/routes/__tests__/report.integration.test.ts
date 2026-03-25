import { beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { reportIndicatorUsage } from '~/schemas/db'
import { seededIds, setupIsolatedTestFile } from '~/test-utils/integration'
import { expectJsonResponse } from './test-helpers'

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
  const validReportContent = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Updated report content' }],
      },
    ],
  }

  it('returns read responses with expected messages', async () => {
    await expectJsonResponse(
      await createAppClient().api.v0.report.$get({ query: {} }),
      {
        status: 401,
        message: 'User is not authenticated',
        description: null,
      },
    )

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
})
