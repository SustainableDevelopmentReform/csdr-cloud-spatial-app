import { createRoute, z } from '@hono/zod-openapi'
import { count, desc, eq } from 'drizzle-orm'
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
import { indicatorCategory } from '../schemas/db'
import { baseColumns, QueryForTable } from '../schemas/util'
import {
  createIndicatorCategorySchema,
  updateIndicatorCategorySchema,
  indicatorCategorySchema,
} from '@repo/schemas/crud'

const indicatorCategoryQuery = {
  columns: {
    ...baseColumns,
    parentId: true,
    displayOrder: true,
  },
  with: {
    parent: {
      columns: baseColumns,
    },
  },
} satisfies QueryForTable<'indicatorCategory'>

const indicatorCategoryNotFoundError = () =>
  new ServerError({
    statusCode: 404,
    message: 'Failed to get indicatorCategory',
    description: "indicatorCategory you're looking for is not found",
  })

const fetchFullIndicatorCategory = async (id: string) => {
  const record = await db.query.indicatorCategory.findFirst({
    where: (indicatorCategory, { eq }) => eq(indicatorCategory.id, id),
    ...indicatorCategoryQuery,
  })

  return record ?? null
}

const fetchFullIndicatorCategoryOrThrow = async (id: string) => {
  const record = await fetchFullIndicatorCategory(id)

  if (!record) {
    throw indicatorCategoryNotFoundError()
  }

  return record
}

const app = createOpenAPIApp()
  .openapi(
    createRoute({
      description: 'List all indicator categories.',
      method: 'get',
      path: '/',
      middleware: [
        authMiddleware({
          permission: 'read:indicatorCategory',
        }),
      ],
      responses: {
        200: {
          description: 'Successfully listed all indicator categories.',
          content: {
            'application/json': {
              schema: createResponseSchema(
                z.object({
                  data: z.array(indicatorCategorySchema),
                  totalCount: z.number().int(),
                }),
              ),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        500: jsonErrorResponse('Failed to list indicator categories'),
      },
    }),
    async (c) => {
      const totalCount = await db
        .select({
          count: count(),
        })
        .from(indicatorCategory)

      const data = await db.query.indicatorCategory.findMany({
        ...indicatorCategoryQuery,
        orderBy: desc(indicatorCategory.createdAt),
      })

      return generateJsonResponse(
        c,
        {
          data,
          totalCount: totalCount[0]!.count,
        },
        200,
      )
    },
  )

  .openapi(
    createRoute({
      description: 'Get a single indicator category.',
      method: 'get',
      path: '/:id',
      middleware: [authMiddleware({ permission: 'read:indicatorCategory' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully retrieved a indicator category.',
          content: {
            'application/json': {
              schema: createResponseSchema(indicatorCategorySchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Indicator category not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to fetch indicator category'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const record = await fetchFullIndicatorCategoryOrThrow(id)

      return generateJsonResponse(c, record, 200)
    },
  )

  .openapi(
    createRoute({
      description: 'Create a indicator category.',
      method: 'post',
      path: '/',
      middleware: [
        authMiddleware({
          permission: 'write:indicatorCategory',
        }),
      ],
      request: {
        body: {
          required: true,
          content: {
            'application/json': {
              schema: createIndicatorCategorySchema,
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Successfully created a indicator category.',
          content: {
            'application/json': {
              schema: createResponseSchema(indicatorCategorySchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to create indicator category'),
      },
    }),
    async (c) => {
      const data = c.req.valid('json')
      const id = crypto.randomUUID()
      const [newIndicatorCategory] = await db
        .insert(indicatorCategory)
        .values({ ...data, id })
        .returning()

      if (!newIndicatorCategory) {
        throw new ServerError({
          statusCode: 500,
          message: 'Failed to create indicatorCategory',
          description: 'Indicator category insert did not return a record',
        })
      }

      const record = await fetchFullIndicatorCategoryOrThrow(
        newIndicatorCategory.id,
      )

      return generateJsonResponse(c, record, 201, 'Indicator category created')
    },
  )

  .openapi(
    createRoute({
      description: 'Update a indicator category.',
      method: 'patch',
      path: '/:id',
      middleware: [
        authMiddleware({
          permission: 'write:indicatorCategory',
        }),
      ],
      request: {
        params: z.object({ id: z.string().min(1) }),
        body: {
          required: true,
          content: {
            'application/json': {
              schema: updateIndicatorCategorySchema,
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Successfully updated a indicator category.',
          content: {
            'application/json': {
              schema: createResponseSchema(z.any()),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Indicator category not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to update indicator category'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const data = c.req.valid('json')
      const [record] = await db
        .update(indicatorCategory)
        .set(data)
        .where(eq(indicatorCategory.id, id))
        .returning()

      if (!record) {
        throw indicatorCategoryNotFoundError()
      }

      const fullRecord = await fetchFullIndicatorCategoryOrThrow(record.id)

      return generateJsonResponse(
        c,
        fullRecord,
        200,
        'Indicator category updated',
      )
    },
  )

  .openapi(
    createRoute({
      description: 'Delete a indicator category.',
      method: 'delete',
      path: '/:id',
      middleware: [
        authMiddleware({
          permission: 'write:indicatorCategory',
        }),
      ],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully deleted a indicator category.',
          content: {
            'application/json': {
              schema: createResponseSchema(z.any()),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Indicator category not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to delete indicator category'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const record = await fetchFullIndicatorCategoryOrThrow(id)

      await db.delete(indicatorCategory).where(eq(indicatorCategory.id, id))

      return generateJsonResponse(c, record, 200, 'Indicator category deleted')
    },
  )

export default app
