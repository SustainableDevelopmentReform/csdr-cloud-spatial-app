import { createRoute, z } from '@hono/zod-openapi'
import { and, desc, eq, inArray, notInArray } from 'drizzle-orm'
import {
  assertCanSetVisibility,
  assertResourceReadable,
  assertResourceWritable,
  buildExplorerReadScope,
  requireOwnedInsertContext,
} from '~/lib/authorization'
import { fetchChartUsageCounts } from '~/lib/chartUsage'
import { db } from '~/lib/db'
import { ServerError } from '~/lib/error'
import {
  buildGeometryIntersectsFilter,
  getBoundsFilterEnvelope,
} from '~/lib/geographicBounds'
import {
  createOpenAPIApp,
  createResponseSchema,
  jsonErrorResponse,
  validationErrorResponse,
} from '~/lib/openapi'
import {
  getDatasetVisibilityImpact,
  visibilityImpactSchema,
} from '~/lib/public-visibility'
import { authMiddleware } from '~/middlewares/auth'
import { generateJsonResponse } from '../lib/response'
import { dataset, datasetRun, product } from '../schemas/db'
import {
  baseAclColumns,
  createOwnedPayload,
  InferQueryModel,
  QueryForTable,
  updatePayload,
} from '../schemas/util'
import {
  baseDatasetRunSchema,
  baseDatasetSchema,
  createDatasetSchema,
  datasetQuerySchema,
  datasetRunQuerySchema,
  fullDatasetSchema,
  updateDatasetSchema,
  updateVisibilitySchema,
} from '@repo/schemas/crud'
import { baseDatasetRunQuery, parseBaseDatasetRun } from './datasetRun'
import { normalizeFilterValues, parseQuery } from '../utils/query'

export const baseDatasetQuery = {
  columns: {
    ...baseAclColumns,
    mainRunId: true,
    sourceUrl: true,
    sourceMetadataUrl: true,
  },
} satisfies QueryForTable<'dataset'>

export const fullDatasetQuery = {
  columns: baseDatasetQuery.columns,
  with: {
    mainRun: baseDatasetRunQuery,
  },
} satisfies QueryForTable<'dataset'>

const datasetNotFoundError = () =>
  new ServerError({
    statusCode: 404,
    message: 'Failed to get dataset',
    description: "Dataset you're looking for is not found",
  })

const visibilityImpactQuerySchema = z.object({
  targetVisibility: updateVisibilitySchema.shape.visibility,
})

export const parseBaseDataset = <
  T extends InferQueryModel<'dataset', typeof baseDatasetQuery>,
>(
  record: T,
) => record

export const parseFullDataset = <
  T extends InferQueryModel<'dataset', typeof fullDatasetQuery>,
>(
  record: T,
) => ({
  ...record,
  mainRun:
    record.mainRun && record.mainRun.dataset.id === record.id
      ? parseBaseDatasetRun(record.mainRun)
      : null,
})

const fetchFullDataset = async (id: string, organizationId: string) => {
  const record = await db.query.dataset.findFirst({
    where: (dataset, { and, eq }) =>
      and(eq(dataset.id, id), eq(dataset.organizationId, organizationId)),
    ...fullDatasetQuery,
  })

  if (!record) {
    return null
  }

  const [runCount, productCount, usageCounts] = await Promise.all([
    db.$count(datasetRun, eq(datasetRun.datasetId, id)),
    db.$count(product, eq(product.datasetId, id)),
    fetchChartUsageCounts({ type: 'dataset', id }),
  ])

  return {
    ...parseFullDataset(record),
    runCount,
    productCount,
    ...usageCounts,
  }
}

export const fetchFullDatasetOrThrow = async (
  id: string,
  organizationId: string,
) => {
  const fullDataset = await fetchFullDataset(id, organizationId)

  if (!fullDataset) {
    throw datasetNotFoundError()
  }

  return fullDataset
}

