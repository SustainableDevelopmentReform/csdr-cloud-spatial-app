import { createRoute, z } from '@hono/zod-openapi'
import {
  createDashboardSchema,
  dashboardContentSchema,
  dashboardQuerySchema,
  updateDashboardSchema,
} from '@repo/schemas/crud'
import { count, desc, eq } from 'drizzle-orm'
import { db } from '~/lib/db'
import { ServerError } from '~/lib/error'
import {
  BaseResponseSchema,
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
  baseResourceSchema,
  createPayload,
  QueryForTable,
  updatePayload,
} from '../schemas/util'

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

export const baseDashboardSchema = baseResourceSchema.openapi(
  'DashboardSchemaBase',
)

const fullDashboardSchema = baseDashboardSchema
  .extend({
    content: dashboardContentSchema,
  })
  .openapi('DashboardSchemaFull')

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
      const { page = 1, size = 10 } = c.req.valid('query')
      const skip = (page - 1) * size

      const totalCount = await db.select({ count: count() }).from(dashboard)
      const pageCount = Math.ceil(totalCount[0]!.count / size)

      const data = await db.query.dashboard.findMany({
        ...baseDashboardQuery,
        limit: size,
        offset: skip,
        orderBy: desc(dashboard.createdAt),
      })

      return generateJsonResponse(
        c,
        {
          pageCount,
          data,
          totalCount: totalCount[0]!.count,
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
      const record = await db.query.dashboard.findFirst({
        where: (dashboard, { eq }) => eq(dashboard.id, id),
        ...fullDashboardQuery,
      })

      if (!record) {
        throw new ServerError({
          statusCode: 404,
          message: 'Failed to get dashboard',
          description: "dashboard you're looking for is not found",
        })
      }

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
              schema: createResponseSchema(z.any()),
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
      const [newDashboard] = await db
        .insert(dashboard)
        .values(createPayload(payload))
        .returning()

      return generateJsonResponse(c, newDashboard, 201, 'Dashboard created')
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
              schema: createResponseSchema(z.any()),
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

      const [record] = await db
        .update(dashboard)
        .set(updatePayload(payload))
        .where(eq(dashboard.id, id))
        .returning()

      return generateJsonResponse(c, record, 200, 'Dashboard updated')
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
              schema: BaseResponseSchema,
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
      await db.delete(dashboard).where(eq(dashboard.id, id))

      return generateJsonResponse(c, {}, 200, 'Dashboard deleted')
    },
  )

export default app
