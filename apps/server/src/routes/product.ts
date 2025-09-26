import { createRoute } from '@hono/zod-openapi'
import { and, count, desc, eq, sql, SQL } from 'drizzle-orm'
import { db } from '~/lib/db'
import { ServerError } from '~/lib/error'
import { authMiddleware } from '~/middlewares/auth'
import { generateJsonResponse } from '../lib/response'
import { product, productRun } from '../schemas'
import { baseColumns, QueryForTable } from '../schemas/util'
import { productRunQuery } from './productRun'
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
import { datasetQuery } from './dataset'
import { geometriesQuery } from './geometries'
import { datasetRunQuery } from './datasetRun'
import { geometriesRunQuery } from './geometriesRun'

const productQuery = {
  columns: {
    ...baseColumns,
    metadata: true,
    timePrecision: true,
    datasetId: true,
    geometriesId: true,
    mainRunId: true,
  },
  with: {
    dataset: {
      columns: datasetQuery.columns,
      with: { mainRun: { columns: datasetQuery.with.mainRun.columns } },
    },
    geometries: {
      columns: geometriesQuery.columns,
      with: { mainRun: { columns: geometriesQuery.with.mainRun.columns } },
    },
    mainRun: {
      columns: productRunQuery.columns,
      with: {
        datasetRun: { columns: datasetRunQuery.columns },
        geometriesRun: { columns: geometriesRunQuery.columns },
      },
    },
  },
  extras: {
    runCount: sql<number>`(
      SELECT COUNT(*)::int
      FROM product_run pr
      WHERE pr.product_id = ${product}.id
    )`.as('run_count'),
  },
} satisfies QueryForTable<'product'>

const app = createOpenAPIApp()
  .openapi(
    createRoute({
      description: 'List products with pagination metadata.',
      method: 'get',
      path: '/',
      middleware: [authMiddleware({ permission: 'read:product' })],
      request: {
        query: z.object({
          page: z.coerce.number().positive().optional(),
          size: z.coerce.number().optional(),
          datasetId: z.string().optional(),
          geometriesId: z.string().optional(),
        }),
      },
      responses: {
        200: {
          description: 'Successfully listed products.',
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
        500: jsonErrorResponse('Failed to list products'),
      },
    }),
    async (c) => {
      const {
        page = 1,
        size = 10,
        datasetId,
        geometriesId,
      } = c.req.valid('query')
      const skip = (page - 1) * size

      const filters: SQL[] = []
      if (datasetId) {
        filters.push(eq(product.datasetId, datasetId))
      }
      if (geometriesId) {
        filters.push(eq(product.geometriesId, geometriesId))
      }

      // Get total count
      const totalCount = await db
        .select({
          count: count(),
        })
        .from(product)
        .where(and(...filters))
      const pageCount = Math.ceil(totalCount[0]!.count / size)

      // Get products with all related data using Drizzle query API
      const data = await db.query.product.findMany({
        ...productQuery,
        where: and(...filters),
        limit: size,
        offset: skip,
        orderBy: desc(product.createdAt),
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
      description: 'Retrieve a product.',
      method: 'get',
      path: '/:id',
      middleware: [authMiddleware({ permission: 'read:product' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully retrieved a product.',
          content: {
            'application/json': {
              schema: createResponseSchema(z.any()),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Product not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to fetch product'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const record = await db.query.product.findFirst({
        where: (product, { eq }) => eq(product.id, id),
        ...productQuery,
      })

      if (!record) {
        throw new ServerError({
          statusCode: 404,
          message: 'Failed to get product',
          description: "Product you're looking for is not found",
        })
      }

      return generateJsonResponse(c, record, 200)
    },
  )

  .openapi(
    createRoute({
      description:
        'List product runs for a product, or across products using "*".',
      method: 'get',
      path: '/:id/runs',
      middleware: [authMiddleware({ permission: 'read:productRun' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
        query: z.object({
          page: z.coerce.number().positive().optional(),
          size: z.coerce.number().optional(),
          datasetRunId: z.string().optional(),
          geometriesRunId: z.string().optional(),
        }),
      },
      responses: {
        200: {
          description:
            'Successfully listed product runs for a product or across products using "*".',
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
        500: jsonErrorResponse('Failed to list product runs'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const productId = id === '*' ? undefined : id
      const {
        page = 1,
        size = 10,
        datasetRunId,
        geometriesRunId,
      } = c.req.valid('query')
      const skip = (page - 1) * size

      const totalCount = await db
        .select({
          count: count(),
        })
        .from(productRun)
      const pageCount = Math.ceil(totalCount[0]!.count / size)

      const filters: SQL[] = []
      if (productId) {
        filters.push(eq(productRun.productId, id))
      }
      if (datasetRunId) {
        filters.push(eq(productRun.datasetRunId, datasetRunId))
      }
      if (geometriesRunId) {
        filters.push(eq(productRun.geometriesRunId, geometriesRunId))
      }

      const data = await db.query.productRun.findMany({
        ...productRunQuery,
        where: and(...filters),
        limit: size,
        offset: skip,
        orderBy: desc(productRun.createdAt),
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
      description: 'Create a product.',
      method: 'post',
      path: '/',
      middleware: [authMiddleware({ permission: 'write:product' })],
      request: {
        body: {
          required: true,
          content: {
            'application/json': {
              schema: baseCreateResourceSchema.extend({
                datasetId: z.string(),
                geometriesId: z.string(),
                timePrecision: z.enum(['hour', 'day', 'month', 'year']),
              }),
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Successfully created a product.',
          content: {
            'application/json': {
              schema: createResponseSchema(z.any()),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to create product'),
      },
    }),
    async (c) => {
      const payload = c.req.valid('json')
      const [newProduct] = await db
        .insert(product)
        .values(createPayload(payload))
        .returning()

      return generateJsonResponse(c, newProduct, 201, 'Product created')
    },
  )

  .openapi(
    createRoute({
      description: 'Update a product.',
      method: 'patch',
      path: '/:id',
      middleware: [authMiddleware({ permission: 'write:product' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
        body: {
          required: true,
          content: {
            'application/json': {
              schema: baseUpdateResourceSchema.extend({
                mainRunId: z.string().optional(),
                timePrecision: z
                  .enum(['hour', 'day', 'month', 'year'])
                  .optional(),
              }),
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Successfully updated a product.',
          content: {
            'application/json': {
              schema: createResponseSchema(z.any()),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Product not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to update product'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const payload = c.req.valid('json')

      const [record] = await db
        .update(product)
        .set(updatePayload(payload))
        .where(eq(product.id, id))
        .returning()

      return generateJsonResponse(c, record, 200, 'Product updated')
    },
  )

  .openapi(
    createRoute({
      description: 'Delete a product.',
      method: 'delete',
      path: '/:id',
      middleware: [authMiddleware({ permission: 'write:product' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully deleted a product.',
          content: {
            'application/json': {
              schema: BaseResponseSchema,
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Product not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to delete product'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      await db.delete(product).where(eq(product.id, id))

      return generateJsonResponse(c, {}, 200, 'Product deleted')
    },
  )

export default app
