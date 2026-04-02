import { createRoute, z } from '@hono/zod-openapi'
import {
  anyBaseIndicatorSchema,
  anyFullIndicatorSchema,
  baseMeasuredIndicatorSchema,
  createDerivedIndicatorSchema,
  createIndicatorSchema,
  fullDerivedIndicatorSchema,
  fullMeasuredIndicatorSchema,
  indicatorQuerySchema,
  updateDerivedIndicatorSchema,
  updateIndicatorSchema,
} from '@repo/schemas/crud'
import {
  and,
  count,
  desc,
  eq,
  exists,
  inArray,
  notInArray,
  or,
} from 'drizzle-orm'
import {
  ensureDerivedIndicatorNotUsedByCharts,
  ensureMeasuredIndicatorNotUsedByCharts,
  fetchChartUsageCounts,
} from '~/lib/chartUsage'
import {
  assertCanSetVisibility,
  assertResourceReadable,
  assertResourceWritable,
  buildConsoleReadScope,
  requireOwnedInsertContext,
} from '~/lib/authorization'
import { db } from '~/lib/db'
import { ServerError } from '~/lib/error'
import { assertDerivedIndicatorDependenciesPublic } from '~/lib/public-visibility'
import {
  createOpenAPIApp,
  createResponseSchema,
  jsonErrorResponse,
  validationErrorResponse,
} from '~/lib/openapi'
import { authMiddleware } from '~/middlewares/auth'
import { generateJsonResponse } from '../lib/response'
import {
  derivedIndicator,
  derivedIndicatorToIndicator,
  indicator,
  product,
  productOutputSummaryIndicator,
} from '../schemas/db'
import {
  baseColumns,
  baseAclColumns,
  createOwnedPayload,
  InferQueryModel,
  QueryForTable,
  updatePayload,
} from '../schemas/util'
import { normalizeFilterValues, parseQuery } from '../utils/query'

export const fullMeasuredIndicatorQuery = {
  columns: {
    ...baseAclColumns,
    unit: true,
    displayOrder: true,
    categoryId: true,
  },
  with: {
    category: {
      columns: baseColumns,
    },
  },
} satisfies QueryForTable<'indicator'>

export const baseDerivedIndicatorQuery = {
  columns: {
    ...fullMeasuredIndicatorQuery.columns,
    expression: true,
  },
  with: {
    ...fullMeasuredIndicatorQuery.with,
  },
} satisfies QueryForTable<'derivedIndicator'>

export const fullDerivedIndicatorQuery = {
  ...baseDerivedIndicatorQuery,
  with: {
    ...baseDerivedIndicatorQuery.with,
    indicators: {
      with: {
        indicator: fullMeasuredIndicatorQuery,
      },
    },
  },
} satisfies QueryForTable<'derivedIndicator'>

const indicatorNotFoundError = () =>
  new ServerError({
    statusCode: 404,
    message: 'Failed to get indicator',
    description: "indicator you're looking for is not found",
  })

const derivedIndicatorNotFoundError = () =>
  new ServerError({
    statusCode: 404,
    message: 'Failed to get derived indicator',
    description: "derived indicator you're looking for is not found",
  })

export const parseFullMeasuredIndicator = <
  T extends InferQueryModel<'indicator', typeof fullMeasuredIndicatorQuery>,
>(
  record: T,
) => {
  return {
    ...record,
    type: 'measured' as const,
  }
}
const fetchFullMeasuredIndicator = async (
  id: string,
  organizationId: string,
) => {
  const [indicatorRecord, productCount, usageCounts] = await Promise.all([
    db.query.indicator.findFirst({
      where: (indicator, { and, eq }) =>
        and(eq(indicator.id, id), eq(indicator.organizationId, organizationId)),
      ...fullMeasuredIndicatorQuery,
    }),
    fetchProductUsageCount(id),
    fetchChartUsageCounts({ type: 'indicator', id }),
  ])

  return indicatorRecord
    ? {
        ...parseFullMeasuredIndicator(indicatorRecord),
        productCount,
        ...usageCounts,
      }
    : null
}

