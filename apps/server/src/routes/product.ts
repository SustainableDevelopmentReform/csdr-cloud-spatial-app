import { createRoute, z } from '@hono/zod-openapi'
import {
  createProductSchema,
  productQuerySchema,
  productRunQuerySchema,
  updateProductSchema,
} from '@repo/schemas/crud'
import { and, count, desc, eq, SQL } from 'drizzle-orm'
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
import { product, productRun } from '../schemas/db'
import {
  baseColumns,
  baseIdResourceSchema,
  baseResourceSchema,
  createPayload,
  idColumns,
  QueryForTable,
  updatePayload,
} from '../schemas/util'
import { fullDatasetQuery, fullDatasetSchema } from './dataset'
import { fullGeometriesQuery, fullGeometriesSchema } from './geometries'
import {
  baseProductRunQuery,
  baseProductRunSchema,
  fullProductRunQuery,
  fullProductRunSchema,
} from './productRun'
import { parseQuery } from '../utils/query'

const baseProductQuery = {
  columns: {
    ...baseColumns,
    timePrecision: true,
    mainRunId: true,
  },
  with: {
    dataset: { columns: idColumns },
    geometries: { columns: idColumns },
    mainRun: baseProductRunQuery,
  },
} satisfies QueryForTable<'product'>

export const fullProductQuery = {
  columns: baseProductQuery.columns,
  with: {
    dataset: fullDatasetQuery,
    geometries: fullGeometriesQuery,
    mainRun: fullProductRunQuery,
  },
} satisfies QueryForTable<'product'>

const baseProductSchema = baseResourceSchema
  .extend({
    timePrecision: z.enum(['hour', 'day', 'month', 'year']),
    mainRunId: z.string().nullable(),
    dataset: baseIdResourceSchema,
    geometries: baseIdResourceSchema,
    mainRun: baseProductRunSchema.nullable(),
  })
  .openapi('ProductBase')

const fullProductSchema = baseProductSchema
  .extend({
    dataset: fullDatasetSchema.omit({ runCount: true, productCount: true }),
    geometries: fullGeometriesSchema.omit({
      runCount: true,
      productCount: true,
    }),
    mainRun: fullProductRunSchema.nullable(),
    runCount: z.number().int(),
  })
  .openapi('ProductFull')

const app = createOpenAPIApp()
  .openapi(
    createRoute({
      description: 'List products with pagination metadata.',
      method: 'get',
      path: '/',
      middleware: [authMiddleware({ permission: 'read:product' })],
      request: {
        query: productQuerySchema,
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
                  data: z.array(baseProductSchema),
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
      const { datasetId, geometriesId } = c.req.valid('query')
      const { pageCount, totalCount, ...query } = await parseQuery(
        product,
        c.req.valid('query'),
        {
          defaultOrderBy: desc(product.createdAt),
          searchableColumns: [product.name],
        },
      )

      const filters: SQL[] = []
      if (datasetId) {
        filters.push(eq(product.datasetId, datasetId))
      }
      if (geometriesId) {
        filters.push(eq(product.geometriesId, geometriesId))
      }

      const data = await db.query.product.findMany({
        ...baseProductQuery,
        ...query,
        where: and(query.where, ...filters),
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
              schema: createResponseSchema(fullProductSchema),
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
        ...fullProductQuery,
      })

      if (!record) {
        throw new ServerError({
          statusCode: 404,
          message: 'Failed to get product',
          description: "Product you're looking for is not found",
        })
      }

      const runCount = await db.$count(productRun, eq(productRun.productId, id))

      return generateJsonResponse(c, { ...record, runCount }, 200)
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
        query: productRunQuerySchema,
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
                  data: z.array(baseProductRunSchema),
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
      const { datasetRunId, geometriesRunId } = c.req.valid('query')

      const { pageCount, totalCount, ...query } = await parseQuery(
        productRun,
        c.req.valid('query'),
        {
          defaultOrderBy: desc(productRun.createdAt),
          searchableColumns: [productRun.name],
        },
      )

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
        ...baseProductRunQuery,
        where: and(query.where, ...filters),
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
      description: 'Create a product.',
      method: 'post',
      path: '/',
      middleware: [authMiddleware({ permission: 'write:product' })],
      request: {
        body: {
          required: true,
          content: {
            'application/json': {
              schema: createProductSchema,
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Successfully created a product.',
          content: {
            'application/json': {
              schema: createResponseSchema(
                baseProductSchema
                  .omit({ mainRun: true, geometries: true, dataset: true })
                  .optional(),
              ),
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
              schema: updateProductSchema,
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Successfully updated a product.',
          content: {
            'application/json': {
              schema: createResponseSchema(
                baseProductSchema
                  .omit({ mainRun: true, geometries: true, dataset: true })
                  .optional(),
              ),
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
