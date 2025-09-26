import { createRoute } from '@hono/zod-openapi'
import { count, desc, eq, sql } from 'drizzle-orm'
import { db } from '~/lib/db'
import { ServerError } from '~/lib/error'
import { authMiddleware } from '~/middlewares/auth'
import { generateJsonResponse } from '../lib/response'
import { dataset, datasetRun } from '../schemas'
import { baseColumns, QueryForTable } from '../schemas/util'
import { datasetRunQuery } from './datasetRun'
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

export const datasetQuery = {
  columns: {
    ...baseColumns,
    metadata: true,
    mainRunId: true,
  },
  with: {
    mainRun: datasetRunQuery,
  },
  extras: {
    runCount: sql<number>`(
      SELECT COUNT(*)::int
      FROM dataset_run dr
      WHERE dr.dataset_id = ${dataset}.id
    )`.as('run_count'),
    productCount: sql<number>`(
      SELECT COUNT(*)::int
      FROM product p
      WHERE p.dataset_id = ${dataset}.id
    )`.as('product_count'),
  },
} satisfies QueryForTable<'dataset'>

const app = createOpenAPIApp()
  .openapi(
    createRoute({
      description: 'List datasets with pagination metadata.',
      method: 'get',
      path: '/',
      middleware: [
        authMiddleware({
          permission: 'read:dataset',
        }),
      ],
      request: {
        query: z.object({
          page: z.coerce.number().positive().optional(),
          size: z.coerce.number().optional(),
        }),
      },
      responses: {
        200: {
          description: 'Successfully listed datasets.',
          content: {
            'application/json': {
              schema: createResponseSchema(
                z.object({
                  pageCount: z.number().int(),
                  totalCount: z.number().int(),
                  data: z.array(z.any()),
                }),
              ),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to list datasets'),
      },
    }),
    async (c) => {
      const { page = 1, size = 10 } = c.req.valid('query')
      const skip = (page - 1) * size

      const totalCount = await db
        .select({
          count: count(),
        })
        .from(dataset)
      const pageCount = Math.ceil(totalCount[0]!.count / size)

      const data = await db.query.dataset.findMany({
        ...datasetQuery,
        limit: size,
        offset: skip,
        orderBy: desc(dataset.createdAt),
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
      description: 'Retrieve a dataset by id.',
      method: 'get',
      path: '/:id',
      middleware: [authMiddleware({ permission: 'read:dataset' })],
      request: {
        params: z.object({
          id: z.string().min(1),
        }),
      },
      responses: {
        200: {
          description: 'Successfully retrieved a dataset.',
          content: {
            'application/json': {
              schema: createResponseSchema(z.any()),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Dataset not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to fetch dataset'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const record = await db.query.dataset.findFirst({
        where: (dataset, { eq }) => eq(dataset.id, id),
        ...datasetQuery,
      })

      if (!record) {
        throw new ServerError({
          statusCode: 404,
          message: 'Failed to get dataset',
          description: "Dataset you're looking for is not found",
        })
      }

      return generateJsonResponse(c, record, 200)
    },
  )
  .openapi(
    createRoute({
      description: 'List dataset runs for a dataset with pagination metadata.',
      method: 'get',
      path: '/:id/runs',
      middleware: [
        authMiddleware({
          permission: 'read:productRun',
        }),
      ],
      request: {
        params: z.object({
          id: z.string().min(1),
        }),
        query: z.object({
          page: z.coerce.number().positive().optional(),
          size: z.coerce.number().optional(),
        }),
      },
      responses: {
        200: {
          description: 'Successfully listed dataset runs.',
          content: {
            'application/json': {
              schema: createResponseSchema(
                z.object({
                  pageCount: z.number().int(),
                  totalCount: z.number().int(),
                  data: z.array(z.any()),
                }),
              ),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to list dataset runs'),
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
        .from(datasetRun)
        .where(eq(datasetRun.datasetId, id))
      const pageCount = Math.ceil(totalCount[0]!.count / size)

      const data = await db.query.datasetRun.findMany({
        ...datasetRunQuery,
        where: (datasetRun, { eq }) => eq(datasetRun.datasetId, id),
        limit: size,
        offset: skip,
        orderBy: desc(datasetRun.createdAt),
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
      description: 'Create a dataset.',
      method: 'post',
      path: '/',
      middleware: [
        authMiddleware({
          permission: 'write:dataset',
        }),
      ],
      request: {
        body: {
          required: true,
          content: {
            'application/json': {
              schema: baseCreateResourceSchema,
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Successfully created a dataset.',
          content: {
            'application/json': {
              schema: createResponseSchema(z.any()),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to create dataset'),
      },
    }),
    async (c) => {
      const payload = c.req.valid('json')
      const [newDataset] = await db
        .insert(dataset)
        .values(createPayload(payload))
        .returning()

      return generateJsonResponse(c, newDataset, 201, 'Dataset created')
    },
  )
  .openapi(
    createRoute({
      description: 'Update a dataset.',
      method: 'patch',
      path: '/:id',
      middleware: [
        authMiddleware({
          permission: 'write:dataset',
        }),
      ],
      request: {
        params: z.object({ id: z.string().min(1) }),
        body: {
          required: true,
          content: {
            'application/json': {
              schema: baseUpdateResourceSchema.extend({
                mainRunId: z.string().optional(),
              }),
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Successfully updated a dataset.',
          content: {
            'application/json': {
              schema: createResponseSchema(z.any()),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Dataset not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to update dataset'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const payload = c.req.valid('json')

      const [record] = await db
        .update(dataset)
        .set(updatePayload(payload))
        .where(eq(dataset.id, id))
        .returning()

      return generateJsonResponse(c, record, 200, 'Dataset updated')
    },
  )
  .openapi(
    createRoute({
      description: 'Delete a dataset.',
      method: 'delete',
      path: '/:id',
      middleware: [
        authMiddleware({
          permission: 'write:dataset',
        }),
      ],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully deleted a dataset.',
          content: {
            'application/json': {
              schema: BaseResponseSchema,
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Dataset not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to delete dataset'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      await db.delete(dataset).where(eq(dataset.id, id))

      return generateJsonResponse(c, {}, 200, 'Dataset deleted')
    },
  )

export default app
