import { createRoute, z } from '@hono/zod-openapi'
import {
  baseProductRunSchema,
  baseProductSchema,
  createProductSchema,
  fullProductSchema,
  productQuerySchema,
  productRunQuerySchema,
  updateProductSchema,
} from '@repo/schemas/crud'
import {
  and,
  desc,
  eq,
  exists,
  inArray,
  notInArray,
  or,
  sql,
} from 'drizzle-orm'
import { fetchChartUsageCounts } from '~/lib/chartUsage'
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
import {
  product,
  productOutputSummaryIndicator,
  productRun,
} from '../schemas/db'
import {
  baseColumns,
  createPayload,
  idColumns,
  InferQueryModel,
  QueryForTable,
  updatePayload,
} from '../schemas/util'
import { normalizeFilterValues, parseQuery } from '../utils/query'
import { fullDatasetQuery } from './dataset'
import { fullGeometriesQuery } from './geometries'
import {
  baseProductRunQuery,
  fullProductRunQuery,
  parseBaseProductRun,
  parseFullProductRun,
} from './productRun'

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

const productNotFoundError = () =>
  new ServerError({
    statusCode: 404,
    message: 'Failed to get product',
    description: "Product you're looking for is not found",
  })

const parseBaseProduct = <
  T extends InferQueryModel<'product', typeof baseProductQuery>,
>(
  record: T,
) => {
  return {
    ...record,
    mainRun: record.mainRun ? parseBaseProductRun(record.mainRun) : null,
  }
}

const parseFullProduct = <
  T extends InferQueryModel<'product', typeof fullProductQuery>,
>(
  record: T,
) => {
  return {
    ...record,
    mainRun: record.mainRun ? parseFullProductRun(record.mainRun) : null,
  }
}

const fetchFullProduct = async (id: string) => {
  const record = await db.query.product.findFirst({
    where: (product, { eq }) => eq(product.id, id),
    ...fullProductQuery,
  })

  if (!record) {
    return null
  }

  const [runCount, usageCounts] = await Promise.all([
    db.$count(productRun, eq(productRun.productId, id)),
    fetchChartUsageCounts({ type: 'product', id }),
  ])

  return record
    ? parseFullProduct({ ...record, runCount, ...usageCounts })
    : null
}

const fetchFullProductOrThrow = async (id: string) => {
  const fullProduct = await fetchFullProduct(id)

  if (!fullProduct) {
    throw productNotFoundError()
  }

  return fullProduct
}

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
      const {
        productIds,
        excludeProductIds,
        datasetId,
        geometriesId,
        indicatorId,
        hasRun,
      } = c.req.valid('query')
      const productIdsArray = normalizeFilterValues(productIds)
      const excludeProductIdsArray = normalizeFilterValues(excludeProductIds)
      const datasetIds = normalizeFilterValues(datasetId)
      const geometriesIds = normalizeFilterValues(geometriesId)
      const indicatorIds = normalizeFilterValues(indicatorId)
      const baseWhere = and(
        productIdsArray.length > 0
          ? inArray(product.id, productIdsArray)
          : undefined,
        excludeProductIdsArray.length > 0
          ? notInArray(product.id, excludeProductIdsArray)
          : undefined,
        datasetIds.length > 0
          ? inArray(product.datasetId, datasetIds)
          : undefined,
        geometriesIds.length > 0
          ? inArray(product.geometriesId, geometriesIds)
          : undefined,
        indicatorIds.length > 0
          ? exists(
              db
                .select({ _: sql`1` })
                .from(productOutputSummaryIndicator)
                .where(
                  and(
                    eq(
                      productOutputSummaryIndicator.productRunId,
                      product.mainRunId,
                    ),
                    or(
                      inArray(
                        productOutputSummaryIndicator.indicatorId,
                        indicatorIds,
                      ),
                      inArray(
                        productOutputSummaryIndicator.derivedIndicatorId,
                        indicatorIds,
                      ),
                    ),
                  ),
                ),
            )
          : undefined,
        hasRun === 'true'
          ? exists(
              db
                .select({ _: sql`1` })
                .from(productRun)
                .where(eq(productRun.productId, product.id)),
            )
          : undefined,
      )
      const { meta, query } = await parseQuery(product, c.req.valid('query'), {
        defaultOrderBy: desc(product.createdAt),
        searchableColumns: [product.id, product.name, product.description],
        baseWhere,
      })

      const data = await db.query.product.findMany({
        ...baseProductQuery,
        ...query,
      })

      const parsedProducts = data.map(parseBaseProduct)

      return generateJsonResponse(
        c,
        {
          ...meta,
          data: parsedProducts,
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
      const record = await fetchFullProductOrThrow(id)

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
      const baseWhere = and(
        productId ? eq(productRun.productId, id) : undefined,
        datasetRunId ? eq(productRun.datasetRunId, datasetRunId) : undefined,
        geometriesRunId
          ? eq(productRun.geometriesRunId, geometriesRunId)
          : undefined,
      )

      const { meta, query } = await parseQuery(
        productRun,
        c.req.valid('query'),
        {
          defaultOrderBy: desc(productRun.createdAt),
          searchableColumns: [productRun.name, productRun.description],
          baseWhere,
        },
      )

      const data = await db.query.productRun.findMany({
        ...baseProductRunQuery,
        ...query,
      })

      const parsedProductRuns = data.map(parseBaseProductRun)

      return generateJsonResponse(
        c,
        {
          ...meta,
          data: parsedProductRuns,
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
              schema: createResponseSchema(fullProductSchema),
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

      if (!newProduct) {
        throw new ServerError({
          statusCode: 500,
          message: 'Failed to create product',
          description: 'Product insert did not return a record',
        })
      }

      const record = await fetchFullProductOrThrow(newProduct.id)

      return generateJsonResponse(c, record, 201, 'Product created')
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
              schema: createResponseSchema(fullProductSchema),
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

      if (!record) {
        throw productNotFoundError()
      }

      const fullRecord = await fetchFullProductOrThrow(record.id)

      return generateJsonResponse(c, fullRecord, 200, 'Product updated')
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
              schema: createResponseSchema(fullProductSchema),
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
      const record = await fetchFullProductOrThrow(id)

      await db.delete(product).where(eq(product.id, id))

      return generateJsonResponse(c, record, 200, 'Product deleted')
    },
  )

export default app
