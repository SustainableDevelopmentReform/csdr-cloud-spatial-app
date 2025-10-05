import { createRoute, z } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'
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
import { dataset, datasetRun, productRun } from '../schemas/db'
import {
  baseIdResourceSchemaWithMainRunId,
  baseRunColumns,
  baseRunResourceSchema,
  createPayload,
  idColumns,
  QueryForTable,
  updatePayload,
} from '../schemas/util'
import {
  createDatasetRunSchema,
  updateDatasetRunSchema,
} from '@repo/schemas/crud'

export const baseDatasetRunQuery = {
  columns: {
    ...baseRunColumns,
  },
  with: {
    dataset: {
      columns: {
        ...idColumns,
        mainRunId: true,
      },
    },
  },
} satisfies QueryForTable<'datasetRun'>

export const fullDatasetRunQuery = baseDatasetRunQuery

export const baseDatasetRunSchema = baseRunResourceSchema
  .extend({
    dataset: baseIdResourceSchemaWithMainRunId,
  })
  .openapi('DatasetRunBase')

export const fullDatasetRunSchema = baseDatasetRunSchema
  .extend({
    productRunCount: z.number().int(),
  })
  .openapi('DatasetRunFull')

const app = createOpenAPIApp()
  .openapi(
    createRoute({
      description: 'Retrieve a dataset run with aggregated metadata.',
      method: 'get',
      path: '/:id',
      middleware: [authMiddleware({ permission: 'read:datasetRun' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully retrieved a dataset run.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullDatasetRunSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Dataset run not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to fetch dataset run'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const results = await db.query.datasetRun.findFirst({
        where: (datasetRun, { eq }) => eq(datasetRun.id, id),
        ...fullDatasetRunQuery,
      })

      const productRunCount = await db.$count(
        productRun,
        eq(productRun.datasetRunId, id),
      )

      if (!results) {
        throw new ServerError({
          statusCode: 404,
          message: 'Failed to get datasetRun',
          description: "datasetRun you're looking for is not found",
        })
      }

      return generateJsonResponse(
        c,
        {
          ...results,
          productRunCount,
        },
        200,
      )
    },
  )
  .openapi(
    createRoute({
      description: 'Create a dataset run.',
      method: 'post',
      path: '/',
      middleware: [
        authMiddleware({
          permission: 'write:datasetRun',
        }),
      ],
      request: {
        body: {
          required: true,
          content: {
            'application/json': {
              schema: createDatasetRunSchema,
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Successfully created a dataset run.',
          content: {
            'application/json': {
              schema: createResponseSchema(
                baseDatasetRunSchema.omit({ dataset: true }).optional(),
              ),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to create dataset run'),
      },
    }),
    async (c) => {
      const payload = c.req.valid('json')
      const [newDatasetRun] = await db
        .insert(datasetRun)
        .values(createPayload(payload))
        .returning()

      return generateJsonResponse(c, newDatasetRun, 201, 'Dataset run created')
    },
  )
  .openapi(
    createRoute({
      description: 'Update a dataset run.',
      method: 'patch',
      path: '/:id',
      middleware: [
        authMiddleware({
          permission: 'write:datasetRun',
        }),
      ],
      request: {
        params: z.object({ id: z.string().min(1) }),
        body: {
          required: true,
          content: {
            'application/json': {
              schema: updateDatasetRunSchema,
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Successfully updated a dataset run.',
          content: {
            'application/json': {
              schema: createResponseSchema(
                baseDatasetRunSchema.omit({ dataset: true }).optional(),
              ),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Dataset run not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to update dataset run'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const payload = c.req.valid('json')

      const [record] = await db
        .update(datasetRun)
        .set(updatePayload(payload))
        .where(eq(datasetRun.id, id))
        .returning()

      return generateJsonResponse(c, record, 200, 'Dataset run updated')
    },
  )
  .openapi(
    createRoute({
      description: 'Delete a dataset run.',
      method: 'delete',
      path: '/:id',
      middleware: [
        authMiddleware({
          permission: 'write:datasetRun',
        }),
      ],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully deleted a dataset run.',
          content: {
            'application/json': {
              schema: BaseResponseSchema,
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Dataset run not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to delete dataset run'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      await db.delete(datasetRun).where(eq(datasetRun.id, id))

      return generateJsonResponse(c, {}, 200, 'Dataset run deleted')
    },
  )

  .openapi(
    createRoute({
      description: 'Mark a dataset run as the main run for its dataset.',
      method: 'post',
      path: '/:id/set-as-main-run',
      middleware: [
        authMiddleware({
          permission: 'write:datasetRun',
        }),
      ],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully marked a dataset run as the main run.',
          content: {
            'application/json': {
              schema: BaseResponseSchema,
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Dataset run not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to set dataset run as main'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')

      const run = await db.query.datasetRun.findFirst({
        where: (datasetRun, { eq }) => eq(datasetRun.id, id),
      })

      if (!run) {
        throw new ServerError({
          statusCode: 404,
          message: 'Dataset run not found',
          description: `Dataset run with ID ${id} does not exist`,
        })
      }

      await db
        .update(dataset)
        .set({ mainRunId: id })
        .where(eq(dataset.id, run.datasetId))

      return generateJsonResponse(c, {}, 200, 'Dataset run set as main')
    },
  )

export default app
