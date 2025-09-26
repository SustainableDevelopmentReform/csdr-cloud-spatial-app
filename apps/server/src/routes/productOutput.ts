import { createRoute } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'
import { db } from '~/lib/db'
import { ServerError } from '~/lib/error'
import { authMiddleware } from '~/middlewares/auth'
import { generateJsonResponse } from '../lib/response'
import { productOutput } from '../schemas'
import { baseColumns, baseRunColumns, QueryForTable } from '../schemas/util'
import {
  baseCreateResourceSchema,
  baseUpdateResourceSchema,
  createPayload,
  updatePayload,
} from './util'
import {
  createOpenAPIApp,
  createResponseSchema,
  jsonErrorResponse,
  validationErrorResponse,
  z,
} from '~/lib/openapi'

// Define shared query configuration
export const productOutputQuery = {
  columns: {
    ...baseColumns,
    value: true,
    timePoint: true,
    productRunId: true,
    geometryOutputId: true,
  },
  with: {
    productRun: {
      columns: baseColumns,
      with: {
        product: {
          columns: { ...baseColumns, mainRunId: true },
        },
        datasetRun: {
          columns: baseRunColumns,
          with: {
            dataset: {
              columns: { ...baseColumns, mainRunId: true },
            },
          },
        },
      },
    },
    variable: {
      columns: {
        ...baseColumns,
        unit: true,
      },
    },
    geometryOutput: {
      columns: {
        ...baseColumns,
        geometry: true,
      },
      with: {
        geometriesRun: {
          with: {
            geometries: {
              columns: { ...baseColumns, mainRunId: true },
            },
          },
        },
      },
    },
  },
} satisfies QueryForTable<'productOutput'>

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
              schema: createResponseSchema(z.any()),
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
        ...productOutputQuery,
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
              schema: baseCreateResourceSchema.extend({
                productRunId: z.string(),
                geometryOutputId: z.string(),
                value: z.string(),
                variableId: z.string(),
                timePoint: z.iso.datetime(),
              }),
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Successfully created a product output.',
          content: {
            'application/json': {
              schema: createResponseSchema(z.any()),
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
              schema: z.object({
                productRunId: z.string(),
                variableId: z.string(),
                timePoint: z.iso.datetime(),
                outputs: z.array(
                  baseCreateResourceSchema.extend({
                    geometryOutputId: z.string(),
                    value: z.string(),
                  }),
                ),
              }),
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
              schema: createResponseSchema(z.any()),
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

      const [newProductOutput] = await db
        .insert(productOutput)
        .values(
          outputs.map((output) =>
            createPayload({ ...output, ...rest, timePoint: timePointDate }),
          ),
        )
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
              schema: baseUpdateResourceSchema,
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Successfully updated a product output.',
          content: {
            'application/json': {
              schema: createResponseSchema(z.any()),
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