export const parseBaseDerivedIndicator = <
  T extends InferQueryModel<
    'derivedIndicator',
    typeof baseDerivedIndicatorQuery
  >,
>(
  record: T,
) => {
  return { ...record, type: 'derived' as const }
}

export const parseFullDerivedIndicator = <
  T extends InferQueryModel<
    'derivedIndicator',
    typeof fullDerivedIndicatorQuery
  >,
>(
  record: T,
) => {
  return {
    ...record,
    type: 'derived' as const,
    indicators: record.indicators.map((i) =>
      parseFullMeasuredIndicator(i.indicator),
    ),
  }
}

const fetchFullDerivedIndicator = async (
  id: string,
  organizationId: string,
) => {
  const [derivedIndicatorRecord, productCount, usageCounts] = await Promise.all(
    [
      db.query.derivedIndicator.findFirst({
        where: (derivedIndicator, { and, eq }) =>
          and(
            eq(derivedIndicator.id, id),
            eq(derivedIndicator.organizationId, organizationId),
          ),
        ...fullDerivedIndicatorQuery,
      }),
      fetchProductUsageCount(id),
      fetchChartUsageCounts({ type: 'derived-indicator', id }),
    ],
  )

  return derivedIndicatorRecord
    ? {
        ...parseFullDerivedIndicator(derivedIndicatorRecord),
        productCount,
        ...usageCounts,
      }
    : null
}
export const fetchFullDerivedIndicatorOrThrow = async (
  id: string,
  organizationId: string,
) => {
  const record = await fetchFullDerivedIndicator(id, organizationId)

  if (!record) {
    throw derivedIndicatorNotFoundError()
  }

  return record
}

export const fetchFullMeasuredIndicatorOrThrow = async (
  id: string,
  organizationId: string,
) => {
  const record = await fetchFullMeasuredIndicator(id, organizationId)

  if (!record) {
    throw indicatorNotFoundError()
  }

  return record
}

const fetchProductUsageCount = async (indicatorId: string) => {
  // Count products whose main run has an output summary with the given indicator or derived indicator
  const result = await db
    .select({ count: count() })
    .from(product)
    .where(
      exists(
        db
          .select()
          .from(productOutputSummaryIndicator)
          .where(
            and(
              eq(productOutputSummaryIndicator.productRunId, product.mainRunId),
              or(
                eq(productOutputSummaryIndicator.indicatorId, indicatorId),
                eq(
                  productOutputSummaryIndicator.derivedIndicatorId,
                  indicatorId,
                ),
              ),
            ),
          ),
      ),
    )

  return result[0]?.count ?? 0
}

