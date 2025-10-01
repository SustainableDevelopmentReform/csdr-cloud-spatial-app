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
import { variable } from '../schemas'
import {
  baseColumns,
  baseResourceSchema,
  createPayload,
  QueryForTable,
  updatePayload,
} from '../schemas/util'
import { createVariableSchema, updateVariableSchema } from '@repo/schemas/crud'

export const baseVariableQuery = {
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
} satisfies QueryForTable<'variable'>

export const baseVariableSchema = baseResourceSchema
  .extend({
    unit: z.string(),
    category: baseResourceSchema.nullable(),
    displayOrder: z.number().int().nullable(),
    categoryId: z.string().nullable(),
  })
  .openapi('VariableSchemaBase')

const app = createOpenAPIApp()
  .openapi(
    createRoute({
      description: 'List variables with pagination metadata.',
      method: 'get',
      path: '/',
      middleware: [authMiddleware({ permission: 'read:variable' })],
      request: {
        query: z.object({
          page: z.coerce.number().positive().optional(),
          size: z.coerce.number().optional(),
        }),
      },
      responses: {
        200: {
          description: 'List variables with pagination metadata.',
          content: {
            'application/json': {
              schema: createResponseSchema(
                z.object({
                  pageCount: z.number().int(),
                  totalCount: z.number().int(),
                  data: z.array(baseVariableSchema),
                }),
              ),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to list variables'),
      },
    }),
    async (c) => {
      const { page = 1, size = 10 } = c.req.valid('query')
      const skip = (page - 1) * size

      const totalCount = await db
        .select({
          count: count(),
        })
        .from(variable)
      const pageCount = Math.ceil(totalCount[0]!.count / size)

      const data = await db.query.variable.findMany({
        ...baseVariableQuery,
        limit: size,
        offset: skip,
        orderBy: desc(variable.createdAt),
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
      description: 'Retrieve a variable.',
      method: 'get',
      path: '/:id',
      middleware: [authMiddleware({ permission: 'read:variable' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully retrieved a variable.',
          content: {
            'application/json': {
              schema: createResponseSchema(baseVariableSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Variable not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to fetch variable'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const record = await db.query.variable.findFirst({
        where: (variable, { eq }) => eq(variable.id, id),
        ...baseVariableQuery,
      })

      if (!record) {
        throw new ServerError({
          statusCode: 404,
          message: 'Failed to get variable',
          description: "variable you're looking for is not found",
        })
      }

      return generateJsonResponse(c, record, 200)
    },
  )

  .openapi(
    createRoute({
      description: 'Create a variable.',
      method: 'post',
      path: '/',
      middleware: [authMiddleware({ permission: 'write:variable' })],
      request: {
        body: {
          required: true,
          content: {
            'application/json': {
              schema: createVariableSchema,
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Successfully created a variable.',
          content: {
            'application/json': {
              schema: createResponseSchema(z.any()),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to create variable'),
      },
    }),
    async (c) => {
      const payload = c.req.valid('json')
      const data = {
        ...payload,
        categoryId: payload.categoryId ?? null,
      }
      const [newVariable] = await db
        .insert(variable)
        .values(createPayload(data))
        .returning()

      return generateJsonResponse(c, newVariable, 201, 'Variable created')
    },
  )

  .openapi(
    createRoute({
      description: 'Update a variable.',
      method: 'patch',
      path: '/:id',
      middleware: [authMiddleware({ permission: 'write:variable' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
        body: {
          required: true,
          content: {
            'application/json': {
              schema: updateVariableSchema,
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Successfully updated a variable.',
          content: {
            'application/json': {
              schema: createResponseSchema(z.any()),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Variable not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to update variable'),
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
        .update(variable)
        .set(updatePayload(data))
        .where(eq(variable.id, id))
        .returning()

      return generateJsonResponse(c, record, 200, 'Variable updated')
    },
  )

  .openapi(
    createRoute({
      description: 'Delete a variable.',
      method: 'delete',
      path: '/:id',
      middleware: [authMiddleware({ permission: 'write:variable' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully deleted a variable.',
          content: {
            'application/json': {
              schema: BaseResponseSchema,
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Variable not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to delete variable'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      await db.delete(variable).where(eq(variable.id, id))

      return generateJsonResponse(c, {}, 200, 'Variable deleted')
    },
  )

export default app
