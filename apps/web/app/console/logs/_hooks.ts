'use client'

import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { useConfig } from '~/components/providers'
import { useApiClient } from '~/hooks/useApiClient'
import { unwrapResponse } from '~/utils/apiClient'

export const logPageQuerySchema = z.object({
  action: z.string().optional(),
  decision: z.enum(['allow', 'deny']).optional(),
  page: z.coerce.number().positive().optional(),
  resourceType: z.string().optional(),
  requestKind: z.enum(['mutating', 'read']).optional(),
  size: z.coerce.number().positive().optional(),
})

export type LogPageQuery = z.infer<typeof logPageQuerySchema>

const logEntrySchema = z.object({
  id: z.string(),
  createdAt: z.string(),
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

const logListResponseSchema = z.object({
  pageCount: z.number().int(),
  totalCount: z.number().int(),
  data: z.array(logEntrySchema),
})

const logResponseSchema = z.object({
  data: logListResponseSchema,
})

const errorResponseSchema = z.object({
  message: z.string().optional(),
})

export type LogListResponse = z.infer<typeof logListResponseSchema>
export type LogEntry = LogListResponse['data'][number]

const logQueryKeys = {
  audit: (organizationId: string | null, query: LogPageQuery | undefined) =>
    ['logs', 'audit', organizationId, query] as const,
  superAdminAudit: (query: LogPageQuery | undefined) =>
    ['logs', 'audit', 'super-admin', query] as const,
}

const toLogRouteQuery = (query: LogPageQuery | undefined) => ({
  action: query?.action,
  decision: query?.decision,
  page: query?.page,
  resourceType: query?.resourceType,
  requestKind: query?.requestKind,
  size: query?.size,
})

const toLogSearchParams = (query: LogPageQuery | undefined): string => {
  const routeQuery = toLogRouteQuery(query)
  const searchParams = new URLSearchParams()

  if (routeQuery.action) {
    searchParams.set('action', routeQuery.action)
  }

  if (routeQuery.decision) {
    searchParams.set('decision', routeQuery.decision)
  }

  if (routeQuery.page) {
    searchParams.set('page', String(routeQuery.page))
  }

  if (routeQuery.resourceType) {
    searchParams.set('resourceType', routeQuery.resourceType)
  }

  if (routeQuery.requestKind) {
    searchParams.set('requestKind', routeQuery.requestKind)
  }

  if (routeQuery.size) {
    searchParams.set('size', String(routeQuery.size))
  }

  return searchParams.toString()
}

export const useAuditLogs = (
  organizationId: string | null,
  query: LogPageQuery | undefined,
  enabled = true,
) => {
  const client = useApiClient()

  return useQuery({
    queryKey: logQueryKeys.audit(organizationId, query),
    queryFn: async () => {
      const response = await unwrapResponse(
        client.api.v0.logs.audit.$get({
          query: toLogRouteQuery(query),
        }),
      )

      return logListResponseSchema.parse(response.data)
    },
    enabled,
  })
}

export const useSuperAdminAuditLogs = (
  query: LogPageQuery | undefined,
  enabled = true,
) => {
  const { apiBaseUrl } = useConfig()

  return useQuery({
    queryKey: logQueryKeys.superAdminAudit(query),
    queryFn: async () => {
      const searchParams = toLogSearchParams(query)
      const url = new URL('/api/v0/logs/audit/super-admin', apiBaseUrl)
      url.search = searchParams
      const response = await fetch(url, {
        credentials: 'include',
      })
      const payload: unknown = await response.json()

      if (!response.ok) {
        const parsedError = errorResponseSchema.safeParse(payload)

        throw new Error(
          parsedError.success
            ? (parsedError.data.message ?? 'Request failed')
            : 'Request failed',
        )
      }

      return logResponseSchema.parse(payload).data
    },
    enabled,
  })
}
