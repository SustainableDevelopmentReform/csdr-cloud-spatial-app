import { createRoute, z } from '@hono/zod-openapi'
import { and, desc, eq, inArray, notInArray } from 'drizzle-orm'
import {
  assertCanSetVisibility,
  assertResourceReadable,
  assertResourceWritable,
  buildConsoleReadScope,
  requireOwnedInsertContext,
} from '~/lib/authorization'
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
import { dataset, datasetRun, product } from '../schemas/db'
import {
  baseAclColumns,
  createOwnedPayload,
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
} from '@repo/schemas/crud'
import { baseDatasetRunQuery } from './datasetRun'
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

const fetchFullDataset = async (id: string, organizationId: string) => {
  const record = await db.query.dataset.findFirst({
    where: (dataset, { and, eq }) =>
      and(eq(dataset.id, id), eq(dataset.organizationId, organizationId)),
    ...fullDatasetQuery,
  })

  if (!record) {
    return null
  }

  const [runCount, productCount] = await Promise.all([
    db.$count(datasetRun, eq(datasetRun.datasetId, id)),
    db.$count(product, eq(product.datasetId, id)),
  ])

  return { ...record, runCount, productCount }
}

const fetchFullDatasetOrThrow = async (id: string, organizationId: string) => {
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
      const { datasetIds, excludeDatasetIds } = c.req.valid('query')
      const datasetIdsArray = normalizeFilterValues(datasetIds)
      const excludeDatasetIdsArray = normalizeFilterValues(excludeDatasetIds)
      const baseWhere = and(
        buildConsoleReadScope(c, dataset.organizationId),
        datasetIdsArray.length > 0
          ? inArray(dataset.id, datasetIdsArray)
          : undefined,
        excludeDatasetIdsArray.length > 0
          ? notInArray(dataset.id, excludeDatasetIdsArray)
          : undefined,
      )
      const { meta, query } = await parseQuery(dataset, c.req.valid('query'), {
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
      middleware: [authMiddleware({ permission: 'read:dataset' })],
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
      description: 'List dataset runs for a dataset with pagination metadata.',
      method: 'get',
      path: '/:id/runs',
      middleware: [
        authMiddleware({
          permission: 'read:productRun',
          targetResource: 'dataset',
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
          description: 'Successfully listed dataset runs.',
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
      await assertResourceReadable({
        c,
        resource: 'dataset',
        resourceId: id,
        notFoundError: datasetNotFoundError,
      })
      const { meta, query } = await parseQuery(
        datasetRun,
        c.req.valid('query'),
        {
          defaultOrderBy: desc(datasetRun.createdAt),
          searchableColumns: [datasetRun.name, datasetRun.description],
          baseWhere: eq(datasetRun.datasetId, id),
        },
      )

      const data = await db.query.datasetRun.findMany({
        ...baseDatasetRunQuery,
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
      const { actor } = requireOwnedInsertContext(c)
      const accessRecord = await assertResourceWritable({
        c,
        resource: 'dataset',
        resourceId: id,
        notFoundError: datasetNotFoundError,
      })

      assertCanSetVisibility({
        actor,
        nextVisibility: payload.visibility,
        ownerUserId: accessRecord.createdByUserId,
        resource: 'dataset',
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

      return generateJsonResponse(c, fullRecord, 200, 'Dataset updated')
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
