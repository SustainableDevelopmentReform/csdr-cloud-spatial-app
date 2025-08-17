import { zValidator } from '@hono/zod-validator'
import { count, desc, eq, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '~/lib/db'
import { ServerError } from '~/lib/error'
import { authMiddleware } from '~/middlewares/auth'
import { generateJsonResponse } from '../lib/response'
import { product, productRun } from '../schemas'
import { QueryForTable } from '../schemas/util'
import { productRunQuery } from './productRun'

// Common query configuration for products using Drizzle query API
const productQuery = {
  columns: {
    id: true,
    name: true,
    description: true,
    createdAt: true,
    updatedAt: true,
    metadata: true,
    timePrecision: true,
    datasetId: true,
    geometriesId: true,
    mainRunId: true,
  },
  with: {
    dataset: {
      columns: {
        id: true,
        name: true,
      },
    },
    geometries: {
      columns: {
        id: true,
        name: true,
      },
    },
    mainRun: {
      columns: {
        id: true,
        createdAt: true,
        productId: true,
      },
      with: {
        outputSummary: {
          columns: {
            productRunId: true,
            startTime: true,
            endTime: true,
            outputCount: true,
            lastUpdated: true,
          },
          with: {
            variables: {
              columns: {
                productRunId: true,
                variableId: true,
                minValue: true,
                maxValue: true,
                avgValue: true,
                count: true,
                lastUpdated: true,
              },
              with: {
                variable: {
                  columns: {
                    id: true,
                    name: true,
                    description: true,
                    unit: true,
                    categoryId: true,
                  },
                },
              },
            },
          },
        },
      },
    },
    // Get all runs to calculate count on the client
    runs: {
      columns: {
        id: true,
      },
    },
  },
  extras: {
    // Alternative: Use SQL for run count if you don't want to fetch all run IDs
    runCount: sql<number>`(
      SELECT COUNT(*)::int
      FROM product_run pr
      WHERE pr.product_id = product.id
    )`.as('run_count'),
  },
} satisfies QueryForTable<'product'>

const app = new Hono()
  .get(
    '/',
    zValidator(
      'query',
      z.object({
        page: z.number({ coerce: true }).positive().optional(),
        size: z.number({ coerce: true }).optional(),
      }),
    ),
    authMiddleware({
      permission: 'read:product',
    }),
    async (c) => {
      const { page = 1, size = 10 } = c.req.valid('query')
      const skip = (page - 1) * size

      // Get total count
      const totalCount = await db
        .select({
          count: count(),
        })
        .from(product)
      const pageCount = Math.ceil(totalCount[0]!.count / size)

      // Get products with all related data using Drizzle query API
      const data = await db.query.product.findMany({
        ...productQuery,
        limit: size,
        offset: skip,
        orderBy: desc(product.createdAt),
      })

      // Transform data to include run count from the runs array
      const transformedData = data.map((p) => ({
        ...p,
        runCount: p.runs?.length || 0,
        runs: undefined, // Remove the runs array from response
      }))

      return generateJsonResponse(c, {
        pageCount,
        data: transformedData,
        totalCount: totalCount[0]!.count,
      })
    },
  )
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

    // Transform data to include run count from the runs array
    const transformedProduct = {
      ...result,
      runCount: result.runs?.length || 0,
      runs: undefined, // Remove the runs array from response
    }

    return generateJsonResponse(c, transformedProduct)
  })
  .get(
    '/:id/runs',
    zValidator(
      'query',
      z.object({
        page: z.number({ coerce: true }).positive().optional(),
        size: z.number({ coerce: true }).optional(),
      }),
    ),
    authMiddleware({
      permission: 'read:productRun',
    }),
    async (c) => {
      const id = c.req.param('id')

      const { page = 1, size = 10 } = c.req.valid('query')
      const skip = (page - 1) * size

      const totalCount = await db
        .select({
          count: count(),
        })
        .from(productRun)
      const pageCount = Math.ceil(totalCount[0]!.count / size)

      const data = await db.query.productRun.findMany({
        ...productRunQuery,
        where: (productRun, { eq }) => eq(productRun.productId, id),
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

  .post(
    '/',
    zValidator(
      'json',
      z.object({
        name: z.string(),
        description: z.string().nullable().optional(),
        metadata: z.any().optional(),
        datasetId: z.string(),
        geometriesId: z.string(),
        timePrecision: z.enum(['hour', 'day', 'month', 'year']),
      }),
    ),
    authMiddleware({
      permission: 'write:product',
    }),
    async (c) => {
      const data = c.req.valid('json')
      const id = crypto.randomUUID()
      const newProduct = await db
        .insert(product)
        .values({ ...data, id })
        .returning()

      return generateJsonResponse(c, newProduct[0], 201)
    },
  )
  .patch(
    '/:id',
    zValidator(
      'json',
      z.object({
        name: z.string().optional(),
        description: z.string().nullable().optional(),
        metadata: z.any().optional(),
        datasetId: z.string().optional(),
        geometriesId: z.string().optional(),
        timePrecision: z.enum(['hour', 'day', 'month', 'year']).optional(),
      }),
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
