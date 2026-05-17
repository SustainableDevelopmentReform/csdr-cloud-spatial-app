'use client'

import {
  auditLogListResponseSchema,
  auditLogQuerySchema,
  auditLogResponseSchema,
  type AuditLogEntry,
  type AuditLogListResponse,
  type AuditLogQuery,
} from '@repo/schemas/audit-log'
import { useInfiniteQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { useConfig } from '~/components/providers'
import {
  getNextPaginatedPageParam,
  useMergedPaginatedInfiniteData,
} from '~/hooks/merge-paginated-infinite-data'
import { useApiClient } from '~/hooks/use-api-client'
import { unwrapResponse } from '~/utils/api-client'

const errorResponseSchema = z.object({
  message: z.string().optional(),
})

export const logPageQuerySchema = auditLogQuerySchema

export type LogPageQuery = AuditLogQuery
export type LogListResponse = AuditLogListResponse
export type LogEntry = AuditLogEntry

const logQueryKeys = {
  audit: (organizationId: string | null, query: LogPageQuery | undefined) =>
    ['logs', 'audit', organizationId, query] as const,
  superAdminAudit: (query: LogPageQuery | undefined) =>
    ['logs', 'audit', 'super-admin', query] as const,
}

const toLogListQuery = (
  query: LogPageQuery | undefined,
): LogPageQuery | undefined => {
  if (!query) {
    return undefined
  }

  return {
    decision: query.decision,
    requestKind: query.requestKind,
    search: query.search,
    size: query.size,
  }
}

const toLogRouteQuery = (
  query: LogPageQuery | undefined,
  page: number | undefined = query?.page,
) => ({
  decision: query?.decision,
  page,
  requestKind: query?.requestKind,
  search: query?.search,
  size: query?.size,
})

const toLogSearchParams = (query: LogPageQuery | undefined): string => {
  const routeQuery = toLogRouteQuery(query)
  const searchParams = new URLSearchParams()

  if (routeQuery.decision) {
    searchParams.set('decision', routeQuery.decision)
  }

  if (routeQuery.page) {
    searchParams.set('page', String(routeQuery.page))
  }

  if (routeQuery.requestKind) {
    searchParams.set('requestKind', routeQuery.requestKind)
  }

  if (routeQuery.search) {
    searchParams.set('search', routeQuery.search)
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
  const listQuery = toLogListQuery(query)

  const queryResult = useInfiniteQuery<LogListResponse>({
    queryKey: logQueryKeys.audit(organizationId, listQuery),
    queryFn: async ({ pageParam = 1 }) => {
      const response = await unwrapResponse(
        client.api.v0.logs.audit.$get({
          query: toLogRouteQuery(listQuery, Number(pageParam)),
        }),
      )

      return auditLogListResponseSchema.parse(response.data)
    },
    initialPageParam: 1,
    getNextPageParam: getNextPaginatedPageParam,
    enabled,
  })

  const aggregatedData = useMergedPaginatedInfiniteData(queryResult.data)

  return {
    ...queryResult,
    data: aggregatedData,
  }
}

export const useSuperAdminAuditLogs = (
  query: LogPageQuery | undefined,
  enabled = true,
) => {
  const { apiBaseUrl } = useConfig()
  const listQuery = toLogListQuery(query)

  const queryResult = useInfiniteQuery<LogListResponse>({
    queryKey: logQueryKeys.superAdminAudit(listQuery),
    queryFn: async ({ pageParam = 1 }) => {
      const searchParams = toLogSearchParams({
        ...listQuery,
        page: Number(pageParam),
      })
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

      return auditLogResponseSchema.parse(payload).data
    },
    initialPageParam: 1,
    getNextPageParam: getNextPaginatedPageParam,
    enabled,
  })

  const aggregatedData = useMergedPaginatedInfiniteData(queryResult.data)

  return {
    ...queryResult,
    data: aggregatedData,
  }
}
