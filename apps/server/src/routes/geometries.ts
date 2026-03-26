import { createRoute, z } from '@hono/zod-openapi'
import {
  baseGeometriesRunSchema,
  baseGeometriesSchema,
  createGeometriesSchema,
  fullGeometriesSchema,
  geometriesQuerySchema,
  geometriesRunQuerySchema,
  updateGeometriesSchema,
} from '@repo/schemas/crud'
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
import { geometries, geometriesRun, product } from '../schemas/db'
import {
  baseAclColumns,
  createOwnedPayload,
  QueryForTable,
  updatePayload,
} from '../schemas/util'
import { normalizeFilterValues, parseQuery } from '../utils/query'
import { baseGeometriesRunQuery } from './geometriesRun'

export const baseGeometriesQuery = {
  columns: {
    ...baseAclColumns,
    mainRunId: true,
    sourceUrl: true,
    sourceMetadataUrl: true,
  },
} satisfies QueryForTable<'geometries'>

export const fullGeometriesQuery = {
  columns: baseGeometriesQuery.columns,
  with: {
    mainRun: baseGeometriesRunQuery,
  },
} satisfies QueryForTable<'geometries'>

const geometriesNotFoundError = () =>
  new ServerError({
    statusCode: 404,
    message: 'Failed to get geometries',
    description: "Geometries you're looking for is not found",
  })

const fetchFullGeometries = async (id: string, organizationId: string) => {
  const record = await db.query.geometries.findFirst({
    where: (geometries, { and, eq }) =>
      and(eq(geometries.id, id), eq(geometries.organizationId, organizationId)),
    ...fullGeometriesQuery,
  })

  if (!record) {
    return null
  }

  const [runCount, productCount] = await Promise.all([
    db.$count(geometriesRun, eq(geometriesRun.geometriesId, id)),
    db.$count(product, eq(product.geometriesId, id)),
  ])

  return { ...record, runCount, productCount }
}

const fetchFullGeometriesOrThrow = async (
  id: string,
  organizationId: string,
) => {
  const record = await fetchFullGeometries(id, organizationId)

  if (!record) {
    throw geometriesNotFoundError()
  }

  return record
}

