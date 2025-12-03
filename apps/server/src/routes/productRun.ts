import { createRoute, z } from '@hono/zod-openapi'
import {
  baseProductOutputSchema,
  createProductRunSchema,
  fullProductRunSchema,
  productOutputExportQuerySchema,
  productOutputExportSchema,
  productOutputQuerySchema,
  updateProductRunSchema,
} from '@repo/schemas/crud'
import { and, avg, count, desc, eq, inArray, max, min, SQL } from 'drizzle-orm'
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
  productOutput,
  productOutputSummary,
  productOutputSummaryVariable,
  productRun,
} from '../schemas/db'
import {
  baseRunColumns,
  createPayload,
  idColumns,
  idColumnsWithMainRunId,
  QueryForTable,
  updatePayload,
} from '../schemas/util'
import { parseQuery } from '../utils/query'
import { baseDatasetRunQuery } from './datasetRun'
import { baseGeometriesRunQuery } from './geometriesRun'
import { baseProductOutputQuery } from './productOutput'
import { baseVariableQuery } from './variable'

export const baseProductRunOutputSummaryQuery = {
  columns: {
    lastUpdated: true,
    startTime: true,
    endTime: true,
    outputCount: true,
    timePoints: true,
  },
  with: {
    variables: {
      with: {
        variable: baseVariableQuery,
      },
    },
  },
} satisfies QueryForTable<'productOutputSummary'>

export const fullProductRunOutputSummaryQuery = {
  columns: baseProductRunOutputSummaryQuery.columns,
  with: {
    variables: {
      columns: {
        minValue: true,
        maxValue: true,
        avgValue: true,
        count: true,
        lastUpdated: true,
      },
      with: {
        variable: baseVariableQuery,
      },
    },
  },
} satisfies QueryForTable<'productOutputSummary'>

export const baseProductRunQuery = {
  columns: {
    ...baseRunColumns,
  },
  with: {
    product: {
      columns: idColumnsWithMainRunId,
    },
    datasetRun: {
      columns: idColumns,
    },
    geometriesRun: {
      columns: idColumns,
    },
    outputSummary: baseProductRunOutputSummaryQuery,
  },
} satisfies QueryForTable<'productRun'>

export const fullProductRunQuery = {
  columns: baseProductRunQuery.columns,
  with: {
    ...baseProductRunQuery.with,
    datasetRun: baseDatasetRunQuery,
    geometriesRun: baseGeometriesRunQuery,
    outputSummary: fullProductRunOutputSummaryQuery,
  },
} satisfies QueryForTable<'productRun'>

const productRunNotFoundError = () =>
  new ServerError({
    statusCode: 404,
    message: 'Failed to get productRun',
    description: "productRun you're looking for is not found",
  })

const fetchFullProductRun = async (id: string) => {
  const record = await db.query.productRun.findFirst({
    where: (productRun, { eq }) => eq(productRun.id, id),
    ...fullProductRunQuery,
  })

  return record ?? null
}

const fetchFullProductRunOrThrow = async (id: string) => {
  const record = await fetchFullProductRun(id)

  if (!record) {
    throw productRunNotFoundError()
  }

  return record
}

