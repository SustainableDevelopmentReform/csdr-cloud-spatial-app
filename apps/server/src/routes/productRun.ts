import { zValidator } from '@hono/zod-validator'
import { avg, count, desc, eq, max, min } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '~/lib/db'
import { ServerError } from '~/lib/error'
import { authMiddleware } from '~/middlewares/auth'
import { generateJsonResponse } from '../lib/response'
import {
  product,
  productOutput,
  productOutputSummary,
  productOutputSummaryVariable,
  productRun,
} from '../schemas'
import { baseColumns, QueryForTable } from '../schemas/util'
import { productOutputQuery } from './productOutput'
import {
  baseCreateResourceSchema,
  baseUpdateResourceSchema,
  transformCreateResource,
  transformUpdateResource,
} from './util'

export const productRunOutputSummaryQuery = {
  columns: {
    lastUpdated: true,
    startTime: true,
    endTime: true,
    outputCount: true,
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
            ...baseColumns,
            unit: true,
            categoryId: true,
          },
        },
      },
    },
  },
} satisfies QueryForTable<'productOutputSummary'>

// Define shared query configuration
export const productRunQuery = {
  columns: {
    ...baseColumns,
    metadata: true,
    productId: true,
  },
  with: {
    outputSummary: productRunOutputSummaryQuery,
    product: {
      columns: {
        ...baseColumns,
        mainRunId: true,
      },
    },
    datasetRun: {
      columns: baseColumns,
      with: {
        dataset: {
          columns: {
            ...baseColumns,
            mainRunId: true,
          },
        },
      },
    },
    geometriesRun: {
      columns: baseColumns,
      with: {
        geometries: {
          columns: {
            ...baseColumns,
            mainRunId: true,
          },
        },
      },
    },
  },
} satisfies QueryForTable<'productRun'>

