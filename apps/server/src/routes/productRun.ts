import { createRoute, z } from '@hono/zod-openapi'
import {
  assignedDerivedIndicatorWithDependenciesSchema,
  baseProductOutputSchema,
  createProductRunSchema,
  fullProductRunSchema,
  productOutputExportQuerySchema,
  productOutputExportSchema,
  productOutputQuerySchema,
  productRunAssignDerivedIndicatorSchema,
  updateProductRunSchema,
} from '@repo/schemas/crud'
import {
  and,
  avg,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  max,
  min,
  or,
  SQL,
} from 'drizzle-orm'
import { evaluate } from 'mathjs'
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
  productOutputDependency,
  productOutputSummary,
  productOutputSummaryIndicator,
  productRun,
  productRunAssignedDerivedIndicator,
  productRunAssignedDerivedIndicatorDependency,
} from '../schemas/db'
import {
  baseRunColumns,
  createPayload,
  idColumns,
  idColumnsWithMainRunId,
  InferQueryModel,
  QueryForTable,
  updatePayload,
} from '../schemas/util'
import { parseQuery } from '../utils/query'
import { baseDatasetRunQuery } from './datasetRun'
import { baseGeometriesRunQuery } from './geometriesRun'
import {
  baseDerivedIndicatorQuery,
  fullMeasuredIndicatorQuery,
  parseBaseDerivedIndicator,
  parseFullMeasuredIndicator,
} from './indicator'
import { baseProductOutputQuery } from './productOutput'

const baseProductRunOutputSummaryQuery = {
  columns: {
    lastUpdated: true,
    startTime: true,
    endTime: true,
    outputCount: true,
    timePoints: true,
  },
  with: {
    indicators: {
      with: {
        indicator: fullMeasuredIndicatorQuery,
        derivedIndicator: baseDerivedIndicatorQuery,
      },
    },
  },
} satisfies QueryForTable<'productOutputSummary'>

