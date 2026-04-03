'use client'

import { useQuery } from '@tanstack/react-query'
import { InferResponseType } from 'hono/client'
import { z } from 'zod'
import { useApiClient } from '~/hooks/useApiClient'
import { Client, unwrapResponse } from '~/utils/apiClient'

export const logPageQuerySchema = z.object({
  action: z.string().optional(),
  decision: z.enum(['allow', 'deny']).optional(),
  page: z.coerce.number().positive().optional(),
  resourceType: z.string().optional(),
  size: z.coerce.number().positive().optional(),
  tab: z.enum(['audit', 'read']).optional(),
})

export type LogPageQuery = z.infer<typeof logPageQuerySchema>

export type LogListResponse = NonNullable<
  InferResponseType<Client['api']['v0']['logs']['audit']['$get'], 200>['data']
>
export type LogEntry = LogListResponse['data'][number]

const logQueryKeys = {
  audit: (organizationId: string | null, query: LogPageQuery | undefined) =>
    ['logs', 'audit', organizationId, query] as const,
  read: (organizationId: string | null, query: LogPageQuery | undefined) =>
    ['logs', 'read', organizationId, query] as const,
}

const toLogRouteQuery = (query: LogPageQuery | undefined) => ({
  action: query?.action,
  decision: query?.decision,
  page: query?.page,
  resourceType: query?.resourceType,
  size: query?.size,
})

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

      return response.data
    },
    enabled,
  })
}

export const useReadLogs = (
  organizationId: string | null,
  query: LogPageQuery | undefined,
  enabled = true,
) => {
  const client = useApiClient()

  return useQuery({
    queryKey: logQueryKeys.read(organizationId, query),
    queryFn: async () => {
      const response = await unwrapResponse(
        client.api.v0.logs.read.$get({
          query: toLogRouteQuery(query),
        }),
      )

      return response.data
    },
    enabled,
  })
}
