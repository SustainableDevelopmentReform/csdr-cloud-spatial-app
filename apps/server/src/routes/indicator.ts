import { createRoute, z } from '@hono/zod-openapi'
import {
  baseIndicatorSchema,
  createIndicatorSchema,
  updateIndicatorSchema,
  indicatorQuerySchema,
} from '@repo/schemas/crud'
import { and, desc, eq, inArray } from 'drizzle-orm'
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
import { indicator } from '../schemas/db'
import {
  baseColumns,
  createPayload,
  QueryForTable,
  updatePayload,
} from '../schemas/util'
import { parseQuery } from '../utils/query'

export const baseIndicatorQuery = {
  columns: {
    ...baseColumns,
    unit: true,
    displayOrder: true,
    categoryId: true,
  },
  with: {
    category: {
      columns: baseColumns,
    },
  },
} satisfies QueryForTable<'indicator'>

const indicatorNotFoundError = () =>
  new ServerError({
    statusCode: 404,
    message: 'Failed to get indicator',
    description: "indicator you're looking for is not found",
  })

const fetchFullIndicator = async (id: string) => {
  const record = await db.query.indicator.findFirst({
    where: (indicator, { eq }) => eq(indicator.id, id),
    ...baseIndicatorQuery,
  })

  return record ?? null
}

const fetchFullIndicatorOrThrow = async (id: string) => {
  const record = await fetchFullIndicator(id)

  if (!record) {
    throw indicatorNotFoundError()
  }

  return record
}

const app = createOpenAPIApp()
  .openapi(
    createRoute({
      description: 'List indicators with pagination metadata.',
      method: 'get',
      path: '/',
      middleware: [authMiddleware({ permission: 'read:indicator' })],
      request: {
        query: indicatorQuerySchema,
      },
      responses: {
        200: {
          description: 'List indicators with pagination metadata.',
          content: {
            'application/json': {
              schema: createResponseSchema(
                z.object({
                  pageCount: z.number().int(),
                  totalCount: z.number().int(),
                  data: z.array(baseIndicatorSchema),
                }),
              ),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to list indicators'),
      },
    }),
    async (c) => {
      const { indicatorIds } = c.req.valid('query')
      const { pageCount, totalCount, ...query } = await parseQuery(
        indicator,
        c.req.valid('query'),
        {
          defaultOrderBy: desc(indicator.createdAt),
          searchableColumns: [indicator.name],
        },
      )

      if (indicatorIds) {
        query.where = and(
          query.where,
          inArray(
            indicator.id,
            Array.isArray(indicatorIds) ? indicatorIds : [indicatorIds],
          ),
        )
      }

      const data = await db.query.indicator.findMany({
        ...baseIndicatorQuery,
        ...query,
      })

      return generateJsonResponse(
        c,
        {
          pageCount,
          data,
          totalCount,
        },
        200,
      )
    },
  )

  .openapi(
    createRoute({
      description: 'Retrieve a indicator.',
      method: 'get',
      path: '/:id',
      middleware: [authMiddleware({ permission: 'read:indicator' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully retrieved a indicator.',
          content: {
            'application/json': {
              schema: createResponseSchema(baseIndicatorSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Indicator not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to fetch indicator'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const record = await fetchFullIndicatorOrThrow(id)

      return generateJsonResponse(c, record, 200)
    },
  )

  .openapi(
    createRoute({
      description: 'Create a indicator.',
      method: 'post',
      path: '/',
      middleware: [authMiddleware({ permission: 'write:indicator' })],
      request: {
        body: {
          required: true,
          content: {
            'application/json': {
              schema: createIndicatorSchema,
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Successfully created a indicator.',
          content: {
            'application/json': {
              schema: createResponseSchema(baseIndicatorSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to create indicator'),
      },
    }),
    async (c) => {
      const payload = c.req.valid('json')
      const data = {
        ...payload,
        categoryId: payload.categoryId ?? null,
      }
      const [newIndicator] = await db
        .insert(indicator)
        .values(createPayload(data))
        .returning()

      if (!newIndicator) {
        throw new ServerError({
          statusCode: 500,
          message: 'Failed to create indicator',
          description: 'Indicator insert did not return a record',
        })
      }

      const record = await fetchFullIndicatorOrThrow(newIndicator.id)

      return generateJsonResponse(c, record, 201, 'Indicator created')
    },
  )

  .openapi(
    createRoute({
      description: 'Update a indicator.',
      method: 'patch',
      path: '/:id',
      middleware: [authMiddleware({ permission: 'write:indicator' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
        body: {
          required: true,
          content: {
            'application/json': {
              schema: updateIndicatorSchema,
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Successfully updated a indicator.',
          content: {
            'application/json': {
              schema: createResponseSchema(baseIndicatorSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Indicator not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to update indicator'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const payload = c.req.valid('json')
      const data = {
        ...payload,
        ...(payload.categoryId !== undefined && {
          categoryId: payload.categoryId ?? null,
        }),
      }

      const [record] = await db
        .update(indicator)
        .set(updatePayload(data))
        .where(eq(indicator.id, id))
        .returning()

      if (!record) {
        throw indicatorNotFoundError()
      }

      const fullRecord = await fetchFullIndicatorOrThrow(record.id)

      return generateJsonResponse(c, fullRecord, 200, 'Indicator updated')
    },
  )

  .openapi(
    createRoute({
      description: 'Delete a indicator.',
      method: 'delete',
      path: '/:id',
      middleware: [authMiddleware({ permission: 'write:indicator' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully deleted a indicator.',
          content: {
            'application/json': {
              schema: createResponseSchema(baseIndicatorSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Indicator not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to delete indicator'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const record = await fetchFullIndicatorOrThrow(id)

      await db.delete(indicator).where(eq(indicator.id, id))

      return generateJsonResponse(c, record, 200, 'Indicator deleted')
    },
  )

export default app
