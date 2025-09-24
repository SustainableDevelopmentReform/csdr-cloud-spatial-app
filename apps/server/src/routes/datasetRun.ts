import { createRoute } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'
import { db } from '~/lib/db'
import { ServerError } from '~/lib/error'
import { authMiddleware } from '~/middlewares/auth'
import { generateJsonResponse } from '../lib/response'
import { dataset, datasetRun, productRun } from '../schemas'
import { baseColumns, QueryForTable } from '../schemas/util'
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

export const datasetRunQuery = {
  columns: {
    ...baseColumns,
    metadata: true,
    datasetId: true,
  },
  with: {
    dataset: {
      columns: {
        ...baseColumns,
        mainRunId: true,
      },
    },
  },
} satisfies QueryForTable<'datasetRun'>

const app = createOpenAPIApp()
  .openapi(
    createRoute({
      method: 'get',
      path: '/:id',
      middleware: [authMiddleware({ permission: 'read:datasetRun' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Retrieve a dataset run with aggregated metadata.',
          content: {
            'application/json': {
              schema: createResponseSchema(z.any()),
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
        ...datasetRunQuery,
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
              schema: baseCreateResourceSchema.extend({
                datasetId: z.string(),
              }),
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Create a dataset run.',
          content: {
            'application/json': {
              schema: createResponseSchema(z.any()),
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
              schema: baseUpdateResourceSchema.extend({
                datasetId: z.string().optional(),
              }),
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Update a dataset run.',
          content: {
            'application/json': {
              schema: createResponseSchema(z.any()),
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
          description: 'Delete a dataset run.',
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
          description: 'Mark a dataset run as the main run for its dataset.',
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
