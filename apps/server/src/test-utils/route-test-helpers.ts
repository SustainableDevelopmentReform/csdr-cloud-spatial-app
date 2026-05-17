import { expect } from 'vitest'
import { seededIds, type AppClient } from './integration'

export type JsonResponse<T> = {
  statusCode: number
  message: string
  data: T
  description?: string | null
}

export const seededTasmaniaBounds = {
  minX: 144.52849213046932,
  minY: -43.73394595871736,
  maxX: 148.42747998417815,
  maxY: -40.8715836482141,
}

export const seededMainlandBounds = {
  minX: 113.91654528664822,
  minY: -38.824293461501256,
  maxX: 153.83198193148485,
  maxY: -10.873394815296393,
}

export const seededFullRunBounds = {
  minX: seededMainlandBounds.minX,
  minY: seededTasmaniaBounds.minY,
  maxX: seededMainlandBounds.maxX,
  maxY: seededMainlandBounds.maxY,
}

export const tasmaniaBoundsFilter = {
  boundsMinX: 143,
  boundsMinY: -44.5,
  boundsMaxX: 149,
  boundsMaxY: -40,
}

export const noMatchBoundsFilter = {
  boundsMinX: -10,
  boundsMinY: 50,
  boundsMaxX: 10,
  boundsMaxY: 60,
}

export const remoteNoMatchBoundsFilter = {
  boundsMinX: 160,
  boundsMinY: 20,
  boundsMaxX: 170,
  boundsMaxY: 30,
}

const readJson = async <T>(response: Response) =>
  (await response.json()) as JsonResponse<T>

export const expectBoundsToMatch = (
  actual:
    | {
        minX: number
        minY: number
        maxX: number
        maxY: number
      }
    | null
    | undefined,
  expected: {
    minX: number
    minY: number
    maxX: number
    maxY: number
  },
) => {
  expect(actual).not.toBeNull()
  expect(actual?.minX).toBeCloseTo(expected.minX)
  expect(actual?.minY).toBeCloseTo(expected.minY)
  expect(actual?.maxX).toBeCloseTo(expected.maxX)
  expect(actual?.maxY).toBeCloseTo(expected.maxY)
}

export const expectJsonResponse = async <T>(
  response: Response,
  options: {
    status: number
    message: string
    description?: string | null
  },
) => {
  expect(response.status).toBe(options.status)

  const json = await readJson<T>(response)

  expect(json.statusCode).toBe(options.status)
  expect(json.message).toBe(options.message)

  if ('description' in options) {
    expect(json.description ?? null).toBe(options.description ?? null)
  }

  return json
}

export const createChartUsageArtifacts = async (
  client: AppClient,
  resourceLabel: string,
) => {
  const reportJson = await expectJsonResponse<{ id: string }>(
    await client.api.v0.report.$post({
      json: {
        name: `${resourceLabel} usage report`,
      },
    }),
    {
      status: 201,
      message: 'Report created',
    },
  )

  await expectJsonResponse(
    await client.api.v0.report[':id'].$patch({
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
    await client.api.v0.dashboard.$post({
      json: {
        name: `${resourceLabel} usage dashboard`,
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

  return {
    reportId: reportJson.data.id,
    dashboardId: dashboardJson.data.id,
  }
}