const app = createOpenAPIApp()
  .openapi(
    createRoute({
      description: 'Retrieve a product run.',
      method: 'get',
      path: '/:id',
      middleware: [authMiddleware({ permission: 'read:productRun' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully retrieved a product run.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullProductRunSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Product run not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to fetch product run'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const record = await fetchFullProductRunOrThrow(id)

      return generateJsonResponse(c, record, 200)
    },
  )

  .openapi(
    createRoute({
      description: 'List outputs for a product run.',
      method: 'get',
      path: '/:id/outputs',
      middleware: [authMiddleware({ permission: 'read:productOutput' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
        query: productOutputQuerySchema,
      },
      responses: {
        200: {
          description: 'Successfully listed outputs for a product run.',
          content: {
            'application/json': {
              schema: createResponseSchema(
                z.object({
                  pageCount: z.number().int(),
                  totalCount: z.number().int(),
                  data: z.array(baseProductOutputSchema),
                }),
              ),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to list product outputs'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const { variableId, geometryOutputId, timePoint } = c.req.valid('query')

      const { pageCount, totalCount, ...query } = await parseQuery(
        productOutput,
        c.req.valid('query'),
        {
          defaultOrderBy: desc(productOutput.createdAt),
          searchableColumns: [productOutput.name],
        },
      )
      const filters: SQL[] = [eq(productOutput.productRunId, id)]

      if (variableId) {
        filters.push(eq(productOutput.variableId, variableId))
      }
      if (geometryOutputId) {
        filters.push(eq(productOutput.geometryOutputId, geometryOutputId))
      }
      if (timePoint) {
        filters.push(eq(productOutput.timePoint, new Date(timePoint)))
      }

      const data = await db.query.productOutput.findMany({
        ...baseProductOutputQuery,
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
      description: 'Export outputs for a product run.',
      method: 'get',
      path: '/:id/outputs/export',
      middleware: [authMiddleware({ permission: 'read:productOutput' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
        query: productOutputExportQuerySchema,
      },
      responses: {
        200: {
          description: 'Successfully exported outputs for a product run.',
          content: {
            'application/json': {
              schema: createResponseSchema(
                z.object({
                  data: z.array(productOutputExportSchema),
                }),
              ),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to export product outputs'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const { variableId, geometryOutputId, timePoint } = c.req.valid('query')

      const filters: SQL[] = [eq(productOutput.productRunId, id)]

      if (variableId) {
        const variableIds = Array.isArray(variableId)
          ? variableId
          : [variableId]
        filters.push(inArray(productOutput.variableId, variableIds))
      }
      if (geometryOutputId) {
        const geometryOutputIds = Array.isArray(geometryOutputId)
          ? geometryOutputId
          : [geometryOutputId]
        filters.push(inArray(productOutput.geometryOutputId, geometryOutputIds))
      }

      if (timePoint) {
        const timePoints = Array.isArray(timePoint) ? timePoint : [timePoint]
        filters.push(
          inArray(
            productOutput.timePoint,
            timePoints.map((timePoint) => new Date(timePoint)),
          ),
        )
      }

      const data = await db.query.productOutput.findMany({
        columns: {
          id: true,
          variableId: true,
          timePoint: true,
          geometryOutputId: true,
          value: true,
        },
        with: {
          variable: {
            columns: {
              name: true,
            },
          },
          geometryOutput: {
            columns: {
              name: true,
            },
          },
        },
        where: and(...filters),
        orderBy: () => [
          desc(productOutput.variableId),
          desc(productOutput.timePoint),
          desc(productOutput.geometryOutputId),
        ],
      })

      const dataWithVariableName = data.map((output) => ({
        ...output,
        variableName: output.variable.name,
        geometryOutputName: output.geometryOutput?.name ?? undefined,
        geometryOutputId: output.geometryOutputId ?? undefined,
      }))

      return generateJsonResponse(
        c,
        {
          data: dataWithVariableName,
        },
        200,
      )
    },
  )

  .openapi(
    createRoute({
      description: 'Create a product run.',
      method: 'post',
      path: '/',
      middleware: [authMiddleware({ permission: 'write:productRun' })],
      request: {
        body: {
          required: true,
          content: {
            'application/json': {
              schema: createProductRunSchema,
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Successfully created a product run.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullProductRunSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to create product run'),
      },
    }),
    async (c) => {
      const payload = c.req.valid('json')
      const [newProductRun] = await db
        .insert(productRun)
        .values(createPayload(payload))
        .returning()

      if (!newProductRun) {
        throw new ServerError({
          statusCode: 500,
          message: 'Failed to create productRun',
          description: 'Product run insert did not return a record',
        })
      }

      const record = await fetchFullProductRunOrThrow(newProductRun.id)

      return generateJsonResponse(c, record, 201, 'Product run created')
    },
  )

  .openapi(
    createRoute({
      description: 'Update a product run.',
      method: 'patch',
      path: '/:id',
      middleware: [authMiddleware({ permission: 'write:productRun' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
        body: {
          required: true,
          content: {
            'application/json': {
              schema: updateProductRunSchema,
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Successfully updated a product run.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullProductRunSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Product run not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to update product run'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const payload = c.req.valid('json')

      const [record] = await db
        .update(productRun)
        .set(updatePayload(payload))
        .where(eq(productRun.id, id))
        .returning()

      if (!record) {
        throw productRunNotFoundError()
      }

      const fullRecord = await fetchFullProductRunOrThrow(record.id)

      return generateJsonResponse(c, fullRecord, 200, 'Product run updated')
    },
  )

  .openapi(
    createRoute({
      description: 'Delete a product run.',
      method: 'delete',
      path: '/:id',
      middleware: [authMiddleware({ permission: 'write:productRun' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully deleted a product run.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullProductRunSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Product run not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to delete product run'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const record = await fetchFullProductRunOrThrow(id)

      await db.delete(productRun).where(eq(productRun.id, id))

      return generateJsonResponse(c, record, 200, 'Product run deleted')
    },
  )

  .openapi(
    createRoute({
      description: 'Mark a product run as the main run for its product.',
      method: 'post',
      path: '/:id/set-as-main-run',
      middleware: [authMiddleware({ permission: 'write:productRun' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description:
            'Successfully marked a product run as the main run for its product.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullProductRunSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Product run not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to set product run as main'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')

      const run = await db.query.productRun.findFirst({
        where: (productRun, { eq }) => eq(productRun.id, id),
        columns: {
          id: true,
          productId: true,
        },
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

      const record = await fetchFullProductRunOrThrow(id)

      return generateJsonResponse(c, record, 200, 'Product run set as main')
    },
  )

  .openapi(
    createRoute({
      method: 'post',
      path: '/:id/refresh-summary',
      middleware: [authMiddleware({ permission: 'write:productRun' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description:
            'Recompute and persist summary statistics for a product run.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullProductRunSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Product run not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to refresh product run summary'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')

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

        // 2. Select all unique time points
        const timePoints = await tx
          .selectDistinctOn([productOutput.timePoint], {
            timePoint: productOutput.timePoint,
          })
          .from(productOutput)
          .where(eq(productOutput.productRunId, id))

        const timePointsArray = timePoints.map(
          (timePoint) => timePoint.timePoint,
        )

        // 2. Update or insert into productOutputSummary
        if (stats && stats.outputCount > 0) {
          await tx
            .insert(productOutputSummary)
            .values({
              productRunId: id,
              startTime: stats.startTime,
              endTime: stats.endTime,
              timePoints: timePointsArray,
              outputCount: stats.outputCount,
              lastUpdated: new Date(),
            })
            .onConflictDoUpdate({
              target: productOutputSummary.productRunId,
              set: {
                startTime: stats.startTime,
                endTime: stats.endTime,
                timePoints: timePointsArray,
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
                avgValue: stat.avgValue ? parseFloat(stat.avgValue) : null,
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

      const record = await fetchFullProductRunOrThrow(id)

      return generateJsonResponse(
        c,
        record,
        200,
        'Product run summary refreshed',
      )
    },
  )

export default app