const app = createOpenAPIApp()
  .openapi(
    createRoute({
      description: 'List indicators with pagination metadata.',
      method: 'get',
      path: '/',
      middleware: [authMiddleware({ permission: 'read:indicator' })],
      request: {
        query: indicatorQuerySchema,
      },
      responses: {
        200: {
          description:
            'List indicators with pagination metadata. This includes derived indicators.',
          content: {
            'application/json': {
              schema: createResponseSchema(
                z.object({
                  pageCount: z.number().int(),
                  totalCount: z.number().int(),
                  data: z.array(anyBaseIndicatorSchema),
                }),
              ),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to list indicators'),
      },
    }),
    async (c) => {
      const queryParams = c.req.valid('query')
      const { indicatorIds, excludeIndicatorIds, categoryId } = queryParams
      const indicatorIdsArray = normalizeFilterValues(indicatorIds)
      const excludeIndicatorIdsArray =
        normalizeFilterValues(excludeIndicatorIds)
      const categoryIdsArray = normalizeFilterValues(categoryId)
      const measuredBaseWhere = and(
        buildConsoleReadScope(
          c,
          indicator.organizationId,
          indicator.visibility,
        ),
        indicatorIdsArray.length > 0
          ? inArray(indicator.id, indicatorIdsArray)
          : undefined,
        excludeIndicatorIdsArray.length > 0
          ? notInArray(indicator.id, excludeIndicatorIdsArray)
          : undefined,
        categoryIdsArray.length > 0
          ? inArray(indicator.categoryId, categoryIdsArray)
          : undefined,
      )
      const derivedBaseWhere = and(
        buildConsoleReadScope(
          c,
          derivedIndicator.organizationId,
          derivedIndicator.visibility,
        ),
        indicatorIdsArray.length > 0
          ? inArray(derivedIndicator.id, indicatorIdsArray)
          : undefined,
        excludeIndicatorIdsArray.length > 0
          ? notInArray(derivedIndicator.id, excludeIndicatorIdsArray)
          : undefined,
        categoryIdsArray.length > 0
          ? inArray(derivedIndicator.categoryId, categoryIdsArray)
          : undefined,
      )

      // Parse query for both tables
      const [indicatorResult, derivedResult] = await Promise.all([
        parseQuery(indicator, queryParams, {
          defaultOrderBy: desc(indicator.createdAt),
          searchableColumns: [
            indicator.id,
            indicator.name,
            indicator.description,
          ],
          baseWhere: measuredBaseWhere,
        }),
        parseQuery(derivedIndicator, queryParams, {
          defaultOrderBy: desc(derivedIndicator.createdAt),
          searchableColumns: [
            derivedIndicator.id,
            derivedIndicator.name,
            derivedIndicator.description,
          ],
          baseWhere: derivedBaseWhere,
        }),
      ])

      const fetchIndicators =
        queryParams.type === 'measure' ||
        queryParams.type === 'all' ||
        queryParams.type === undefined
      const fetchDerivedIndicators =
        queryParams.type === 'derived' ||
        queryParams.type === 'all' ||
        queryParams.type === undefined

      const totalCount =
        (fetchIndicators ? indicatorResult.meta.totalCount : 0) +
        (fetchDerivedIndicators ? derivedResult.meta.totalCount : 0)
      const pageSize = indicatorResult.query.limit ?? 10
      const pageCount = pageSize > 0 ? Math.ceil(totalCount / pageSize) : 0

      // Fetch from both tables with their full relations
      const [measuredIndicators, derivedIndicators] = await Promise.all([
        fetchIndicators
          ? db.query.indicator.findMany({
              ...fullMeasuredIndicatorQuery,
              where: indicatorResult.query.where,
            })
          : [],
        fetchDerivedIndicators
          ? db.query.derivedIndicator.findMany({
              ...baseDerivedIndicatorQuery,
              where: derivedResult.query.where,
            })
          : [],
      ])

      const transformedMeasured = measuredIndicators.map((i) =>
        parseFullMeasuredIndicator(i),
      )

      // Transform derived indicators to include the indicators array properly
      const transformedDerived = derivedIndicators.map((d) =>
        parseBaseDerivedIndicator(d),
      )

      // Merge and sort both arrays
      const combined = [...transformedMeasured, ...transformedDerived]

      // Sort using the same column and direction from parseQuery
      const sortOrder = queryParams.order ?? 'desc'
      const sortColumn = queryParams.sort ?? 'createdAt'
      combined.sort((a, b) => {
        const aVal = a[sortColumn]
        const bVal = b[sortColumn]

        if (aVal == null && bVal == null) return 0
        if (aVal == null) return sortOrder === 'asc' ? -1 : 1
        if (bVal == null) return sortOrder === 'asc' ? 1 : -1

        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
        return 0
      })

      // Apply pagination from parseQuery
      const data = combined.slice(
        indicatorResult.query.offset ?? 0,
        (indicatorResult.query.offset ?? 0) +
          (indicatorResult.query.limit ?? 10),
      )

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
      description: 'Retrieve an indicator (measured or derived).',
      method: 'get',
      path: '/:id',
      middleware: [
        authMiddleware({
          permission: 'read:indicator',
          skipResourceCheck: true,
        }),
      ],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully retrieved an indicator.',
          content: {
            'application/json': {
              schema: createResponseSchema(anyFullIndicatorSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Indicator not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to fetch indicator'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const { activeOrganizationId } = requireOwnedInsertContext(c)
      const record =
        (await fetchFullMeasuredIndicator(id, activeOrganizationId)) ??
        (await fetchFullDerivedIndicator(id, activeOrganizationId))
      if (!record) {
        throw indicatorNotFoundError()
      }

      return generateJsonResponse(c, record, 200, 'Indicator retrieved')
    },
  )

  .openapi(
    createRoute({
      description: 'Retrieve a measured indicator.',
      method: 'get',
      path: '/measured/:id',
      middleware: [authMiddleware({ permission: 'read:indicator' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully retrieved a measured indicator.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullMeasuredIndicatorSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Measured indicator not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to fetch measured indicator'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const accessRecord = await assertResourceReadable({
        c,
        resource: 'indicator',
        resourceId: id,
        notFoundError: indicatorNotFoundError,
      })
      const record = await fetchFullMeasuredIndicatorOrThrow(
        id,
        accessRecord.organizationId,
      )

      return generateJsonResponse(c, record, 200)
    },
  )

  .openapi(
    createRoute({
      description: 'Retrieve a derived indicator.',
      method: 'get',
      path: '/derived/:id',
      middleware: [
        authMiddleware({
          permission: 'read:indicator',
          skipResourceCheck: true,
          targetResource: 'derivedIndicator',
        }),
      ],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully retrieved a derived indicator.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullDerivedIndicatorSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Derived indicator not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to fetch derived indicator'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const accessRecord = await assertResourceReadable({
        c,
        resource: 'derivedIndicator',
        resourceId: id,
        notFoundError: derivedIndicatorNotFoundError,
      })
      const record = await fetchFullDerivedIndicatorOrThrow(
        id,
        accessRecord.organizationId,
      )

      return generateJsonResponse(c, record, 200)
    },
  )

  .openapi(
    createRoute({
      description: 'Create a measured indicator.',
      method: 'post',
      path: '/measured',
      middleware: [authMiddleware({ permission: 'write:indicator' })],
      request: {
        body: {
          required: true,
          content: {
            'application/json': {
              schema: createIndicatorSchema,
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Successfully created a measured indicator.',
          content: {
            'application/json': {
              schema: createResponseSchema(baseMeasuredIndicatorSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to create measured indicator'),
      },
    }),
    async (c) => {
      const payload = c.req.valid('json')
      const { actor, activeOrganizationId } = requireOwnedInsertContext(c)
      if (payload.categoryId) {
        await assertResourceWritable({
          c,
          resource: 'indicatorCategory',
          resourceId: payload.categoryId,
          notFoundError: indicatorNotFoundError,
        })
      }
      const data = {
        ...payload,
        categoryId: payload.categoryId ?? null,
      }
      const [newIndicator] = await db
        .insert(indicator)
        .values(
          createOwnedPayload({
            ...data,
            organizationId: activeOrganizationId,
            createdByUserId: actor.user.id,
          }),
        )
        .returning()

      if (!newIndicator) {
        throw new ServerError({
          statusCode: 500,
          message: 'Failed to create measured indicator',
          description: 'Measured indicator insert did not return a record',
        })
      }

      const record = await fetchFullMeasuredIndicatorOrThrow(
        newIndicator.id,
        activeOrganizationId,
      )

      return generateJsonResponse(c, record, 201, 'Measured indicator created')
    },
  )

  .openapi(
    createRoute({
      description: 'Create a derived indicator.',
      method: 'post',
      path: '/derived',
      middleware: [authMiddleware({ permission: 'write:indicator' })],
      request: {
        body: {
          required: true,
          content: {
            'application/json': {
              schema: createDerivedIndicatorSchema,
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Successfully created a derived indicator.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullDerivedIndicatorSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to create derived indicator'),
      },
    }),
    async (c) => {
      const { indicatorIds, ...payload } = c.req.valid('json')
      const { actor, activeOrganizationId } = requireOwnedInsertContext(c)
      if (payload.categoryId) {
        await assertResourceWritable({
          c,
          resource: 'indicatorCategory',
          resourceId: payload.categoryId,
          notFoundError: derivedIndicatorNotFoundError,
        })
      }
      for (const indicatorId of indicatorIds) {
        await assertResourceWritable({
          c,
          resource: 'indicator',
          resourceId: indicatorId,
          notFoundError: derivedIndicatorNotFoundError,
        })
      }
      const data = {
        ...payload,
        categoryId: payload.categoryId ?? null,
      }
      const [newIndicator] = await db
        .insert(derivedIndicator)
        .values(
          createOwnedPayload({
            ...data,
            organizationId: activeOrganizationId,
            createdByUserId: actor.user.id,
          }),
        )
        .returning()

      if (!newIndicator) {
        throw new ServerError({
          statusCode: 500,
          message: 'Failed to create derived indicator',
          description: 'Indicator insert did not return a record',
        })
      }

      if (indicatorIds?.length) {
        // Throw error if any of the indicatorIds are derived indicators
        const derivedIndicators = await db.query.derivedIndicator.findMany({
          where: inArray(derivedIndicator.id, indicatorIds),
        })
        if (derivedIndicators.length > 0) {
          throw new ServerError({
            statusCode: 422,
            message: 'Cannot create derived indicator with derived indicators',
            description:
              'Cannot create derived indicator with derived indicators',
          })
        }

        await db.insert(derivedIndicatorToIndicator).values(
          indicatorIds.map((indicatorId) => ({
            derivedIndicatorId: newIndicator.id,
            indicatorId,
          })),
        )
      }

      const record = await fetchFullDerivedIndicatorOrThrow(
        newIndicator.id,
        activeOrganizationId,
      )

      return generateJsonResponse(c, record, 201, 'Derived indicator created')
    },
  )

  .openapi(
    createRoute({
      description: 'Update a measured indicator.',
      method: 'patch',
      path: '/measured/:id',
      middleware: [authMiddleware({ permission: 'write:indicator' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
        body: {
          required: true,
          content: {
            'application/json': {
              schema: updateIndicatorSchema,
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Successfully updated a measured indicator.',
          content: {
            'application/json': {
              schema: createResponseSchema(baseMeasuredIndicatorSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Measured indicator not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to update measured indicator'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const payload = c.req.valid('json')
      const { actor } = requireOwnedInsertContext(c)
      const accessRecord = await assertResourceWritable({
        c,
        resource: 'indicator',
        resourceId: id,
        notFoundError: indicatorNotFoundError,
      })
      const data = {
        ...payload,
        ...(payload.categoryId !== undefined && {
          categoryId: payload.categoryId ?? null,
        }),
      }

      if (payload.categoryId) {
        await assertResourceWritable({
          c,
          resource: 'indicatorCategory',
          resourceId: payload.categoryId,
          notFoundError: indicatorNotFoundError,
        })
      }

      assertCanSetVisibility({
        actor,
        nextVisibility: payload.visibility,
        ownerUserId: accessRecord.createdByUserId,
        resource: 'indicator',
      })

      const [record] = await db
        .update(indicator)
        .set(updatePayload(data))
        .where(
          and(
            eq(indicator.id, id),
            eq(indicator.organizationId, accessRecord.organizationId),
          ),
        )
        .returning()

      if (!record) {
        throw indicatorNotFoundError()
      }

      const fullRecord = await fetchFullMeasuredIndicatorOrThrow(
        record.id,
        accessRecord.organizationId,
      )

      return generateJsonResponse(
        c,
        fullRecord,
        200,
        'Measured indicator updated',
      )
    },
  )

  .openapi(
    createRoute({
      description: 'Update a derived indicator.',
      method: 'patch',
      path: '/derived/:id',
      middleware: [
        authMiddleware({
          permission: 'write:indicator',
          targetResource: 'derivedIndicator',
        }),
      ],
      request: {
        params: z.object({ id: z.string().min(1) }),
        body: {
          required: true,
          content: {
            'application/json': {
              schema: updateDerivedIndicatorSchema,
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Successfully updated a derived indicator.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullDerivedIndicatorSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Derived indicator not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to update derived indicator'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const payload = c.req.valid('json')
      const { actor } = requireOwnedInsertContext(c)
      const accessRecord = await assertResourceWritable({
        c,
        resource: 'derivedIndicator',
        resourceId: id,
        notFoundError: derivedIndicatorNotFoundError,
      })
      const data = {
        ...payload,
        ...(payload.categoryId !== undefined && {
          categoryId: payload.categoryId ?? null,
        }),
      }

      if (payload.categoryId) {
        await assertResourceWritable({
          c,
          resource: 'indicatorCategory',
          resourceId: payload.categoryId,
          notFoundError: derivedIndicatorNotFoundError,
        })
      }

      assertCanSetVisibility({
        actor,
        nextVisibility: payload.visibility,
        ownerUserId: accessRecord.createdByUserId,
        resource: 'derivedIndicator',
      })

      const [record] = await db.transaction(async (tx) => {
        const [updatedRecord] = await tx
          .update(derivedIndicator)
          .set(updatePayload(data))
          .where(
            and(
              eq(derivedIndicator.id, id),
              eq(derivedIndicator.organizationId, accessRecord.organizationId),
            ),
          )
          .returning()

        if (!updatedRecord) {
          throw derivedIndicatorNotFoundError()
        }

        if (updatedRecord.visibility === 'public') {
          await assertDerivedIndicatorDependenciesPublic(tx, updatedRecord.id)
        }

        return [updatedRecord]
      })

      if (!record) {
        throw derivedIndicatorNotFoundError()
      }

      const fullRecord = await fetchFullDerivedIndicatorOrThrow(
        record.id,
        accessRecord.organizationId,
      )

      return generateJsonResponse(
        c,
        fullRecord,
        200,
        'Derived indicator updated',
      )
    },
  )

  .openapi(
    createRoute({
      description: 'Delete a measured indicator.',
      method: 'delete',
      path: '/measured/:id',
      middleware: [authMiddleware({ permission: 'write:indicator' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully deleted a measured indicator.',
          content: {
            'application/json': {
              schema: createResponseSchema(baseMeasuredIndicatorSchema),
            },
          },
        },
        400: jsonErrorResponse('Cannot delete measured indicator'),
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Measured indicator not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to delete measured indicator'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const accessRecord = await assertResourceWritable({
        c,
        resource: 'indicator',
        resourceId: id,
        notFoundError: indicatorNotFoundError,
      })
      const record = await fetchFullMeasuredIndicatorOrThrow(
        id,
        accessRecord.organizationId,
      )

      await ensureMeasuredIndicatorNotUsedByCharts(id)

      await db
        .delete(indicator)
        .where(
          and(
            eq(indicator.id, id),
            eq(indicator.organizationId, accessRecord.organizationId),
          ),
        )

      return generateJsonResponse(c, record, 200, 'Measured indicator deleted')
    },
  )

  .openapi(
    createRoute({
      description: 'Delete a derived indicator.',
      method: 'delete',
      path: '/derived/:id',
      middleware: [
        authMiddleware({
          permission: 'write:indicator',
          targetResource: 'derivedIndicator',
        }),
      ],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully deleted a derived indicator.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullDerivedIndicatorSchema),
            },
          },
        },
        400: jsonErrorResponse('Cannot delete derived indicator'),
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Derived indicator not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to delete derived indicator'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const accessRecord = await assertResourceWritable({
        c,
        resource: 'derivedIndicator',
        resourceId: id,
        notFoundError: derivedIndicatorNotFoundError,
      })
      const record = await fetchFullDerivedIndicatorOrThrow(
        id,
        accessRecord.organizationId,
      )

      await ensureDerivedIndicatorNotUsedByCharts(id)

      await db
        .delete(derivedIndicator)
        .where(
          and(
            eq(derivedIndicator.id, id),
            eq(derivedIndicator.organizationId, accessRecord.organizationId),
          ),
        )

      return generateJsonResponse(c, record, 200, 'Derived indicator deleted')
    },
  )

export default app
