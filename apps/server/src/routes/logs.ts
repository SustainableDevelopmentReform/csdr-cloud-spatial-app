import { createRoute, z } from '@hono/zod-openapi'
import { and, desc, eq } from 'drizzle-orm'
import { authMiddleware } from '~/middlewares/auth'
import { db } from '~/lib/db'
import {
  createOpenAPIApp,
  createResponseSchema,
  jsonErrorResponse,
  validationErrorResponse,
} from '~/lib/openapi'
import { generateJsonResponse } from '~/lib/response'
import { auditLog, readLog } from '~/schemas/db'
import { requireOwnedInsertContext } from '~/lib/authorization'

const logQuerySchema = z.object({
  page: z.coerce.number().positive().optional(),
  size: z.coerce.number().positive().optional(),
  resourceType: z.string().optional(),
  action: z.string().optional(),
  decision: z.enum(['allow', 'deny']).optional(),
})

const logEntrySchema = z.object({
  id: z.string(),
  createdAt: z.iso.datetime(),
  actorUserId: z.string().nullable(),
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
    eq(auditLog.targetOrganizationId, organizationId),
    query.resourceType
      ? eq(auditLog.resourceType, query.resourceType)
      : undefined,
    query.action ? eq(auditLog.action, query.action) : undefined,
    query.decision ? eq(auditLog.decision, query.decision) : undefined,
  )

const buildReadLogFilters = (
  organizationId: string,
  query: z.infer<typeof logQuerySchema>,
) =>
  and(
    eq(readLog.targetOrganizationId, organizationId),
    query.resourceType
      ? eq(readLog.resourceType, query.resourceType)
      : undefined,
    query.action ? eq(readLog.action, query.action) : undefined,
    query.decision ? eq(readLog.decision, query.decision) : undefined,
  )

const app = createOpenAPIApp()
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
  .openapi(
    createRoute({
      method: 'get',
      path: '/read',
      description: 'List organization-scoped read logs.',
      middleware: [authMiddleware({ permission: 'read:readLog' })],
      request: {
        query: logQuerySchema,
      },
      responses: {
        200: {
          description: 'List organization-scoped read logs.',
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
      const filters = buildReadLogFilters(activeOrganizationId, query)
      const totalCount = await db.$count(readLog, filters)
      const data = await db.query.readLog.findMany({
        where: filters,
        orderBy: desc(readLog.createdAt),
        limit: size,
        offset,
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
