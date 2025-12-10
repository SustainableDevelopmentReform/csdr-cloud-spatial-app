import { createRoute, z } from '@hono/zod-openapi'
import {
  indicatorSchema,
  createIndicatorSchema,
  updateIndicatorSchema,
  indicatorQuerySchema,
  derivedIndicatorSchema,
  updateDerivedIndicatorSchema,
  createDerivedIndicatorSchema,
} from '@repo/schemas/crud'
import { and, count, desc, eq, inArray } from 'drizzle-orm'
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
  derivedIndicator,
  derivedIndicatorToIndicator,
  indicator,
} from '../schemas/db'
import {
  baseColumns,
  createPayload,
  QueryForTable,
  updatePayload,
} from '../schemas/util'
import { parseQuery } from '../utils/query'

export const baseIndicatorQuery = {
  columns: {
    ...baseColumns,
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
    ...baseIndicatorQuery.columns,
    expression: true,
  },
  with: {
    ...baseIndicatorQuery.with,
    indicators: {
      with: {
        indicator: baseIndicatorQuery,
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

const fetchFullIndicator = async (id: string) => {
  const indicatorRecord = await db.query.indicator.findFirst({
    where: (indicator, { eq }) => eq(indicator.id, id),
    ...baseIndicatorQuery,
  })

  return indicatorRecord ?? null
}

const fetchFullDerivedIndicator = async (id: string) => {
  const derivedIndicatorRecord = await db.query.derivedIndicator.findFirst({
    where: (derivedIndicator, { eq }) => eq(derivedIndicator.id, id),
    ...baseDerivedIndicatorQuery,
  })

  return derivedIndicatorRecord ?? null
}
const fetchFullDerivedIndicatorOrThrow = async (id: string) => {
  const record = await fetchFullDerivedIndicator(id)

  if (!record) {
    throw derivedIndicatorNotFoundError()
  }

  return {
    ...record,
    indicators: record.indicators.map((i) => i.indicator),
    isDerived: true as const,
  }
}

const fetchFullIndicatorOrThrow = async (id: string) => {
  const record = await fetchFullIndicator(id)

  if (!record) {
    throw indicatorNotFoundError()
  }

  return record
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
                  data: z.array(
                    z.union([indicatorSchema, derivedIndicatorSchema]),
                  ),
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
      const { indicatorIds } = queryParams

      // Parse query for both tables
      const [indicatorQuery, derivedQuery] = await Promise.all([
        parseQuery(indicator, queryParams, {
          defaultOrderBy: desc(indicator.createdAt),
          searchableColumns: [indicator.name],
        }),
        parseQuery(derivedIndicator, queryParams, {
          defaultOrderBy: desc(derivedIndicator.createdAt),
          searchableColumns: [derivedIndicator.name],
        }),
      ])

      // Add indicatorIds filter if provided
      const indicatorIdsArray = indicatorIds
        ? Array.isArray(indicatorIds)
          ? indicatorIds
          : [indicatorIds]
        : undefined

      const indicatorWhere = indicatorIdsArray
        ? and(indicatorQuery.where, inArray(indicator.id, indicatorIdsArray))
        : indicatorQuery.where

      const derivedWhere = indicatorIdsArray
        ? and(
            derivedQuery.where,
            inArray(derivedIndicator.id, indicatorIdsArray),
          )
        : derivedQuery.where

      // Get combined count from both tables with filters applied
      const [indicatorCountResult, derivedCountResult] = await Promise.all([
        db.select({ count: count() }).from(indicator).where(indicatorWhere),
        db
          .select({ count: count() })
          .from(derivedIndicator)
          .where(derivedWhere),
      ])

      const totalCount =
        (indicatorCountResult[0]?.count ?? 0) +
        (derivedCountResult[0]?.count ?? 0)
      const pageSize = indicatorQuery.limit ?? 10
      const pageCount = pageSize > 0 ? Math.ceil(totalCount / pageSize) : 0

      const fetchIndicators =
        queryParams.type === 'measure' ||
        queryParams.type === 'all' ||
        queryParams.type === undefined
      const fetchDerivedIndicators =
        queryParams.type === 'derived' ||
        queryParams.type === 'all' ||
        queryParams.type === undefined

      // Fetch from both tables with their full relations
      const [indicators, derivedIndicators] = await Promise.all([
        fetchIndicators
          ? db.query.indicator.findMany({
              ...baseIndicatorQuery,
              where: indicatorWhere,
            })
          : [],
        fetchDerivedIndicators
          ? db.query.derivedIndicator.findMany({
              ...baseDerivedIndicatorQuery,
              where: derivedWhere,
            })
          : [],
      ])

      // Transform derived indicators to include the indicators array properly
      const transformedDerived = derivedIndicators.map((d) => ({
        ...d,
        indicators: d.indicators.map((i) => ({
          ...i.indicator,
        })),
        isDerived: true,
      }))

      // Merge and sort both arrays
      const combined = [...indicators, ...transformedDerived]

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
        indicatorQuery.offset ?? 0,
        (indicatorQuery.offset ?? 0) + (indicatorQuery.limit ?? 10),
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
      description: 'Retrieve a indicator.',
      method: 'get',
      path: '/:id',
      middleware: [authMiddleware({ permission: 'read:indicator' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully retrieved a indicator.',
          content: {
            'application/json': {
              schema: createResponseSchema(indicatorSchema),
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
      const record = await fetchFullIndicatorOrThrow(id)

      return generateJsonResponse(c, record, 200)
    },
  )

  .openapi(
    createRoute({
      description: 'Retrieve a derived indicator.',
      method: 'get',
      path: 'derived/:id',
      middleware: [authMiddleware({ permission: 'read:indicator' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully retrieved a derived indicator.',
          content: {
            'application/json': {
              schema: createResponseSchema(derivedIndicatorSchema),
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
      const record = await fetchFullDerivedIndicatorOrThrow(id)

      return generateJsonResponse(c, record, 200)
    },
  )

  .openapi(
    createRoute({
      description: 'Create a indicator.',
      method: 'post',
      path: '/',
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
          description: 'Successfully created a indicator.',
          content: {
            'application/json': {
              schema: createResponseSchema(indicatorSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to create indicator'),
      },
    }),
    async (c) => {
      const payload = c.req.valid('json')
      const data = {
        ...payload,
        categoryId: payload.categoryId ?? null,
      }
      const [newIndicator] = await db
        .insert(indicator)
        .values(createPayload(data))
        .returning()

      if (!newIndicator) {
        throw new ServerError({
          statusCode: 500,
          message: 'Failed to create indicator',
          description: 'Indicator insert did not return a record',
        })
      }

      const record = await fetchFullIndicatorOrThrow(newIndicator.id)

      return generateJsonResponse(c, record, 201, 'Indicator created')
    },
  )

  .openapi(
    createRoute({
      description: 'Create a derived indicator.',
      method: 'post',
      path: 'derived',
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
              schema: createResponseSchema(derivedIndicatorSchema),
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
      const data = {
        ...payload,
        categoryId: payload.categoryId ?? null,
      }
      const [newIndicator] = await db
        .insert(derivedIndicator)
        .values(createPayload(data))
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

      const record = await fetchFullDerivedIndicatorOrThrow(newIndicator.id)

      return generateJsonResponse(c, record, 201, 'Derived indicator created')
    },
  )

  .openapi(
    createRoute({
      description: 'Update a indicator.',
      method: 'patch',
      path: '/:id',
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
          description: 'Successfully updated a indicator.',
          content: {
            'application/json': {
              schema: createResponseSchema(indicatorSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Indicator not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to update indicator'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const payload = c.req.valid('json')
      const data = {
        ...payload,
        ...(payload.categoryId !== undefined && {
          categoryId: payload.categoryId ?? null,
        }),
      }

      const [record] = await db
        .update(indicator)
        .set(updatePayload(data))
        .where(eq(indicator.id, id))
        .returning()

      if (!record) {
        throw indicatorNotFoundError()
      }

      const fullRecord = await fetchFullIndicatorOrThrow(record.id)

      return generateJsonResponse(c, fullRecord, 200, 'Indicator updated')
    },
  )

  .openapi(
    createRoute({
      description: 'Update a derived indicator.',
      method: 'patch',
      path: 'derived/:id',
      middleware: [authMiddleware({ permission: 'write:indicator' })],
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
              schema: createResponseSchema(derivedIndicatorSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Indicator not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to update indicator'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const { indicatorIds, ...payload } = c.req.valid('json')
      const data = {
        ...payload,
        ...(payload.categoryId !== undefined && {
          categoryId: payload.categoryId ?? null,
        }),
      }

      const [record] = await db
        .update(derivedIndicator)
        .set(updatePayload(data))
        .where(eq(derivedIndicator.id, id))
        .returning()

      await db
        .delete(derivedIndicatorToIndicator)
        .where(eq(derivedIndicatorToIndicator.derivedIndicatorId, id))

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
          indicatorIds?.map((indicatorId) => ({
            derivedIndicatorId: id,
            indicatorId,
          })),
        )
      }

      if (!record) {
        throw derivedIndicatorNotFoundError()
      }

      const fullRecord = await fetchFullDerivedIndicatorOrThrow(record.id)

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
      description: 'Delete a indicator.',
      method: 'delete',
      path: '/:id',
      middleware: [authMiddleware({ permission: 'write:indicator' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully deleted a indicator.',
          content: {
            'application/json': {
              schema: createResponseSchema(indicatorSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Indicator not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to delete indicator'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const record = await fetchFullIndicatorOrThrow(id)

      await db.delete(indicator).where(eq(indicator.id, id))

      return generateJsonResponse(c, record, 200, 'Indicator deleted')
    },
  )

  .openapi(
    createRoute({
      description: 'Delete a derived indicator.',
      method: 'delete',
      path: 'derived/:id',
      middleware: [authMiddleware({ permission: 'write:indicator' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully deleted a derived indicator.',
          content: {
            'application/json': {
              schema: createResponseSchema(derivedIndicatorSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Derived indicator not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to delete derived indicator'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const record = await fetchFullDerivedIndicatorOrThrow(id)

      await db.delete(derivedIndicator).where(eq(derivedIndicator.id, id))

      return generateJsonResponse(c, record, 200, 'Derived indicator deleted')
    },
  )

export default app
