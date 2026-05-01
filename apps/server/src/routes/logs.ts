import { createRoute, z } from '@hono/zod-openapi'
import { and, desc, eq, ilike, inArray, isNull, ne, or } from 'drizzle-orm'
import { authMiddleware } from '~/middlewares/auth'
import { db } from '~/lib/db'
import { ServerError } from '~/lib/error'
import {
  createOpenAPIApp,
  createResponseSchema,
  jsonErrorResponse,
  validationErrorResponse,
} from '~/lib/openapi'
import { generateJsonResponse } from '~/lib/response'
import { auditLog, user } from '~/schemas/db'
import { requireOwnedInsertContext } from '~/lib/authorization'
import {
  persistAccessLog,
  shouldPersistDeniedDecisionLog,
} from '~/lib/access-log'
import {
  requireAuthenticatedActor,
  requireMfaIfNeeded,
} from '~/lib/request-actor'

const logQuerySchema = z.object({
  page: z.coerce.number().positive().optional(),
  size: z.coerce.number().positive().optional(),
  resourceType: z.string().optional(),
  action: z.string().optional(),
  search: z.string().optional(),
  decision: z.enum(['allow', 'deny']).optional(),
  requestKind: z.enum(['mutating', 'read']).optional(),
})

const logEntrySchema = z.object({
  id: z.string(),
  createdAt: z.iso.datetime(),
  actorUserId: z.string().nullable(),
  actorUser: z
    .object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
    })
    .nullable(),
  actorRole: z.string().nullable(),
  activeOrganizationId: z.string().nullable(),
  targetOrganizationId: z.string().nullable(),
  resourceType: z.string(),
  resourceId: z.string().nullable(),
  action: z.string(),
  decision: z.string(),
  requestPath: z.string(),
  requestMethod: z.string(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  details: z.any().nullable(),
})

const buildAuditLogFilters = (
  organizationId: string,
  query: z.infer<typeof logQuerySchema>,
) =>
  and(
    excludeGetSessionAuditLogs(),
    eq(auditLog.targetOrganizationId, organizationId),
    query.resourceType
      ? eq(auditLog.resourceType, query.resourceType)
      : undefined,
    query.action ? eq(auditLog.action, query.action) : undefined,
    buildAuditLogSearchFilter(query.search),
    query.decision ? eq(auditLog.decision, query.decision) : undefined,
    buildRequestKindFilter(query.requestKind),
  )

const buildSuperAdminAuditLogFilters = (
  query: z.infer<typeof logQuerySchema>,
) =>
  and(
    excludeGetSessionAuditLogs(),
    isNull(auditLog.targetOrganizationId),
    query.resourceType
      ? eq(auditLog.resourceType, query.resourceType)
      : undefined,
    query.action ? eq(auditLog.action, query.action) : undefined,
    buildAuditLogSearchFilter(query.search),
    query.decision ? eq(auditLog.decision, query.decision) : undefined,
    buildRequestKindFilter(query.requestKind),
  )

const buildAuditLogSearchFilter = (search: string | undefined) => {
  const searchValue = search?.trim()

  if (!searchValue) {
    return undefined
  }

  const searchTerms = Array.from(
    new Set([searchValue, searchValue.replace(/\s+/g, '_')]),
  )

  const logClauses = searchTerms.flatMap((term) => {
    const pattern = `%${term}%`

    return [
      ilike(auditLog.action, pattern),
      ilike(auditLog.resourceType, pattern),
      ilike(auditLog.resourceId, pattern),
      ilike(auditLog.requestPath, pattern),
    ]
  })
  const actorUserClauses = searchTerms.flatMap((term) => {
    const pattern = `%${term}%`

    return [ilike(user.name, pattern), ilike(user.email, pattern)]
  })

  return or(
    ...logClauses,
    inArray(
      auditLog.actorUserId,
      db
        .select({ id: user.id })
        .from(user)
        .where(or(...actorUserClauses)),
    ),
  )
}

const buildRequestKindFilter = (
  requestKind: z.infer<typeof logQuerySchema>['requestKind'],
) => {
  if (requestKind === 'mutating') {
    return inArray(auditLog.requestMethod, ['POST', 'PUT', 'PATCH', 'DELETE'])
  }

  if (requestKind === 'read') {
    return inArray(auditLog.requestMethod, ['GET', 'HEAD'])
  }

  return undefined
}

