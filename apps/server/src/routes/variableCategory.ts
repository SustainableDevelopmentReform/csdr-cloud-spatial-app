import { createRoute, z } from '@hono/zod-openapi'
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
import { variableCategory } from '../schemas'
import { baseColumns, QueryForTable } from '../schemas/util'
import {
  createVariableCategorySchema,
  updateVariableCategorySchema,
} from '../schemas/zod'

const variableCategoryQuery = {
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
} satisfies QueryForTable<'variableCategory'>

const app = createOpenAPIApp()
  .openapi(
    createRoute({
      description: 'List all variable categories.',
      method: 'get',
      path: '/',
      middleware: [
        authMiddleware({
          permission: 'read:variableCategory',
        }),
      ],
      responses: {
        200: {
          description: 'Successfully listed all variable categories.',
          content: {
            'application/json': {
              schema: createResponseSchema(
                z.object({
                  data: z.array(z.any()),
                  totalCount: z.number().int(),
                }),
              ),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        500: jsonErrorResponse('Failed to list variable categories'),
      },
    }),
    async (c) => {
      const totalCount = await db
        .select({
          count: count(),
        })
        .from(variableCategory)

      const data = await db.query.variableCategory.findMany({
        ...variableCategoryQuery,
        orderBy: desc(variableCategory.createdAt),
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
      description: 'Get a single variable category.',
      method: 'get',
      path: '/:id',
      middleware: [authMiddleware({ permission: 'read:variableCategory' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully retrieved a variable category.',
          content: {
            'application/json': {
              schema: createResponseSchema(z.any()),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Variable category not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to fetch variable category'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const record = await db.query.variableCategory.findFirst({
        where: (variableCategory, { eq }) => eq(variableCategory.id, id),
        ...variableCategoryQuery,
      })

      if (!record) {
        throw new ServerError({
          statusCode: 404,
          message: 'Failed to get variableCategory',
          description: "variableCategory you're looking for is not found",
        })
      }

      return generateJsonResponse(c, record, 200)
    },
  )

  .openapi(
    createRoute({
      description: 'Create a variable category.',
      method: 'post',
      path: '/',
      middleware: [
        authMiddleware({
          permission: 'write:variableCategory',
        }),
      ],
      request: {
        body: {
          required: true,
          content: {
            'application/json': {
              schema: createVariableCategorySchema,
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Successfully created a variable category.',
          content: {
            'application/json': {
              schema: createResponseSchema(z.any()),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to create variable category'),
      },
    }),
    async (c) => {
      const data = c.req.valid('json')
      const id = crypto.randomUUID()
      const [newVariableCategory] = await db
        .insert(variableCategory)
        .values({ ...data, id })
        .returning()

      return generateJsonResponse(
        c,
        newVariableCategory,
        201,
        'Variable category created',
      )
    },
  )

  .openapi(
    createRoute({
      description: 'Update a variable category.',
      method: 'patch',
      path: '/:id',
      middleware: [
        authMiddleware({
          permission: 'write:variableCategory',
        }),
      ],
      request: {
        params: z.object({ id: z.string().min(1) }),
        body: {
          required: true,
          content: {
            'application/json': {
              schema: updateVariableCategorySchema,
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Successfully updated a variable category.',
          content: {
            'application/json': {
              schema: createResponseSchema(z.any()),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Variable category not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to update variable category'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const data = c.req.valid('json')
      const [record] = await db
        .update(variableCategory)
        .set(data)
        .where(eq(variableCategory.id, id))
        .returning()

      return generateJsonResponse(c, record, 200, 'Variable category updated')
    },
  )

  .openapi(
    createRoute({
      description: 'Delete a variable category.',
      method: 'delete',
      path: '/:id',
      middleware: [
        authMiddleware({
          permission: 'write:variableCategory',
        }),
      ],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully deleted a variable category.',
          content: {
            'application/json': {
              schema: BaseResponseSchema,
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Variable category not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to delete variable category'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      await db.delete(variableCategory).where(eq(variableCategory.id, id))

      return generateJsonResponse(c, {}, 200, 'Variable category deleted')
    },
  )

export default app
