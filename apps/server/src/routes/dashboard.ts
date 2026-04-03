import { createRoute, z } from '@hono/zod-openapi'
import {
  baseDashboardSchema,
  createDashboardSchema,
  dashboardContentSchema,
  dashboardQuerySchema,
  fullDashboardSchema,
  updateDashboardSchema,
  updateVisibilitySchema,
} from '@repo/schemas/crud'
import { and, desc, eq } from 'drizzle-orm'
import {
  buildDashboardUsageFilters,
  syncDashboardChartUsages,
} from '~/lib/chartUsage'
import {
  assertDashboardDependenciesExternallyVisible,
  getDashboardVisibilityImpact,
  visibilityImpactSchema,
} from '~/lib/public-visibility'
import {
  assertCanSetVisibility,
  assertResourceReadable,
  assertResourceWritable,
  buildExplorerReadScope,
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
import { dashboard } from '../schemas/db'
import {
  baseAclColumns,
  createOwnedPayload,
  QueryForTable,
  updatePayload,
} from '../schemas/util'
import { parseQuery } from '../utils/query'

export const baseDashboardQuery = {
  columns: {
    ...baseAclColumns,
  },
} satisfies QueryForTable<'dashboard'>

export const fullDashboardQuery = {
  columns: {
    ...baseDashboardQuery.columns,
    content: true,
  },
} satisfies QueryForTable<'dashboard'>

const dashboardNotFoundError = () =>
  new ServerError({
    statusCode: 404,
    message: 'Failed to get dashboard',
    description: "dashboard you're looking for is not found",
  })

const visibilityImpactQuerySchema = z.object({
  targetVisibility: updateVisibilitySchema.shape.visibility,
})

const fetchFullDashboard = async (id: string, organizationId: string) => {
  const record = await db.query.dashboard.findFirst({
    where: (dashboard, { and, eq }) =>
      and(eq(dashboard.id, id), eq(dashboard.organizationId, organizationId)),
    ...fullDashboardQuery,
  })

  return record ?? null
}

const fetchFullDashboardOrThrow = async (
  id: string,
  organizationId: string,
) => {
  const record = await fetchFullDashboard(id, organizationId)

  if (!record) {
    throw dashboardNotFoundError()
  }

  const parsedContent = dashboardContentSchema.parse(record.content)

  return { ...record, content: parsedContent }
}

const app = createOpenAPIApp()
  .openapi(
    createRoute({
      description: 'List dashboards with pagination metadata.',
      method: 'get',
      path: '/',
      middleware: [
        authMiddleware({ permission: 'read:dashboard', scope: 'explorer' }),
      ],
      request: {
        query: dashboardQuerySchema,
      },
      responses: {
        200: {
          description: 'List dashboards with pagination metadata.',
          content: {
            'application/json': {
              schema: createResponseSchema(
                z.object({
                  pageCount: z.number().int(),
                  totalCount: z.number().int(),
                  data: z.array(baseDashboardSchema),
                }),
              ),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to list dashboards'),
      },
    }),
    async (c) => {
      const queryParams = c.req.valid('query')
      const usageFilters = buildDashboardUsageFilters(queryParams)
      const baseWhere =
        usageFilters.length > 0
          ? and(
              buildExplorerReadScope(
                c,
                dashboard.organizationId,
                dashboard.visibility,
              ),
              ...usageFilters,
            )
          : buildExplorerReadScope(
              c,
              dashboard.organizationId,
              dashboard.visibility,
            )
      const { meta, query } = await parseQuery(dashboard, queryParams, {
        defaultOrderBy: desc(dashboard.createdAt),
        searchableColumns: [dashboard.name, dashboard.description],
        baseWhere,
      })

      const data = await db.query.dashboard.findMany({
        ...baseDashboardQuery,
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
      description: 'Retrieve a dashboard.',
      method: 'get',
      path: '/:id',
      middleware: [
        authMiddleware({ permission: 'read:dashboard', scope: 'explorer' }),
      ],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully retrieved a dashboard.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullDashboardSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Dashboard not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to fetch dashboard'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const accessRecord = await assertResourceReadable({
        c,
        resource: 'dashboard',
        resourceId: id,
        scope: 'explorer',
        notFoundError: dashboardNotFoundError,
      })
      const record = await fetchFullDashboardOrThrow(
        id,
        accessRecord.organizationId,
      )

      return generateJsonResponse(c, record, 200)
    },
  )

  .openapi(
    createRoute({
      description: 'Create a dashboard.',
      method: 'post',
      path: '/',
      middleware: [authMiddleware({ permission: 'write:dashboard' })],
      request: {
        body: {
          required: true,
          content: {
            'application/json': {
              schema: createDashboardSchema,
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Successfully created a dashboard.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullDashboardSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to create dashboard'),
      },
    }),
    async (c) => {
      const payload = c.req.valid('json')
      const { actor, activeOrganizationId } = requireOwnedInsertContext(c)
      const newDashboard = await db.transaction(async (tx) => {
        const [insertedDashboard] = await tx
          .insert(dashboard)
          .values(
            createOwnedPayload({
              ...payload,
              organizationId: activeOrganizationId,
              createdByUserId: actor.user.id,
            }),
          )
          .returning()

        if (!insertedDashboard) {
          throw new ServerError({
            statusCode: 500,
            message: 'Failed to create dashboard',
            description: 'Dashboard insert did not return a record',
          })
        }

        await syncDashboardChartUsages(
          tx,
          insertedDashboard.id,
          payload.content,
        )

        return insertedDashboard
      })

      const record = await fetchFullDashboardOrThrow(
        newDashboard.id,
        activeOrganizationId,
      )

      return generateJsonResponse(c, record, 201, 'Dashboard created')
    },
  )

  .openapi(
    createRoute({
      description: 'Update a dashboard.',
      method: 'patch',
      path: '/:id',
      middleware: [authMiddleware({ permission: 'write:dashboard' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
        body: {
          required: true,
          content: {
            'application/json': {
              schema: updateDashboardSchema,
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Successfully updated a dashboard.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullDashboardSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Dashboard not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to update dashboard'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const payload = c.req.valid('json')
      const accessRecord = await assertResourceWritable({
        c,
        resource: 'dashboard',
        resourceId: id,
        notFoundError: dashboardNotFoundError,
      })

      const record = await db.transaction(async (tx) => {
        const [updatedRecord] = await tx
          .update(dashboard)
          .set(updatePayload(payload))
          .where(
            and(
              eq(dashboard.id, id),
              eq(dashboard.organizationId, accessRecord.organizationId),
            ),
          )
          .returning()

        if (!updatedRecord) {
          throw dashboardNotFoundError()
        }

        if (payload.content) {
          await syncDashboardChartUsages(tx, updatedRecord.id, payload.content)
        }

        if (updatedRecord.visibility !== 'private') {
          await assertDashboardDependenciesExternallyVisible(
            tx,
            updatedRecord.id,
            updatedRecord.visibility,
            accessRecord.organizationId,
          )
        }

        return updatedRecord
      })

      const fullRecord = await fetchFullDashboardOrThrow(
        record.id,
        accessRecord.organizationId,
      )

      return generateJsonResponse(c, fullRecord, 200, 'Dashboard updated')
    },
  )
  .openapi(
    createRoute({
      description: 'Preview dashboard visibility impact.',
      method: 'get',
      path: '/:id/visibility-impact',
      middleware: [authMiddleware({ permission: 'write:dashboard' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
        query: visibilityImpactQuerySchema,
      },
      responses: {
        200: {
          description: 'Successfully previewed dashboard visibility impact.',
          content: {
            'application/json': {
              schema: createResponseSchema(visibilityImpactSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Dashboard not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to preview dashboard visibility impact'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const { targetVisibility } = c.req.valid('query')
      const { actor } = requireOwnedInsertContext(c)
      const accessRecord = await assertResourceWritable({
        c,
        resource: 'dashboard',
        resourceId: id,
        notFoundError: dashboardNotFoundError,
      })

      assertCanSetVisibility({
        actor,
        currentVisibility: accessRecord.visibility,
        nextVisibility: targetVisibility,
      })

      const impact = await db.transaction((tx) =>
        getDashboardVisibilityImpact(
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
      description: 'Update dashboard visibility.',
      method: 'patch',
      path: '/:id/visibility',
      middleware: [authMiddleware({ permission: 'write:dashboard' })],
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
          description: 'Successfully updated dashboard visibility.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullDashboardSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Dashboard not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to update dashboard visibility'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const payload = c.req.valid('json')
      const { actor } = requireOwnedInsertContext(c)
      const accessRecord = await assertResourceWritable({
        c,
        resource: 'dashboard',
        resourceId: id,
        notFoundError: dashboardNotFoundError,
      })

      const record = await db.transaction(async (tx) => {
        assertCanSetVisibility({
          actor,
          currentVisibility: accessRecord.visibility,
          nextVisibility: payload.visibility,
        })

        const [updatedRecord] = await tx
          .update(dashboard)
          .set(updatePayload(payload))
          .where(
            and(
              eq(dashboard.id, id),
              eq(dashboard.organizationId, accessRecord.organizationId),
            ),
          )
          .returning()

        if (!updatedRecord) {
          throw dashboardNotFoundError()
        }

        if (updatedRecord.visibility !== 'private') {
          await assertDashboardDependenciesExternallyVisible(
            tx,
            updatedRecord.id,
            updatedRecord.visibility,
            accessRecord.organizationId,
          )
        }

        return updatedRecord
      })

      const fullRecord = await fetchFullDashboardOrThrow(
        record.id,
        accessRecord.organizationId,
      )

      return generateJsonResponse(
        c,
        fullRecord,
        200,
        'Dashboard visibility updated',
      )
    },
  )

  .openapi(
    createRoute({
      description: 'Delete a dashboard.',
      method: 'delete',
      path: '/:id',
      middleware: [authMiddleware({ permission: 'write:dashboard' })],
      request: {
        params: z.object({ id: z.string().min(1) }),
      },
      responses: {
        200: {
          description: 'Successfully deleted a dashboard.',
          content: {
            'application/json': {
              schema: createResponseSchema(fullDashboardSchema),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        404: jsonErrorResponse('Dashboard not found'),
        422: validationErrorResponse,
        500: jsonErrorResponse('Failed to delete dashboard'),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param')
      const accessRecord = await assertResourceWritable({
        c,
        resource: 'dashboard',
        resourceId: id,
        notFoundError: dashboardNotFoundError,
      })
      const record = await fetchFullDashboardOrThrow(
        id,
        accessRecord.organizationId,
      )

      await db
        .delete(dashboard)
        .where(
          and(
            eq(dashboard.id, id),
            eq(dashboard.organizationId, accessRecord.organizationId),
          ),
        )

      return generateJsonResponse(c, record, 200, 'Dashboard deleted')
    },
  )

export default app