const excludeGetSessionAuditLogs = () =>
  and(
    ne(auditLog.action, 'get_session'),
    ne(auditLog.requestPath, '/api/auth/get-session'),
  )

const requireSuperAdmin = (
  actor: ReturnType<typeof requireAuthenticatedActor>,
) => {
  if (!actor.isSuperAdmin) {
    throw new ServerError({
      statusCode: 403,
      message: 'User is not authorized',
    })
  }

  requireMfaIfNeeded(actor)
}

const app = createOpenAPIApp()
  .openapi(
    createRoute({
      method: 'get',
      path: '/audit/super-admin',
      description: 'List super-admin audit logs without a target organization.',
      request: {
        query: logQuerySchema,
      },
      responses: {
        200: {
          description:
            'List super-admin audit logs without a target organization.',
          content: {
            'application/json': {
              schema: createResponseSchema(
                z.object({
                  pageCount: z.number().int(),
                  totalCount: z.number().int(),
                  data: z.array(logEntrySchema),
                }),
              ),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        403: jsonErrorResponse('User is not authorized'),
        422: validationErrorResponse,
      },
    }),
    async (c) => {
      const requestActor = c.get('requestActor')

      try {
        const actor = requireAuthenticatedActor(requestActor)
        requireSuperAdmin(actor)

        const query = c.req.valid('query')
        const page = query.page ?? 1
        const size = query.size ?? 25
        const offset = (page - 1) * size
        const filters = buildSuperAdminAuditLogFilters(query)
        const totalCount = await db.$count(auditLog, filters)
        const data = await db.query.auditLog.findMany({
          where: filters,
          orderBy: desc(auditLog.createdAt),
          limit: size,
          offset,
          with: {
            actorUser: {
              columns: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        })

        await persistAccessLog({
          actor,
          action: 'read',
          decision: 'allow',
          request: c.req.raw,
          resourceType: 'auditLog',
          resourceId: null,
          statusCode: 200,
          targetOrganizationId: null,
          details: {
            scope: 'super_admin',
          },
        })

        return generateJsonResponse(
          c,
          {
            pageCount: Math.ceil(totalCount / size),
            totalCount,
            data,
          },
          200,
        )
      } catch (error) {
        if (
          error instanceof ServerError &&
          shouldPersistDeniedDecisionLog(error.response.statusCode)
        ) {
          await persistAccessLog({
            actor: requestActor,
            action: 'read',
            decision: 'deny',
            request: c.req.raw,
            resourceType: 'auditLog',
            resourceId: null,
            statusCode: error.response.statusCode,
            targetOrganizationId: null,
            details: {
              scope: 'super_admin',
            },
          })
        }

        throw error
      }
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/audit',
      description: 'List organization-scoped audit logs.',
      middleware: [authMiddleware({ permission: 'read:auditLog' })],
      request: {
        query: logQuerySchema,
      },
      responses: {
        200: {
          description: 'List organization-scoped audit logs.',
          content: {
            'application/json': {
              schema: createResponseSchema(
                z.object({
                  pageCount: z.number().int(),
                  totalCount: z.number().int(),
                  data: z.array(logEntrySchema),
                }),
              ),
            },
          },
        },
        401: jsonErrorResponse('Unauthorized'),
        403: jsonErrorResponse('User is not authorized'),
        422: validationErrorResponse,
      },
    }),
    async (c) => {
      const query = c.req.valid('query')
      const { activeOrganizationId } = requireOwnedInsertContext(c)
      const page = query.page ?? 1
      const size = query.size ?? 25
      const offset = (page - 1) * size
      const filters = buildAuditLogFilters(activeOrganizationId, query)
      const totalCount = await db.$count(auditLog, filters)
      const data = await db.query.auditLog.findMany({
        where: filters,
        orderBy: desc(auditLog.createdAt),
        limit: size,
        offset,
        with: {
          actorUser: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })

      return generateJsonResponse(
        c,
        {
          pageCount: Math.ceil(totalCount / size),
          totalCount,
          data,
        },
        200,
      )
    },
  )

export default app
