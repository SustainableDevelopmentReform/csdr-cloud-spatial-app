import { createRoute, z } from '@hono/zod-openapi'
import {
  baseDashboardSchema,
  createDashboardSchema,
  dashboardContentSchema,
  dashboardQuerySchema,
  fullDashboardSchema,
  updateDashboardSchema,
} from '@repo/schemas/crud'
import { desc, eq } from 'drizzle-orm'
import { syncDashboardChartUsages } from '~/lib/chartUsage'
import { db } from '~/lib/db'
import { ServerError } from '~/lib/error'
import {
  createOpenAPIApp,
  createResponseSchema,
  jsonErrorResponse,
  validationErrorResponse,
} from '~/lib/openapi'
import { authMiddleware } from '~/middlewares/auth'
import { generateJsonResponse } from '../lib/response'
import { dashboard } from '../schemas/db'
import {
  baseColumns,
  createPayload,
  QueryForTable,
  updatePayload,
} from '../schemas/util'
import { parseQuery } from '../utils/query'

export const baseDashboardQuery = {
  columns: {
    ...baseColumns,
  },
} satisfies QueryForTable<'dashboard'>

export const fullDashboardQuery = {
  columns: {
    ...baseDashboardQuery.columns,
    content: true,
  },
} satisfies QueryForTable<'dashboard'>

const dashboardNotFoundError = () =>
  new ServerError({
    statusCode: 404,
    message: 'Failed to get dashboard',
    description: "dashboard you're looking for is not found",
  })

const fetchFullDashboard = async (id: string) => {
  const record = await db.query.dashboard.findFirst({
    where: (dashboard, { eq }) => eq(dashboard.id, id),
    ...fullDashboardQuery,
  })

  return record ?? null
}

const fetchFullDashboardOrThrow = async (id: string) => {
  const record = await fetchFullDashboard(id)

  if (!record) {
    throw dashboardNotFoundError()
  }

  const parsedContent = dashboardContentSchema.parse(record.content)

  return { ...record, content: parsedContent }
}

const app = createOpenAPIApp()
  .openapi(
    createRoute({
      description: 'List dashboards with pagination metadata.',
      method: 'get',
      path: '/',
      middleware: [authMiddleware({ permission: 'read:dashboard' })],
      request: {
        query: dashboardQuerySchema,
      },
      responses: {
        200: {
          description: 'List dashboards with pagination metadata.',
          content: {
            'application/json': {
              schema: createResponseSchema(
                z.object({
                  pageCount: z.number().int(),
                  totalCount: z.number().int(),
                  data: z.array(baseDashboardSchema),
                }),
              ),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to list dashboards'),
      },
    }),
    async (c) => {
      const { meta, query } = await parseQuery(
        dashboard,
        c.req.valid('query'),
        {
          defaultOrderBy: desc(dashboard.createdAt),
          searchableColumns: [dashboard.name, dashboard.description],
        },
      )

      const data = await db.query.dashboard.findMany({
        ...baseDashboardQuery,
        ...query,
      })

      return generateJsonResponse(
        c,
        {
          ...meta,
          data,
        },
        200,
      )
    },
  )

  .openapi(
    createRoute({
      description: 'Retrieve a dashboard.',
      method: 'get',
      path: '/:id',
      middleware: [authMiddleware({ permission: 'read:dashboard' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully retrieved a dashboard.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullDashboardSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Dashboard not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to fetch dashboard'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const record = await fetchFullDashboardOrThrow(id)

      return generateJsonResponse(c, record, 200)
    },
  )

  .openapi(
    createRoute({
      description: 'Create a dashboard.',
      method: 'post',
      path: '/',
      middleware: [authMiddleware({ permission: 'write:dashboard' })],
      request: {
        body: {
          required: true,
          content: {
            'application/json': {
              schema: createDashboardSchema,
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Successfully created a dashboard.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullDashboardSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to create dashboard'),
      },
    }),
    async (c) => {
      const payload = c.req.valid('json')
      const newDashboard = await db.transaction(async (tx) => {
        const [insertedDashboard] = await tx
          .insert(dashboard)
          .values(createPayload(payload))
          .returning()

        if (!insertedDashboard) {
          throw new ServerError({
            statusCode: 500,
            message: 'Failed to create dashboard',
            description: 'Dashboard insert did not return a record',
          })
        }

        await syncDashboardChartUsages(
          tx,
          insertedDashboard.id,
          payload.content,
        )

        return insertedDashboard
      })

      const record = await fetchFullDashboardOrThrow(newDashboard.id)

      return generateJsonResponse(c, record, 201, 'Dashboard created')
    },
  )

  .openapi(
    createRoute({
      description: 'Update a dashboard.',
      method: 'patch',
      path: '/:id',
      middleware: [authMiddleware({ permission: 'write:dashboard' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
        body: {
          required: true,
          content: {
            'application/json': {
              schema: updateDashboardSchema,
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Successfully updated a dashboard.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullDashboardSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Dashboard not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to update dashboard'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const payload = c.req.valid('json')

      const record = await db.transaction(async (tx) => {
        const [updatedRecord] = await tx
          .update(dashboard)
          .set(updatePayload(payload))
          .where(eq(dashboard.id, id))
          .returning()

        if (!updatedRecord) {
          throw dashboardNotFoundError()
        }

        if (payload.content) {
          await syncDashboardChartUsages(tx, updatedRecord.id, payload.content)
        }

        return updatedRecord
      })

      const fullRecord = await fetchFullDashboardOrThrow(record.id)

      return generateJsonResponse(c, fullRecord, 200, 'Dashboard updated')
    },
  )

  .openapi(
    createRoute({
      description: 'Delete a dashboard.',
      method: 'delete',
      path: '/:id',
      middleware: [authMiddleware({ permission: 'write:dashboard' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully deleted a dashboard.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullDashboardSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Dashboard not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to delete dashboard'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const record = await fetchFullDashboardOrThrow(id)

      await db.delete(dashboard).where(eq(dashboard.id, id))

      return generateJsonResponse(c, record, 200, 'Dashboard deleted')
    },
  )

export default app