const app = createOpenAPIApp()
  .openapi(
    createRoute({
      description: 'List geometries with pagination metadata.',
      method: 'get',
      path: '/',
      middleware: [authMiddleware({ permission: 'read:geometries' })],
      request: {
        query: geometriesQuerySchema,
      },
      responses: {
        200: {
          description: 'Successfully listed geometries.',
          content: {
            'application/json': {
              schema: createResponseSchema(
                z.object({
                  pageCount: z.number().int(),
                  totalCount: z.number().int(),
                  data: z.array(baseGeometriesSchema),
                }),
              ),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to list geometries'),
      },
    }),
    async (c) => {
      const { geometriesIds, excludeGeometriesIds } = c.req.valid('query')
      const geometriesIdsArray = normalizeFilterValues(geometriesIds)
      const excludeGeometriesIdsArray =
        normalizeFilterValues(excludeGeometriesIds)
      const baseWhere = and(
        buildConsoleReadScope(c, geometries.organizationId),
        geometriesIdsArray.length > 0
          ? inArray(geometries.id, geometriesIdsArray)
          : undefined,
        excludeGeometriesIdsArray.length > 0
          ? notInArray(geometries.id, excludeGeometriesIdsArray)
          : undefined,
      )
      const { meta, query } = await parseQuery(
        geometries,
        c.req.valid('query'),
        {
          defaultOrderBy: desc(geometries.createdAt),
          searchableColumns: [geometries.name, geometries.description],
          baseWhere,
        },
      )

      const data = await db.query.geometries.findMany({
        ...baseGeometriesQuery,
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
      description: 'Retrieve geometries by id.',
      method: 'get',
      path: '/:id',
      middleware: [authMiddleware({ permission: 'read:geometries' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully retrieved geometries.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullGeometriesSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Geometries not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to fetch geometries'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const accessRecord = await assertResourceReadable({
        c,
        resource: 'geometries',
        resourceId: id,
        notFoundError: geometriesNotFoundError,
      })
      const record = await fetchFullGeometriesOrThrow(
        id,
        accessRecord.organizationId,
      )

      return generateJsonResponse(c, record, 200)
    },
  )
  .openapi(
    createRoute({
      description: 'List geometries runs for a geometries resource.',
      method: 'get',
      path: '/:id/runs',
      middleware: [
        authMiddleware({
          permission: 'read:productRun',
          targetResource: 'geometries',
        }),
      ],
      request: {
        params: z.object({ id: z.string().min(1) }),
        query: geometriesRunQuerySchema,
      },
      responses: {
        200: {
          description: 'Successfully listed geometries runs.',
          content: {
            'application/json': {
              schema: createResponseSchema(
                z.object({
                  pageCount: z.number().int(),
                  totalCount: z.number().int(),
                  data: z.array(baseGeometriesRunSchema),
                }),
              ),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to list geometries runs'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      await assertResourceReadable({
        c,
        resource: 'geometries',
        resourceId: id,
        notFoundError: geometriesNotFoundError,
      })
      const { meta, query } = await parseQuery(
        geometriesRun,
        c.req.valid('query'),
        {
          defaultOrderBy: desc(geometriesRun.createdAt),
          searchableColumns: [geometriesRun.name, geometriesRun.description],
          baseWhere: eq(geometriesRun.geometriesId, id),
        },
      )

      const data = await db.query.geometriesRun.findMany({
        ...baseGeometriesRunQuery,
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
      description: 'Create geometries.',
      method: 'post',
      path: '/',
      middleware: [authMiddleware({ permission: 'write:geometries' })],
      request: {
        body: {
          required: true,
          content: {
            'application/json': {
              schema: createGeometriesSchema,
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Successfully created geometries.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullGeometriesSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to create geometries'),
      },
    }),
    async (c) => {
      const payload = c.req.valid('json')
      const { actor, activeOrganizationId } = requireOwnedInsertContext(c)
      const [record] = await db
        .insert(geometries)
        .values(
          createOwnedPayload({
            ...payload,
            organizationId: activeOrganizationId,
            createdByUserId: actor.user.id,
          }),
        )
        .returning()

      if (!record) {
        throw new ServerError({
          statusCode: 500,
          message: 'Failed to create geometries',
          description: 'Geometries insert did not return a record',
        })
      }

      const fullRecord = await fetchFullGeometriesOrThrow(
        record.id,
        activeOrganizationId,
      )

      return generateJsonResponse(c, fullRecord, 201, 'Geometries created')
    },
  )

  .openapi(
    createRoute({
      description: 'Update geometries.',
      method: 'patch',
      path: '/:id',
      middleware: [authMiddleware({ permission: 'write:geometries' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
        body: {
          required: true,
          content: {
            'application/json': {
              schema: updateGeometriesSchema,
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Successfully updated geometries.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullGeometriesSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Geometries not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to update geometries'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const payload = c.req.valid('json')
      const { actor } = requireOwnedInsertContext(c)
      const accessRecord = await assertResourceWritable({
        c,
        resource: 'geometries',
        resourceId: id,
        notFoundError: geometriesNotFoundError,
      })

      assertCanSetVisibility({
        actor,
        nextVisibility: payload.visibility,
        ownerUserId: accessRecord.createdByUserId,
        resource: 'geometries',
      })

      const [record] = await db
        .update(geometries)
        .set(updatePayload(payload))
        .where(
          and(
            eq(geometries.id, id),
            eq(geometries.organizationId, accessRecord.organizationId),
          ),
        )
        .returning()

      if (!record) {
        throw geometriesNotFoundError()
      }

      const fullRecord = await fetchFullGeometriesOrThrow(
        record.id,
        accessRecord.organizationId,
      )

      return generateJsonResponse(c, fullRecord, 200, 'Geometries updated')
    },
  )

  .openapi(
    createRoute({
      description: 'Delete geometries.',
      method: 'delete',
      path: '/:id',
      middleware: [authMiddleware({ permission: 'write:geometries' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully deleted geometries.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullGeometriesSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Geometries not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to delete geometries'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const accessRecord = await assertResourceWritable({
        c,
        resource: 'geometries',
        resourceId: id,
        notFoundError: geometriesNotFoundError,
      })
      const record = await fetchFullGeometriesOrThrow(
        id,
        accessRecord.organizationId,
      )

      await db
        .delete(geometries)
        .where(
          and(
            eq(geometries.id, id),
            eq(geometries.organizationId, accessRecord.organizationId),
          ),
        )

      return generateJsonResponse(c, record, 200, 'Geometries deleted')
    },
  )

export default app