const app = new Hono()
  .get('/:id', authMiddleware({ permission: 'read:productRun' }), async (c) => {
    const id = c.req.param('id')
    const productRun = await db.query.productRun.findFirst({
      where: (productRun, { eq }) => eq(productRun.id, id),
      ...productRunQuery,
    })

    if (!productRun) {
      throw new ServerError({
        statusCode: 404,
        message: 'Failed to get productRun',
        description: "productRun you're looking for is not found",
      })
    }

    return generateJsonResponse(c, productRun)
  })
  .get(
    '/:id/outputs',
    zValidator(
      'query',
      z.object({
        page: z.number({ coerce: true }).positive().optional(),
        size: z.number({ coerce: true }).optional(),
      }),
    ),
    authMiddleware({
      permission: 'read:productOutput',
    }),
    async (c) => {
      const id = c.req.param('id')
      const { page = 1, size = 10 } = c.req.valid('query')
      const skip = (page - 1) * size

      const totalCount = await db
        .select({
          count: count(),
        })
        .from(productOutput)
      const pageCount = Math.ceil(totalCount[0]!.count / size)

      const data = await db.query.productOutput.findMany({
        ...productOutputQuery,
        where: (productOutput, { eq }) => eq(productOutput.productRunId, id),
        limit: size,
        offset: skip,
        orderBy: desc(productOutput.createdAt),
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
      transformCreateResource(
        baseCreateResourceSchema.extend({
          productId: z.string(),
          datasetRunId: z.string(),
          geometriesRunId: z.string(),
        }),
      ),
    ),
    authMiddleware({
      permission: 'write:productRun',
    }),
    async (c) => {
      const data = c.req.valid('json')
      const newProductRun = await db.insert(productRun).values(data).returning()

      return generateJsonResponse(c, newProductRun[0], 201)
    },
  )
  .patch(
    '/:id',
    zValidator('json', transformUpdateResource(baseUpdateResourceSchema)),
    authMiddleware({
      permission: 'write:productRun',
    }),
    async (c) => {
      const id = c.req.param('id')
      const data = c.req.valid('json')
      const role = await db
        .update(productRun)
        .set(data)
        .where(eq(productRun.id, id))
        .returning()

      return generateJsonResponse(c, role[0])
    },
  )
  .delete(
    '/:id',
    authMiddleware({
      permission: 'write:productRun',
    }),
    async (c) => {
      const id = c.req.param('id')
      await db.delete(productRun).where(eq(productRun.id, id))

      return generateJsonResponse(c)
    },
  )
  .post(
    '/:id/set-as-main-run',
    authMiddleware({
      permission: 'write:productRun',
    }),
    async (c) => {
      const id = c.req.param('id')

      // Check if the product run exists
      const run = await db.query.productRun.findFirst({
        where: (productRun, { eq }) => eq(productRun.id, id),
      })

      if (!run) {
        throw new ServerError({
          statusCode: 404,
          message: 'Product run not found',
          description: `Product run with ID ${id} does not exist`,
        })
      }

      await db
        .update(product)
        .set({ mainRunId: id })
        .where(eq(product.id, run.productId))

      return generateJsonResponse(c)
    },
  )
  .post(
    '/:id/refresh-summary',
    authMiddleware({
      permission: 'write:productRun',
    }),
    async (c) => {
      const id = c.req.param('id')

      // Check if the product run exists
      const run = await db.query.productRun.findFirst({
        where: (productRun, { eq }) => eq(productRun.id, id),
      })

      if (!run) {
        throw new ServerError({
          statusCode: 404,
          message: 'Product run not found',
          description: `Product run with ID ${id} does not exist`,
        })
      }

      // Use a transaction to ensure consistency
      await db.transaction(async (tx) => {
        // 1. Calculate overall summary statistics
        const summaryStats = await tx
          .select({
            startTime: min(productOutput.timePoint),
            endTime: max(productOutput.timePoint),
            outputCount: count(),
          })
          .from(productOutput)
          .where(eq(productOutput.productRunId, id))

        const stats = summaryStats[0]

        // 2. Update or insert into productOutputSummary
        if (stats && stats.outputCount > 0) {
          await tx
            .insert(productOutputSummary)
            .values({
              productRunId: id,
              startTime: stats.startTime,
              endTime: stats.endTime,
              outputCount: stats.outputCount,
              lastUpdated: new Date(),
            })
            .onConflictDoUpdate({
              target: productOutputSummary.productRunId,
              set: {
                startTime: stats.startTime,
                endTime: stats.endTime,
                outputCount: stats.outputCount,
                lastUpdated: new Date(),
              },
            })

          // 3. Calculate per-variable statistics
          const variableStats = await tx
            .select({
              variableId: productOutput.variableId,
              minValue: min(productOutput.value),
              maxValue: max(productOutput.value),
              avgValue: avg(productOutput.value),
              count: count(),
            })
            .from(productOutput)
            .where(eq(productOutput.productRunId, id))
            .groupBy(productOutput.variableId)

          // 4. Delete existing variable summaries for this run
          await tx
            .delete(productOutputSummaryVariable)
            .where(eq(productOutputSummaryVariable.productRunId, id))

          // 5. Insert new variable summaries
          if (variableStats.length > 0) {
            await tx.insert(productOutputSummaryVariable).values(
              variableStats.map((stat) => ({
                productRunId: id,
                variableId: stat.variableId,
                minValue: stat.minValue,
                maxValue: stat.maxValue,
                avgValue: stat.avgValue,
                count: stat.count,
                lastUpdated: new Date(),
              })),
            )
          }
        } else {
          // No outputs found, remove any existing summary
          await tx
            .delete(productOutputSummary)
            .where(eq(productOutputSummary.productRunId, id))
        }
      })

      // Fetch the updated summary to return
      const updatedRun = await db.query.productRun.findFirst({
        where: (productRun, { eq }) => eq(productRun.id, id),
        with: {
          outputSummary: productRunOutputSummaryQuery,
        },
      })

      return generateJsonResponse(c, {
        message: 'Summary refreshed successfully',
        data: updatedRun,
      })
    },
  )

export default app
