import { createRoute, z } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'
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
import { productOutput } from '../schemas/db'
import {
  baseColumns,
  baseIdResourceSchema,
  baseIdResourceSchemaWithMainRunId,
  baseResourceSchema,
  createPayload,
  idColumns,
  idColumnsWithMainRunId,
  QueryForTable,
  updatePayload,
} from '../schemas/util'
import {
  createManyProductOutputSchema,
  createProductOutputSchema,
  updateProductOutputSchema,
} from '@repo/schemas/crud'
import {
  baseGeometryOutputQuery,
  baseGeometryOutputSchema,
  fullGeometryOutputQuery,
  fullGeometryOutputSchema,
} from './geometryOutput'
import { baseVariableQuery, baseVariableSchema } from './variable'

export const baseProductOutputQuery = {
  columns: {
    ...baseColumns,
    value: true,
    timePoint: true,
  },
  with: {
    productRun: {
      columns: idColumns,
      with: {
        product: {
          columns: idColumnsWithMainRunId,
        },
        datasetRun: {
          columns: idColumns,
          with: {
            dataset: {
              columns: idColumnsWithMainRunId,
            },
          },
        },
        geometriesRun: {
          columns: idColumns,
          with: {
            geometries: {
              columns: idColumnsWithMainRunId,
            },
          },
        },
      },
    },

    variable: baseVariableQuery,
    geometryOutput: baseGeometryOutputQuery,
  },
} satisfies QueryForTable<'productOutput'>

export const fullProductOutputQuery = {
  columns: baseProductOutputQuery.columns,
  with: {
    ...baseProductOutputQuery.with,
    geometryOutput: fullGeometryOutputQuery,
  },
} satisfies QueryForTable<'productOutput'>

export const baseProductOutputSchema = baseResourceSchema
  .extend({
    value: z.number(),
    timePoint: z.iso.datetime(),
    productRun: baseIdResourceSchema.extend({
      product: baseIdResourceSchemaWithMainRunId,
      datasetRun: baseIdResourceSchema.extend({
        dataset: baseIdResourceSchemaWithMainRunId,
      }),
      geometriesRun: baseIdResourceSchema.extend({
        geometries: baseIdResourceSchemaWithMainRunId,
      }),
    }),
    geometryOutput: baseGeometryOutputSchema,
    variable: baseVariableSchema,
  })
  .openapi('ProductOutputBase')

export const fullProductOutputSchema = baseProductOutputSchema
  .extend({
    geometryOutput: fullGeometryOutputSchema,
  })
  .openapi('ProductOutputFull')

export const productOutputExportSchema = z
  .object({
    id: z.string(),
    variableId: z.string(),
    variableName: z.string(),
    timePoint: z.iso.datetime(),
    geometryOutputId: z.string(),
    value: z.number(),
  })
  .openapi('ProductOutputExportSchema')

const app = createOpenAPIApp()
  .openapi(
    createRoute({
      description: 'Retrieve a product output.',
      method: 'get',
      path: '/:id',
      middleware: [authMiddleware({ permission: 'read:productOutput' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully retrieved a product output.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullProductOutputSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Product output not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to fetch product output'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const record = await db.query.productOutput.findFirst({
        where: (productOutput, { eq }) => eq(productOutput.id, id),
        ...fullProductOutputQuery,
      })

      if (!record) {
        throw new ServerError({
          statusCode: 404,
          message: 'Failed to get productOutput',
          description: "productOutput you're looking for is not found",
        })
      }

      return generateJsonResponse(c, record, 200)
    },
  )
  .openapi(
    createRoute({
      description: 'Create a product output.',
      method: 'post',
      path: '/',
      middleware: [authMiddleware({ permission: 'write:productOutput' })],
      request: {
        body: {
          required: true,
          content: {
            'application/json': {
              schema: createProductOutputSchema,
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Successfully created a product output.',
          content: {
            'application/json': {
              schema: createResponseSchema(
                fullProductOutputSchema
                  .omit({
                    geometryOutput: true,
                    productRun: true,
                    variable: true,
                  })
                  .optional(),
              ),
            },
          },
        },
        400: jsonErrorResponse('Time point is not a valid date'),
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to create product output'),
      },
    }),
    async (c) => {
      const payload = c.req.valid('json')
      const timePointDate = new Date(payload.timePoint)

      if (Number.isNaN(timePointDate.valueOf())) {
        throw new ServerError({
          statusCode: 400,
          message: 'Failed to create productOutput',
          description: 'Time point is not a valid date',
        })
      }

      const [newProductOutput] = await db
        .insert(productOutput)
        .values(createPayload({ ...payload, timePoint: timePointDate }))
        .returning()

      return generateJsonResponse(
        c,
        newProductOutput,
        201,
        'Product output created',
      )
    },
  )
  .openapi(
    createRoute({
      description:
        'Create multiple product outputs, for a given product run, variable, and time point.',
      method: 'post',
      path: '/bulk',
      middleware: [authMiddleware({ permission: 'write:productOutput' })],
      request: {
        body: {
          required: true,
          content: {
            'application/json': {
              schema: createManyProductOutputSchema,
            },
          },
        },
      },
      responses: {
        201: {
          description:
            'Create multiple product outputs. This allows creating multiple outputs for the same time, variable, and product run.',
          content: {
            'application/json': {
              schema: createResponseSchema(
                z.array(
                  fullProductOutputSchema.omit({
                    geometryOutput: true,
                    productRun: true,
                    variable: true,
                  }),
                ),
              ),
            },
          },
        },
        400: jsonErrorResponse('Time point is not a valid date'),
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to create product output'),
      },
    }),
    async (c) => {
      const payload = c.req.valid('json')
      const timePointDate = new Date(payload.timePoint)

      if (Number.isNaN(timePointDate.valueOf())) {
        throw new ServerError({
          statusCode: 400,
          message: 'Failed to create productOutput',
          description: 'Time point is not a valid date',
        })
      }

      const { outputs, ...rest } = payload

      const newProductOutputs = await db
        .insert(productOutput)
        .values(
          outputs.map((output) =>
            createPayload({ ...output, ...rest, timePoint: timePointDate }),
          ),
        )
        .returning()

      return generateJsonResponse(
        c,
        newProductOutputs,
        201,
        'Product output created',
      )
    },
  )

  .openapi(
    createRoute({
      description: 'Update a product output.',
      method: 'patch',
      path: '/:id',
      middleware: [authMiddleware({ permission: 'write:productOutput' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
        body: {
          required: true,
          content: {
            'application/json': {
              schema: updateProductOutputSchema,
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Successfully updated a product output.',
          content: {
            'application/json': {
              schema: createResponseSchema(
                fullProductOutputSchema
                  .omit({
                    geometryOutput: true,
                    productRun: true,
                    variable: true,
                  })
                  .optional(),
              ),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Product output not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to update product output'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const payload = c.req.valid('json')

      const [record] = await db
        .update(productOutput)
        .set(updatePayload(payload))
        .where(eq(productOutput.id, id))
        .returning()

      return generateJsonResponse(c, record, 200, 'Product output updated')
    },
  )

export default app