const app = createOpenAPIApp()
  .openapi(
    createRoute({
      description: 'List datasets with pagination metadata.',
      method: 'get',
      path: '/',
      middleware: [
        authMiddleware({
          permission: 'read:dataset',
          scope: 'explorer',
        }),
      ],
      request: {
        query: datasetQuerySchema,
      },
      responses: {
        200: {
          description: 'Successfully listed datasets.',
          content: {
            'application/json': {
              schema: createResponseSchema(
                z.object({
                  pageCount: z.number().int(),
                  totalCount: z.number().int(),
                  data: z.array(baseDatasetSchema),
                }),
              ),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to list datasets'),
      },
    }),
    async (c) => {
      const queryParams = c.req.valid('query')
      const { datasetIds, excludeDatasetIds } = queryParams
      const datasetIdsArray = normalizeFilterValues(datasetIds)
      const excludeDatasetIdsArray = normalizeFilterValues(excludeDatasetIds)
      const boundsEnvelope = getBoundsFilterEnvelope(queryParams)
      const baseWhere = and(
        buildExplorerReadScope(c, dataset.organizationId, dataset.visibility),
        datasetIdsArray.length > 0
          ? inArray(dataset.id, datasetIdsArray)
          : undefined,
        excludeDatasetIdsArray.length > 0
          ? notInArray(dataset.id, excludeDatasetIdsArray)
          : undefined,
        boundsEnvelope
          ? inArray(
              dataset.mainRunId,
              db
                .select({ id: datasetRun.id })
                .from(datasetRun)
                .where(
                  buildGeometryIntersectsFilter(
                    datasetRun.bounds,
                    boundsEnvelope,
                  ),
                ),
            )
          : undefined,
      )
      const { meta, query } = await parseQuery(dataset, queryParams, {
        defaultOrderBy: desc(dataset.createdAt),
        searchableColumns: [dataset.name, dataset.description],
        baseWhere,
      })

      const data = await db.query.dataset.findMany({
        ...baseDatasetQuery,
        ...query,
      })

      return generateJsonResponse(
        c,
        {
          ...meta,
          data,
        },
        200,
      )
    },
  )
  .openapi(
    createRoute({
      description: 'Retrieve a dataset by id.',
      method: 'get',
      path: '/:id',
      middleware: [
        authMiddleware({ permission: 'read:dataset', scope: 'explorer' }),
      ],
      request: {
        params: z.object({
          id: z.string().min(1),
        }),
      },
      responses: {
        200: {
          description: 'Successfully retrieved a dataset.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullDatasetSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Dataset not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to fetch dataset'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const accessRecord = await assertResourceReadable({
        c,
        resource: 'dataset',
        resourceId: id,
        scope: 'explorer',
        notFoundError: datasetNotFoundError,
      })
      const record = await fetchFullDatasetOrThrow(
        id,
        accessRecord.organizationId,
      )

      return generateJsonResponse(c, record, 200)
    },
  )
  .openapi(
    createRoute({
      description:
        'List dataset runs for a dataset, or across datasets using "*".',
      method: 'get',
      path: '/:id/runs',
      middleware: [
        authMiddleware({
          permission: 'read:datasetRun',
          scope: 'explorer',
          skipResourceCheck: true,
        }),
      ],
      request: {
        params: z.object({
          id: z.string().min(1),
        }),
        query: datasetRunQuerySchema,
      },
      responses: {
        200: {
          description:
            'Successfully listed dataset runs for a dataset or across datasets using "*".',
          content: {
            'application/json': {
              schema: createResponseSchema(
                z.object({
                  pageCount: z.number().int(),
                  totalCount: z.number().int(),
                  data: z.array(baseDatasetRunSchema),
                }),
              ),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to list dataset runs'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const datasetId = id === '*' ? undefined : id
      const queryParams = c.req.valid('query')
      if (datasetId) {
        await assertResourceReadable({
          c,
          resource: 'dataset',
          resourceId: datasetId,
          scope: 'explorer',
          notFoundError: datasetNotFoundError,
        })
      }
      const boundsEnvelope = getBoundsFilterEnvelope(queryParams)
      const { meta, query } = await parseQuery(datasetRun, queryParams, {
        defaultOrderBy: desc(datasetRun.createdAt),
        searchableColumns: [datasetRun.name, datasetRun.description],
        baseWhere: and(
          datasetId
            ? eq(datasetRun.datasetId, datasetId)
            : inArray(
                datasetRun.datasetId,
                db
                  .select({ id: dataset.id })
                  .from(dataset)
                  .where(
                    buildExplorerReadScope(
                      c,
                      dataset.organizationId,
                      dataset.visibility,
                    ),
                  ),
              ),
          buildGeometryIntersectsFilter(datasetRun.bounds, boundsEnvelope),
        ),
      })

      const data = await db.query.datasetRun.findMany({
        ...baseDatasetRunQuery,
        ...query,
      })

      const parsedData = data.map(parseBaseDatasetRun)

      return generateJsonResponse(
        c,
        {
          ...meta,
          data: parsedData,
        },
        200,
      )
    },
  )
  .openapi(
    createRoute({
      description: 'Create a dataset.',
      method: 'post',
      path: '/',
      middleware: [
        authMiddleware({
          permission: 'write:dataset',
        }),
      ],
      request: {
        body: {
          required: true,
          content: {
            'application/json': {
              schema: createDatasetSchema,
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Successfully created a dataset.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullDatasetSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to create dataset'),
      },
    }),
    async (c) => {
      const payload = c.req.valid('json')
      const { actor, activeOrganizationId } = requireOwnedInsertContext(c)
      const [newDataset] = await db
        .insert(dataset)
        .values(
          createOwnedPayload({
            ...payload,
            organizationId: activeOrganizationId,
            createdByUserId: actor.user.id,
          }),
        )
        .returning()

      if (!newDataset) {
        throw new ServerError({
          statusCode: 500,
          message: 'Failed to create dataset',
          description: 'Dataset insert did not return a record',
        })
      }

      const record = await fetchFullDatasetOrThrow(
        newDataset.id,
        activeOrganizationId,
      )

      return generateJsonResponse(c, record, 201, 'Dataset created')
    },
  )
  .openapi(
    createRoute({
      description: 'Update a dataset.',
      method: 'patch',
      path: '/:id',
      middleware: [
        authMiddleware({
          permission: 'write:dataset',
        }),
      ],
      request: {
        params: z.object({ id: z.string().min(1) }),
        body: {
          required: true,
          content: {
            'application/json': {
              schema: updateDatasetSchema,
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Successfully updated a dataset.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullDatasetSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Dataset not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to update dataset'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const payload = c.req.valid('json')
      const accessRecord = await assertResourceWritable({
        c,
        resource: 'dataset',
        resourceId: id,
        notFoundError: datasetNotFoundError,
      })
      const mainRunId = payload.mainRunId
      if (mainRunId) {
        const mainRun = await db.query.datasetRun.findFirst({
          where: (table, { and, eq }) =>
            and(eq(table.id, mainRunId), eq(table.datasetId, id)),
          columns: {
            id: true,
          },
        })

        if (!mainRun) {
          throw datasetNotFoundError()
        }
      }

      const [record] = await db
        .update(dataset)
        .set(updatePayload(payload))
        .where(
          and(
            eq(dataset.id, id),
            eq(dataset.organizationId, accessRecord.organizationId),
          ),
        )
        .returning()

      if (!record) {
        throw datasetNotFoundError()
      }

      const fullRecord = await fetchFullDatasetOrThrow(
        record.id,
        accessRecord.organizationId,
      )

      return generateJsonResponse(c, fullRecord, 200, 'Dataset updated')
    },
  )
  .openapi(
    createRoute({
      description: 'Preview dataset visibility impact.',
      method: 'get',
      path: '/:id/visibility-impact',
      middleware: [
        authMiddleware({
          permission: 'write:dataset',
        }),
      ],
      request: {
        params: z.object({ id: z.string().min(1) }),
        query: visibilityImpactQuerySchema,
      },
      responses: {
        200: {
          description: 'Successfully previewed dataset visibility impact.',
          content: {
            'application/json': {
              schema: createResponseSchema(visibilityImpactSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Dataset not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to preview dataset visibility impact'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const { targetVisibility } = c.req.valid('query')
      const { actor } = requireOwnedInsertContext(c)
      const accessRecord = await assertResourceWritable({
        c,
        resource: 'dataset',
        resourceId: id,
        notFoundError: datasetNotFoundError,
      })

      assertCanSetVisibility({
        actor,
        currentVisibility: accessRecord.visibility,
        nextVisibility: targetVisibility,
      })

      const impact = await db.transaction((tx) =>
        getDatasetVisibilityImpact(
          tx,
          id,
          targetVisibility,
          accessRecord.organizationId,
        ),
      )

      return generateJsonResponse(c, impact, 200)
    },
  )
  .openapi(
    createRoute({
      description: 'Update dataset visibility.',
      method: 'patch',
      path: '/:id/visibility',
      middleware: [
        authMiddleware({
          permission: 'write:dataset',
        }),
      ],
      request: {
        params: z.object({ id: z.string().min(1) }),
        body: {
          required: true,
          content: {
            'application/json': {
              schema: updateVisibilitySchema,
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Successfully updated dataset visibility.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullDatasetSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Dataset not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to update dataset visibility'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const payload = c.req.valid('json')
      const { actor } = requireOwnedInsertContext(c)
      const accessRecord = await assertResourceWritable({
        c,
        resource: 'dataset',
        resourceId: id,
        notFoundError: datasetNotFoundError,
      })

      assertCanSetVisibility({
        actor,
        currentVisibility: accessRecord.visibility,
        nextVisibility: payload.visibility,
      })

      const [record] = await db
        .update(dataset)
        .set(updatePayload(payload))
        .where(
          and(
            eq(dataset.id, id),
            eq(dataset.organizationId, accessRecord.organizationId),
          ),
        )
        .returning()

      if (!record) {
        throw datasetNotFoundError()
      }

      const fullRecord = await fetchFullDatasetOrThrow(
        record.id,
        accessRecord.organizationId,
      )

      return generateJsonResponse(
        c,
        fullRecord,
        200,
        'Dataset visibility updated',
      )
    },
  )
  .openapi(
    createRoute({
      description: 'Delete a dataset.',
      method: 'delete',
      path: '/:id',
      middleware: [
        authMiddleware({
          permission: 'write:dataset',
        }),
      ],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully deleted a dataset.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullDatasetSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Dataset not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to delete dataset'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const accessRecord = await assertResourceWritable({
        c,
        resource: 'dataset',
        resourceId: id,
        notFoundError: datasetNotFoundError,
      })
      const record = await fetchFullDatasetOrThrow(
        id,
        accessRecord.organizationId,
      )

      await db
        .delete(dataset)
        .where(
          and(
            eq(dataset.id, id),
            eq(dataset.organizationId, accessRecord.organizationId),
          ),
        )

      return generateJsonResponse(c, record, 200, 'Dataset deleted')
    },
  )

export default app
