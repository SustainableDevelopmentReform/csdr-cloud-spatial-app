import { createRoute, z } from '@hono/zod-openapi'
import {
  createGeometriesSchema,
  geometriesQuerySchema,
  geometriesRunQuerySchema,
  updateGeometriesSchema,
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
import { geometries, geometriesRun, product } from '../schemas/db'
import {
  baseColumns,
  baseResourceSchema,
  createPayload,
  QueryForTable,
  updatePayload,
} from '../schemas/util'
import {
  baseGeometriesRunQuery,
  baseGeometriesRunSchema,
} from './geometriesRun'

export const baseGeometriesQuery = {
  columns: {
    ...baseColumns,
    mainRunId: true,
    sourceUrl: true,
    sourceMetadataUrl: true,
  },
} satisfies QueryForTable<'geometries'>

export const fullGeometriesQuery = {
  columns: baseGeometriesQuery.columns,
  with: {
    mainRun: baseGeometriesRunQuery,
  },
} satisfies QueryForTable<'geometries'>

export const baseGeometriesSchema = baseResourceSchema
  .extend({
    mainRunId: z.string().nullable(),
    sourceUrl: z.string().nullable(),
    sourceMetadataUrl: z.string().nullable(),
  })
  .openapi('GeometriesBase')

export const fullGeometriesSchema = baseGeometriesSchema
  .extend({
    runCount: z.number().int(),
    productCount: z.number().int(),
    mainRun: baseGeometriesRunSchema.nullable(),
  })
  .openapi('GeometriesFull')

const app = createOpenAPIApp()
  .openapi(
    createRoute({
      description: 'List geometries with pagination metadata.',
      method: 'get',
      path: '/',
      middleware: [authMiddleware({ permission: 'read:geometries' })],
      request: {
        query: geometriesQuerySchema,
      },
      responses: {
        200: {
          description: 'Successfully listed geometries.',
          content: {
            'application/json': {
              schema: createResponseSchema(
                z.object({
                  pageCount: z.number().int(),
                  totalCount: z.number().int(),
                  data: z.array(baseGeometriesSchema),
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
        ...baseGeometriesQuery,
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
      description: 'Retrieve geometries by id.',
      method: 'get',
      path: '/:id',
      middleware: [authMiddleware({ permission: 'read:geometries' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully retrieved geometries.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullGeometriesSchema),
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
        ...fullGeometriesQuery,
      })

      if (!record) {
        throw new ServerError({
          statusCode: 404,
          message: 'Failed to get geometries',
          description: "Geometries you're looking for is not found",
        })
      }

      const runCount = await db.$count(
        geometriesRun,
        eq(geometriesRun.geometriesId, id),
      )
      const productCount = await db.$count(
        product,
        eq(product.geometriesId, id),
      )

      return generateJsonResponse(c, { ...record, runCount, productCount }, 200)
    },
  )
  .openapi(
    createRoute({
      description: 'List geometries runs for a geometries resource.',
      method: 'get',
      path: '/:id/runs',
      middleware: [authMiddleware({ permission: 'read:productRun' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
        query: geometriesRunQuerySchema,
      },
      responses: {
        200: {
          description: 'Successfully listed geometries runs.',
          content: {
            'application/json': {
              schema: createResponseSchema(
                z.object({
                  pageCount: z.number().int(),
                  totalCount: z.number().int(),
                  data: z.array(baseGeometriesRunSchema),
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
        ...baseGeometriesRunQuery,
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
      description: 'Create geometries.',
      method: 'post',
      path: '/',
      middleware: [authMiddleware({ permission: 'write:geometries' })],
      request: {
        body: {
          required: true,
          content: {
            'application/json': {
              schema: createGeometriesSchema,
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Successfully created geometries.',
          content: {
            'application/json': {
              schema: createResponseSchema(baseGeometriesSchema.optional()),
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
      description: 'Update geometries.',
      method: 'patch',
      path: '/:id',
      middleware: [authMiddleware({ permission: 'write:geometries' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
        body: {
          required: true,
          content: {
            'application/json': {
              schema: updateGeometriesSchema,
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Successfully updated geometries.',
          content: {
            'application/json': {
              schema: createResponseSchema(baseGeometriesSchema.optional()),
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
      description: 'Delete geometries.',
      method: 'delete',
      path: '/:id',
      middleware: [authMiddleware({ permission: 'write:geometries' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully deleted geometries.',
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
