import { createRoute, z } from '@hono/zod-openapi'
import {
  createVariableSchema,
  updateVariableSchema,
  variableQuerySchema,
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
import { variable } from '../schemas/db'
import {
  baseColumns,
  baseResourceSchema,
  createPayload,
  QueryForTable,
  updatePayload,
} from '../schemas/util'
import { parseQuery } from '../utils/query'

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

const variableNotFoundError = () =>
  new ServerError({
    statusCode: 404,
    message: 'Failed to get variable',
    description: "variable you're looking for is not found",
  })

const fetchFullVariable = async (id: string) => {
  const record = await db.query.variable.findFirst({
    where: (variable, { eq }) => eq(variable.id, id),
    ...baseVariableQuery,
  })

  return record ?? null
}

const fetchFullVariableOrThrow = async (id: string) => {
  const record = await fetchFullVariable(id)

  if (!record) {
    throw variableNotFoundError()
  }

  return record
}

const app = createOpenAPIApp()
  .openapi(
    createRoute({
      description: 'List variables with pagination metadata.',
      method: 'get',
      path: '/',
      middleware: [authMiddleware({ permission: 'read:variable' })],
      request: {
        query: variableQuerySchema,
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
      const { variableIds } = c.req.valid('query')
      const { pageCount, totalCount, ...query } = await parseQuery(
        variable,
        c.req.valid('query'),
        {
          defaultOrderBy: desc(variable.createdAt),
          searchableColumns: [variable.name],
        },
      )

      if (variableIds) {
        query.where = and(
          query.where,
          inArray(
            variable.id,
            Array.isArray(variableIds) ? variableIds : [variableIds],
          ),
        )
      }

      const data = await db.query.variable.findMany({
        ...baseVariableQuery,
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
      const record = await fetchFullVariableOrThrow(id)

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
              schema: createResponseSchema(baseVariableSchema),
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

      if (!newVariable) {
        throw new ServerError({
          statusCode: 500,
          message: 'Failed to create variable',
          description: 'Variable insert did not return a record',
        })
      }

      const record = await fetchFullVariableOrThrow(newVariable.id)

      return generateJsonResponse(c, record, 201, 'Variable created')
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
              schema: createResponseSchema(baseVariableSchema),
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

      if (!record) {
        throw variableNotFoundError()
      }

      const fullRecord = await fetchFullVariableOrThrow(record.id)

      return generateJsonResponse(c, fullRecord, 200, 'Variable updated')
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
              schema: createResponseSchema(baseVariableSchema),
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
      const record = await fetchFullVariableOrThrow(id)

      await db.delete(variable).where(eq(variable.id, id))

      return generateJsonResponse(c, record, 200, 'Variable deleted')
    },
  )

export default app
