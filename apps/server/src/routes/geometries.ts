import { createRoute } from '@hono/zod-openapi'
import { count, desc, eq, sql } from 'drizzle-orm'
import { db } from '~/lib/db'
import { ServerError } from '~/lib/error'
import { authMiddleware } from '~/middlewares/auth'
import { generateJsonResponse } from '../lib/response'
import { geometries, geometriesRun } from '../schemas'
import { baseColumns, QueryForTable } from '../schemas/util'
import { geometriesRunQuery } from './geometriesRun'
import {
  baseCreateResourceSchema,
  baseUpdateResourceSchema,
  createPayload,
  updatePayload,
} from './util'
import {
  BaseResponseSchema,
  createOpenAPIApp,
  createResponseSchema,
  jsonErrorResponse,
  validationErrorResponse,
  z,
} from '~/lib/openapi'

const geometriesQuery = {
  columns: {
    ...baseColumns,
    metadata: true,
  },
  with: {
    mainRun: geometriesRunQuery,
  },
  extras: {
    runCount: sql<number>`(
      SELECT COUNT(*)::int
      FROM geometries_run dr
      WHERE dr.geometries_id = ${geometries}.id
    )`.as('run_count'),
    productCount: sql<number>`(
      SELECT COUNT(*)::int
      FROM product p
      WHERE p.geometries_id = ${geometries}.id
    )`.as('product_count'),
  },
} satisfies QueryForTable<'geometries'>

const app = createOpenAPIApp()
  .openapi(
    createRoute({
      method: 'get',
      path: '/',
      middleware: [authMiddleware({ permission: 'read:geometries' })],
      request: {
        query: z.object({
          page: z.coerce.number().positive().optional(),
          size: z.coerce.number().optional(),
        }),
      },
      responses: {
        200: {
          description: 'List geometries with pagination metadata.',
          content: {
            'application/json': {
              schema: createResponseSchema(
                z.object({
                  pageCount: z.number().int(),
                  totalCount: z.number().int(),
                  data: z.array(z.any()),
                }),
              ),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to list geometries'),
      },
    }),
    async (c) => {
      const { page = 1, size = 10 } = c.req.valid('query')
      const skip = (page - 1) * size

      const totalCount = await db
        .select({
          count: count(),
        })
        .from(geometries)
      const pageCount = Math.ceil(totalCount[0]!.count / size)

      const data = await db.query.geometries.findMany({
        ...geometriesQuery,
        limit: size,
        offset: skip,
        orderBy: desc(geometries.createdAt),
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
      method: 'get',
      path: '/:id',
      middleware: [authMiddleware({ permission: 'read:geometries' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Retrieve geometries by id.',
          content: {
            'application/json': {
              schema: createResponseSchema(z.any()),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Geometries not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to fetch geometries'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const record = await db.query.geometries.findFirst({
        where: (geometries, { eq }) => eq(geometries.id, id),
        ...geometriesQuery,
      })

      if (!record) {
        throw new ServerError({
          statusCode: 404,
          message: 'Failed to get geometries',
          description: "Geometries you're looking for is not found",
        })
      }

      return generateJsonResponse(c, record, 200)
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/:id/runs',
      middleware: [authMiddleware({ permission: 'read:productRun' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
        query: z.object({
          page: z.coerce.number().positive().optional(),
          size: z.coerce.number().optional(),
        }),
      },
      responses: {
        200: {
          description: 'List geometries runs for a geometries resource.',
          content: {
            'application/json': {
              schema: createResponseSchema(
                z.object({
                  pageCount: z.number().int(),
                  totalCount: z.number().int(),
                  data: z.array(z.any()),
                }),
              ),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to list geometries runs'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const { page = 1, size = 10 } = c.req.valid('query')
      const skip = (page - 1) * size

      const totalCount = await db
        .select({
          count: count(),
        })
        .from(geometriesRun)
        .where(eq(geometriesRun.geometriesId, id))
      const pageCount = Math.ceil(totalCount[0]!.count / size)

      const data = await db.query.geometriesRun.findMany({
        ...geometriesRunQuery,
        where: (geometriesRun, { eq }) => eq(geometriesRun.geometriesId, id),
        limit: size,
        offset: skip,
        orderBy: desc(geometriesRun.createdAt),
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
      method: 'post',
      path: '/',
      middleware: [authMiddleware({ permission: 'write:geometries' })],
      request: {
        body: {
          required: true,
          content: {
            'application/json': {
              schema: baseCreateResourceSchema,
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Create geometries.',
          content: {
            'application/json': {
              schema: createResponseSchema(z.any()),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to create geometries'),
      },
    }),
    async (c) => {
      const payload = c.req.valid('json')
      const [record] = await db
        .insert(geometries)
        .values(createPayload(payload))
        .returning()

      return generateJsonResponse(c, record, 201, 'Geometries created')
    },
  )

  .openapi(
    createRoute({
      method: 'patch',
      path: '/:id',
      middleware: [authMiddleware({ permission: 'write:geometries' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
        body: {
          required: true,
          content: {
            'application/json': {
              schema: baseUpdateResourceSchema.extend({
                mainRunId: z.string().optional(),
              }),
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Update geometries.',
          content: {
            'application/json': {
              schema: createResponseSchema(z.any()),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Geometries not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to update geometries'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const payload = c.req.valid('json')

      const [record] = await db
        .update(geometries)
        .set(updatePayload(payload))
        .where(eq(geometries.id, id))
        .returning()

      return generateJsonResponse(c, record, 200, 'Geometries updated')
    },
  )

  .openapi(
    createRoute({
      method: 'delete',
      path: '/:id',
      middleware: [authMiddleware({ permission: 'write:geometries' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Delete geometries.',
          content: {
            'application/json': {
              schema: BaseResponseSchema,
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Geometries not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to delete geometries'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      await db.delete(geometries).where(eq(geometries.id, id))

      return generateJsonResponse(c, {}, 200, 'Geometries deleted')
    },
  )

export default app