const fullProductRunOutputSummaryQuery = {
  columns: baseProductRunOutputSummaryQuery.columns,
  with: {
    indicators: {
      columns: {
        minValue: true,
        maxValue: true,
        avgValue: true,
        count: true,
        lastUpdated: true,
      },
      with: {
        indicator: fullMeasuredIndicatorQuery,
        derivedIndicator: baseDerivedIndicatorQuery,
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

// Separate query for assigned derived indicators (to avoid deeply nested query issues)
export const assignedDerivedIndicatorsQuery = {
  columns: {
    id: true,
  },
  with: {
    derivedIndicator: baseDerivedIndicatorQuery,
    dependencies: {
      with: {
        indicator: fullMeasuredIndicatorQuery,
        sourceProductRun: {
          columns: idColumns,
        },
      },
    },
  },
} satisfies QueryForTable<'productRunAssignedDerivedIndicator'>

export const parseFullProductRunOutputSummary = <
  T extends InferQueryModel<
    'productOutputSummary',
    typeof fullProductRunOutputSummaryQuery
  >,
>(
  record: T,
) => {
  return {
    ...record,
    indicators:
      record.indicators?.map((indicator) => ({
        ...indicator,
        indicator: indicator.indicator
          ? parseFullMeasuredIndicator(indicator.indicator)
          : indicator.derivedIndicator
            ? parseBaseDerivedIndicator(indicator.derivedIndicator)
            : null,
      })) ?? [],
  }
}

export const parseBaseProductRunOutputSummary = <
  T extends InferQueryModel<
    'productOutputSummary',
    typeof baseProductRunOutputSummaryQuery
  >,
>(
  record: T,
) => {
  return {
    ...record,
    indicators:
      record.indicators
        ?.map((indicator) =>
          indicator.indicator
            ? parseFullMeasuredIndicator(indicator.indicator)
            : indicator.derivedIndicator
              ? parseBaseDerivedIndicator(indicator.derivedIndicator)
              : undefined,
        )
        .filter(
          (indicator): indicator is NonNullable<typeof indicator> =>
            indicator !== undefined,
        ) ?? [],
  }
}

export const parseBaseProductRun = <
  T extends InferQueryModel<'productRun', typeof baseProductRunQuery>,
>(
  record: T,
) => {
  return {
    ...record,
    // Note that record.outputSummary is nullable, but the type is incorrect - see https://github.com/drizzle-team/drizzle-orm/issues/1066
    outputSummary: record.outputSummary
      ? parseBaseProductRunOutputSummary(record.outputSummary)
      : null,
  }
}

export const parseFullProductRun = <
  T extends InferQueryModel<'productRun', typeof fullProductRunQuery>,
>(
  record: T,
) => {
  return {
    ...record,
    // Note that record.outputSummary is nullable, but the type is incorrect - see https://github.com/drizzle-team/drizzle-orm/issues/1066
    outputSummary: record.outputSummary
      ? parseFullProductRunOutputSummary(record.outputSummary)
      : null,
  }
}

export const parseAssignedDerivedIndicator = <
  T extends InferQueryModel<
    'productRunAssignedDerivedIndicator',
    typeof assignedDerivedIndicatorsQuery
  >,
>(
  record: T,
) => ({
  id: record.id,
  derivedIndicator: parseBaseDerivedIndicator(record.derivedIndicator),
  dependencies: record.dependencies.map((dep) => ({
    indicator: parseFullMeasuredIndicator(dep.indicator),
    sourceProductRun: dep.sourceProductRun,
  })),
})

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

  return record ? parseFullProductRun(record) : null
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
      const { indicatorId, geometryOutputId, timePoint } = c.req.valid('query')

      const { pageCount, totalCount, ...query } = await parseQuery(
        productOutput,
        c.req.valid('query'),
        {
          defaultOrderBy: desc(productOutput.createdAt),
          searchableColumns: [productOutput.name],
        },
      )
      const filters: (SQL | undefined)[] = [eq(productOutput.productRunId, id)]

      if (indicatorId) {
        filters.push(
          or(
            eq(productOutput.indicatorId, indicatorId),
            eq(productOutput.derivedIndicatorId, indicatorId),
          ),
        )
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

      const parsedData = data.map((output) => ({
        ...output,
        indicator: output.indicator
          ? parseFullMeasuredIndicator(output.indicator)
          : output.derivedIndicator
            ? parseBaseDerivedIndicator(output.derivedIndicator)
            : null,
      }))

      return generateJsonResponse(
        c,
        {
          pageCount,
          data: parsedData,
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
      const { indicatorId, geometryOutputId, timePoint } = c.req.valid('query')

      const filters: (SQL | undefined)[] = [eq(productOutput.productRunId, id)]

      if (indicatorId) {
        const indicatorIds = Array.isArray(indicatorId)
          ? indicatorId
          : [indicatorId]

        // Filter for indicators or derived indicators
        filters.push(
          or(
            and(
              isNull(productOutput.derivedIndicatorId),
              inArray(productOutput.indicatorId, indicatorIds),
            ),
            and(
              isNull(productOutput.indicatorId),
              inArray(productOutput.derivedIndicatorId, indicatorIds),
            ),
          ),
        )
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
          indicatorId: true,
          derivedIndicatorId: true,
          timePoint: true,
          geometryOutputId: true,
          value: true,
        },
        with: {
          indicator: {
            columns: {
              name: true,
            },
          },
          derivedIndicator: {
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
          desc(productOutput.indicatorId),
          desc(productOutput.timePoint),
          desc(productOutput.geometryOutputId),
        ],
      })

      const dataWithIndicatorName = data.map((output) => ({
        ...output,
        indicatorId: output.indicatorId ?? output.derivedIndicatorId ?? null,
        indicatorName:
          output.indicator?.name ?? output.derivedIndicator?.name ?? null,
        indicatorType: output.derivedIndicator
          ? ('derived' as const)
          : ('measured' as const),
        geometryOutputName: output.geometryOutput?.name ?? undefined,
        geometryOutputId: output.geometryOutputId ?? undefined,
      }))

      return generateJsonResponse(
        c,
        {
          data: dataWithIndicatorName,
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
      description: 'Get assigned derived indicators for a product run.',
      method: 'get',
      path: '/:id/derived-indicators',
      middleware: [authMiddleware({ permission: 'read:productRun' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description:
            'Successfully retrieved assigned derived indicators for a product run.',
          content: {
            'application/json': {
              schema: createResponseSchema(
                z.array(assignedDerivedIndicatorWithDependenciesSchema),
              ),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Product run not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to fetch assigned derived indicators'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')

      // Verify product run exists
      await fetchFullProductRunOrThrow(id)

      const assignedIndicators =
        await db.query.productRunAssignedDerivedIndicator.findMany({
          where: (table, { eq }) => eq(table.productRunId, id),
          ...assignedDerivedIndicatorsQuery,
        })

      const parsed = assignedIndicators.map(parseAssignedDerivedIndicator)

      return generateJsonResponse(c, parsed, 200)
    },
  )

  .openapi(
    createRoute({
      description: 'Assign a derived indicator to a product run.',
      method: 'post',
      path: '/:id/derived-indicators',
      middleware: [authMiddleware({ permission: 'write:productRun' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
        body: {
          required: true,
          content: {
            'application/json': {
              schema: productRunAssignDerivedIndicatorSchema,
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Successfully assigned a derived indicator.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullProductRunSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Product run not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to assign derived indicator'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const { derivedIndicatorId, dependencies } = c.req.valid('json')

      await fetchFullProductRunOrThrow(id)

      // Generate a unique ID for the assigned derived indicator
      const assignedId = crypto.randomUUID()

      await db.transaction(async (tx) => {
        // Insert the assigned derived indicator
        await tx
          .insert(productRunAssignedDerivedIndicator)
          .values({
            id: assignedId,
            productRunId: id,
            derivedIndicatorId,
          })
          .onConflictDoNothing()

        // Insert the dependency mappings
        if (dependencies.length > 0) {
          await tx
            .insert(productRunAssignedDerivedIndicatorDependency)
            .values(
              dependencies.map((dep) => ({
                assignedDerivedIndicatorId: assignedId,
                indicatorId: dep.indicatorId,
                sourceProductRunId: dep.sourceProductRunId,
              })),
            )
            .onConflictDoNothing()
        }
      })

      const record = await fetchFullProductRunOrThrow(id)

      return generateJsonResponse(c, record, 201, 'Derived indicator assigned')
    },
  )

  .openapi(
    createRoute({
      description: 'Delete an assigned derived indicator from a product run.',
      method: 'delete',
      path: '/:id/derived-indicators/:assignedDerivedIndicatorId',
      middleware: [authMiddleware({ permission: 'write:productRun' })],
      request: {
        params: z.object({
          id: z.string().min(1),
          assignedDerivedIndicatorId: z.string().min(1),
        }),
      },
      responses: {
        200: {
          description: 'Successfully deleted assigned derived indicator.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullProductRunSchema),
            },
          },
        },
        400: jsonErrorResponse(
          'Cannot delete derived indicator that exists in output summary',
        ),
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse(
          'Product run or assigned derived indicator not found',
        ),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to delete assigned derived indicator'),
      },
    }),
    async (c) => {
      const { id, assignedDerivedIndicatorId } = c.req.valid('param')

      // Verify product run exists
      const run = await fetchFullProductRunOrThrow(id)

      // Find the assigned derived indicator
      const assignedIndicator =
        await db.query.productRunAssignedDerivedIndicator.findFirst({
          where: (table, { and, eq }) =>
            and(
              eq(table.id, assignedDerivedIndicatorId),
              eq(table.productRunId, id),
            ),
          with: {
            derivedIndicator: {
              columns: {
                id: true,
                name: true,
              },
            },
          },
        })

      if (!assignedIndicator) {
        throw new ServerError({
          statusCode: 404,
          message: 'Assigned derived indicator not found',
          description: `Assigned derived indicator with ID ${assignedDerivedIndicatorId} does not exist for this product run`,
        })
      }

      // Check if the derived indicator exists in the output summary
      const derivedIndicatorId = assignedIndicator.derivedIndicator.id
      const isInOutputSummary = run.outputSummary?.indicators?.some(
        (indicator) => indicator.indicator?.id === derivedIndicatorId,
      )

      if (isInOutputSummary) {
        throw new ServerError({
          statusCode: 400,
          message: 'Cannot delete derived indicator',
          description: `The derived indicator "${assignedIndicator.derivedIndicator.name}" exists in the run output summary and cannot be removed.`,
        })
      }

      // Delete the assigned derived indicator (dependencies will cascade)
      await db
        .delete(productRunAssignedDerivedIndicator)
        .where(
          eq(productRunAssignedDerivedIndicator.id, assignedDerivedIndicatorId),
        )

      // Delete product outputs for the derived indicator
      await db
        .delete(productOutput)
        .where(
          and(
            eq(productOutput.productRunId, id),
            eq(productOutput.derivedIndicatorId, derivedIndicatorId),
          ),
        )

      const record = await fetchFullProductRunOrThrow(id)

      return generateJsonResponse(
        c,
        record,
        200,
        'Assigned derived indicator deleted',
      )
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

          // 3.1. Calculate per-indicator statistics
          const indicatorStats = await tx
            .select({
              indicatorId: productOutput.indicatorId,
              minValue: min(productOutput.value),
              maxValue: max(productOutput.value),
              avgValue: avg(productOutput.value),
              count: count(),
            })
            .from(productOutput)
            .where(
              and(
                eq(productOutput.productRunId, id),
                isNotNull(productOutput.indicatorId),
              ),
            )
            .groupBy(productOutput.indicatorId)

          // 3.2. Calculate per-derived-indicator statistics
          const derivedIndicatorStats = await tx
            .select({
              derivedIndicatorId: productOutput.derivedIndicatorId,
              minValue: min(productOutput.value),
              maxValue: max(productOutput.value),
              avgValue: avg(productOutput.value),
              count: count(),
            })
            .from(productOutput)
            .where(
              and(
                eq(productOutput.productRunId, id),
                isNotNull(productOutput.derivedIndicatorId),
              ),
            )
            .groupBy(productOutput.derivedIndicatorId)

          // 4. Delete existing summaries for this run
          await tx
            .delete(productOutputSummaryIndicator)
            .where(eq(productOutputSummaryIndicator.productRunId, id))

          // 5. Insert new indicator summaries
          if (indicatorStats.length > 0) {
            await tx.insert(productOutputSummaryIndicator).values(
              [...indicatorStats, ...derivedIndicatorStats].map((stat) => ({
                productRunId: id,
                indicatorId: 'indicatorId' in stat ? stat.indicatorId : null,
                derivedIndicatorId:
                  'derivedIndicatorId' in stat ? stat.derivedIndicatorId : null,
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

  .openapi(
    createRoute({
      method: 'post',
      path: '/:id/compute-derived-indicators',
      middleware: [authMiddleware({ permission: 'write:productRun' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Compute derived indicators for a product run.',
          content: {
            'application/json': {
              schema: createResponseSchema(
                z.object({
                  productRun: fullProductRunSchema,
                  insertedCount: z.number().int(),
                  warnings: z.array(
                    z.object({
                      message: z.string(),
                      description: z.string().optional(),
                    }),
                  ),
                }),
              ),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Product run not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to compute derived indicators'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')

      // Verify product run exists
      await fetchFullProductRunOrThrow(id)

      const warnings: { message: string; description?: string }[] = []
      const pendingOutputs: {
        productRunId: string
        geometryOutputId: string | null
        derivedIndicatorId: string
        value: number
        timePoint: Date
        name?: string
        dependencyOutputIds: string[]
      }[] = []

      // Fetch assigned derived indicators separately
      const assignedDerivedIndicatorsRaw =
        await db.query.productRunAssignedDerivedIndicator.findMany({
          where: (table, { eq }) => eq(table.productRunId, id),
          ...assignedDerivedIndicatorsQuery,
        })
      const assignedDerivedIndicators = assignedDerivedIndicatorsRaw.map(
        parseAssignedDerivedIndicator,
      )

      for (const assignedDerivedIndicator of assignedDerivedIndicators) {
        const derivedIndicatorId = assignedDerivedIndicator.derivedIndicator.id
        const derivedIndicator = await db.query.derivedIndicator.findFirst({
          where: (derivedIndicator, { eq }) =>
            eq(derivedIndicator.id, derivedIndicatorId),
          columns: {
            id: true,
            name: true,
            expression: true,
          },
          with: {
            indicators: {
              columns: {
                indicatorId: true,
              },
              with: {
                indicator: {
                  columns: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        })

        if (!derivedIndicator) {
          throw new ServerError({
            statusCode: 404,
            message: 'Derived indicator not found',
            description: `Derived indicator with ID ${derivedIndicatorId} does not exist`,
          })
        }

        const indicatorIds = derivedIndicator.indicators.map(
          (indicator) => indicator.indicatorId,
        )
        const indicatorNames = new Map(
          derivedIndicator.indicators.map((indicator) => [
            indicator.indicatorId,
            indicator.indicator.name,
          ]),
        )
        const indicatorSymbols = new Map(
          indicatorIds.map((indicatorId, index) => [
            indicatorId,
            `$${index + 1}`,
          ]),
        )

        const hasDerivedIndicatorBeenComputed = await db
          .select({ count: count() })
          .from(productOutput)
          .where(
            and(
              eq(productOutput.productRunId, id),
              eq(productOutput.derivedIndicatorId, derivedIndicatorId),
            ),
          )
          .then((result) => (result[0]?.count ?? 0) > 0)

        if (hasDerivedIndicatorBeenComputed) {
          warnings.push({
            message: `${derivedIndicator.name}: Has already been computed - skipping.`,
          })
          continue
        }

        if (!indicatorIds.length) {
          warnings.push({
            message: `${derivedIndicator.name}: Has no dependency indicators.`,
          })
          continue
        }

        // Build a map of indicatorId -> sourceProductRunId from dependencies
        const indicatorToSourceProductRunId = new Map<string, string>()
        for (const dep of assignedDerivedIndicator.dependencies) {
          indicatorToSourceProductRunId.set(
            dep.indicator.id,
            dep.sourceProductRun.id,
          )
        }

        // Fetch all dependent indicator product outputs from their respective source product runs
        // Group queries by source product run for efficiency
        const productRunIndicatorGroups = new Map<string, string[]>()
        for (const indicatorId of indicatorIds) {
          const sourceProductRunId =
            indicatorToSourceProductRunId.get(indicatorId) ?? id
          const group = productRunIndicatorGroups.get(sourceProductRunId) ?? []
          group.push(indicatorId)
          productRunIndicatorGroups.set(sourceProductRunId, group)
        }

        // Fetch outputs from each source product run
        const dependentIndicatorProductOutputs: {
          id: string
          indicatorId: string | null
          geometryOutputId: string | null
          timePoint: Date
          value: number
        }[] = []

        for (const [
          sourceProductRunId,
          sourceIndicatorIds,
        ] of productRunIndicatorGroups) {
          const outputs = await db
            .select({
              id: productOutput.id,
              indicatorId: productOutput.indicatorId,
              geometryOutputId: productOutput.geometryOutputId,
              timePoint: productOutput.timePoint,
              value: productOutput.value,
            })
            .from(productOutput)
            .where(
              and(
                eq(productOutput.productRunId, sourceProductRunId),
                inArray(productOutput.indicatorId, sourceIndicatorIds),
              ),
            )
          dependentIndicatorProductOutputs.push(...outputs)

          if (outputs.length === 0) {
            warnings.push({
              message: `${derivedIndicator.name}: No dependent indicator product outputs found for source product run "${sourceProductRunId}".`,
            })
          }
        }

        const groupedOutputs = new Map<
          string,
          {
            geometryOutputId: string | null
            timePoint: Date
            values: Map<string, number>
            dependencyOutputIds: string[]
          }
        >()

        if (dependentIndicatorProductOutputs.length === 0) {
          warnings.push({
            message: `${derivedIndicator.name}: No dependent indicator product outputs found.`,
          })
          continue
        }

        for (const output of dependentIndicatorProductOutputs) {
          if (!output.indicatorId) continue
          const key = `${output.geometryOutputId ?? 'null'}|${output.timePoint.toISOString()}`
          const group = groupedOutputs.get(key) ?? {
            geometryOutputId: output.geometryOutputId ?? null,
            timePoint: output.timePoint,
            values: new Map<string, number>(),
            dependencyOutputIds: [],
          }
          if (group.values.has(output.indicatorId)) {
            warnings.push({
              message: `${derivedIndicator.name}: Duplicate indicator output found for "${indicatorNames.get(output.indicatorId) ?? output.indicatorId}" at geometry output "${output.geometryOutputId ?? 'null'}" and time point "${output.timePoint.toISOString()}".`,
            })
            continue
          }
          group.values.set(output.indicatorId, output.value)
          group.dependencyOutputIds.push(output.id)
          groupedOutputs.set(key, group)
        }

        for (const group of groupedOutputs.values()) {
          const missingIndicatorIds = indicatorIds.filter(
            (indicatorId) => !group.values.has(indicatorId),
          )

          if (missingIndicatorIds.length) {
            warnings.push({
              message: `${derivedIndicator.name}: Missing dependency indicators at geometry output "${group.geometryOutputId ?? 'null'}" and time point "${group.timePoint.toISOString()}".`,
              description: `Missing indicators: ${missingIndicatorIds
                .map(
                  (indicatorId) =>
                    indicatorNames.get(indicatorId) ?? indicatorId,
                )
                .join(', ')}`,
            })
            continue
          }

          const scope = indicatorIds.reduce<Record<string, number>>(
            (acc, indicatorId) => {
              const symbol = indicatorSymbols.get(indicatorId)
              const value = group.values.get(indicatorId)
              if (symbol && value !== undefined) {
                acc[symbol] = value
              }
              return acc
            },
            {},
          )

          let computedValue: number
          try {
            const result = evaluate(derivedIndicator.expression, scope)
            computedValue = typeof result === 'number' ? result : Number(result)
          } catch (error) {
            warnings.push({
              message: `${derivedIndicator.name}: Failed to compute at geometry output "${group.geometryOutputId ?? 'null'}" and time point "${group.timePoint.toISOString()}".`,
              description:
                error instanceof Error ? error.message : 'Unknown error',
            })
            continue
          }

          if (!Number.isFinite(computedValue)) {
            warnings.push({
              message: `${derivedIndicator.name}: Produced a non-numeric result at geometry output "${group.geometryOutputId ?? 'null'}" and time point "${group.timePoint.toISOString()}".`,
            })
            continue
          }

          pendingOutputs.push({
            productRunId: id,
            geometryOutputId: group.geometryOutputId,
            derivedIndicatorId,
            value: computedValue,
            timePoint: group.timePoint,
            dependencyOutputIds: group.dependencyOutputIds,
          })
        }
      }

      let insertedCount = 0
      for (const output of pendingOutputs) {
        const { dependencyOutputIds, ...outputData } = output
        const [inserted] = await db
          .insert(productOutput)
          .values(createPayload(outputData))
          .onConflictDoNothing()
          .returning({ id: productOutput.id })
        if (inserted?.id) {
          insertedCount++
          // Insert dependency links
          if (dependencyOutputIds.length > 0) {
            await db
              .insert(productOutputDependency)
              .values(
                dependencyOutputIds.map((dependencyProductOutputId) => ({
                  derivedProductOutputId: inserted.id,
                  dependencyProductOutputId,
                })),
              )
              .onConflictDoNothing()
          }
        }
      }

      const record = await fetchFullProductRunOrThrow(id)

      return generateJsonResponse(
        c,
        {
          productRun: record,
          insertedCount,
          warnings,
        },
        200,
        'Derived indicators computed',
      )
    },
  )

export default app
