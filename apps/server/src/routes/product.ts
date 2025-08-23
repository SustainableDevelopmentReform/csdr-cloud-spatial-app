import { zValidator } from '@hono/zod-validator'
import { and, count, desc, eq, SQL, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '~/lib/db'
import { ServerError } from '~/lib/error'
import { authMiddleware } from '~/middlewares/auth'
import { generateJsonResponse } from '../lib/response'
import { product, productRun } from '../schemas'
import { baseColumns, QueryForTable } from '../schemas/util'
import { productRunOutputSummaryQuery, productRunQuery } from './productRun'
import {
  baseCreateResourceSchema,
  baseUpdateResourceSchema,
  transformCreateResource,
  transformUpdateResource,
} from './util'

// Common query configuration for products using Drizzle query API
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
      columns: baseColumns,
    },
    geometries: {
      columns: baseColumns,
    },
    mainRun: productRunQuery,
  },
  extras: {
    runCount: sql<number>`(
      SELECT COUNT(*)::int
      FROM product_run pr
      WHERE pr.product_id = ${product}.id
    )`.as('run_count'),
  },
} satisfies QueryForTable<'product'>

const app = new Hono()
  // GET ALL PRODUCTS
  .get(
    '/',
    zValidator(
      'query',
      z.object({
        page: z.number({ coerce: true }).positive().optional(),
        size: z.number({ coerce: true }).optional(),
        datasetId: z.string().optional(),
        geometriesId: z.string().optional(),
      }),
    ),
    authMiddleware({
      permission: 'read:product',
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

      return generateJsonResponse(c, {
        pageCount,
        data,
        totalCount: totalCount[0]!.count,
      })
    },
  )
  // GET A SINGLE PRODUCT
  .get('/:id', authMiddleware({ permission: 'read:product' }), async (c) => {
    const id = c.req.param('id')

    // Get single product with all related data using Drizzle query API
    const result = await db.query.product.findFirst({
      where: (product, { eq }) => eq(product.id, id),
      ...productQuery,
    })

    if (!result) {
      throw new ServerError({
        statusCode: 404,
        message: 'Failed to get product',
        description: "Product you're looking for is not found",
      })
    }

    return generateJsonResponse(c, result)
  })
  // GET ALL PRODUCT RUNS FOR A PRODUCT
  .get(
    '/:id/runs',
    zValidator(
      'query',
      z.object({
        datasetRunId: z.string().optional(),
        geometriesRunId: z.string().optional(),
        page: z.number({ coerce: true }).positive().optional(),
        size: z.number({ coerce: true }).optional(),
      }),
    ),
    authMiddleware({
      permission: 'read:productRun',
    }),
    async (c) => {
      const id = c.req.param('id')
      // Allow * to be used as a wildcard for the product id - to show all product runs
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

      return generateJsonResponse(c, {
        pageCount,
        data,
        totalCount: totalCount[0]!.count,
      })
    },
  )

  // CREATE A NEW PRODUCT
  .post(
    '/',
    zValidator(
      'json',
      transformCreateResource(
        baseCreateResourceSchema.extend({
          datasetId: z.string(),
          geometriesId: z.string(),
          timePrecision: z.enum(['hour', 'day', 'month', 'year']),
        }),
      ),
    ),
    authMiddleware({
      permission: 'write:product',
    }),
    async (c) => {
      const data = c.req.valid('json')
      const newProduct = await db.insert(product).values(data).returning()

      return generateJsonResponse(c, newProduct[0], 201)
    },
  )
  // UPDATE A PRODUCT
  .patch(
    '/:id',
    zValidator(
      'json',
      transformUpdateResource(
        baseUpdateResourceSchema.extend({
          mainRunId: z.string().optional(),
          timePrecision: z.enum(['hour', 'day', 'month', 'year']).optional(),
        }),
      ),
    ),
    authMiddleware({
      permission: 'write:product',
    }),
    async (c) => {
      const id = c.req.param('id')
      const data = c.req.valid('json')
      const role = await db
        .update(product)
        .set(data)
        .where(eq(product.id, id))
        .returning()

      return generateJsonResponse(c, role[0])
    },
  )
  // DELETE A PRODUCT
  .delete(
    '/:id',
    authMiddleware({
      permission: 'write:product',
    }),
    async (c) => {
      const id = c.req.param('id')
      await db.delete(product).where(eq(product.id, id))

      return generateJsonResponse(c)
    },
  )

export default app
