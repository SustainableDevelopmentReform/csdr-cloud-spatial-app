import { z } from '@hono/zod-openapi'

export const auditLogQuerySchema = z.object({
  page: z.coerce.number().positive().optional(),
  size: z.coerce.number().positive().optional(),
  resourceType: z.string().optional(),
  action: z.string().optional(),
  search: z.string().optional(),
  decision: z.enum(['allow', 'deny']).optional(),
  requestKind: z.enum(['mutating', 'read']).optional(),
  sort: z.enum(['createdAt', 'action', 'resourceType']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
})

export const auditLogEntrySchema = z.object({
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
  details: z.unknown().nullable(),
})

export const auditLogListResponseSchema = z.object({
  pageCount: z.number().int(),
  totalCount: z.number().int(),
  data: z.array(auditLogEntrySchema),
})

export const auditLogResponseSchema = z.object({
  data: auditLogListResponseSchema,
})

export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>
export type AuditLogListResponse = z.infer<typeof auditLogListResponseSchema>
export type AuditLogEntry = AuditLogListResponse['data'][number]
