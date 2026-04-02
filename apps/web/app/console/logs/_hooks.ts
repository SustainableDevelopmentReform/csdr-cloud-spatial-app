'use client'

import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { useConfig } from '~/components/providers'

export const logPageQuerySchema = z.object({
  action: z.string().optional(),
  decision: z.enum(['allow', 'deny']).optional(),
  page: z.coerce.number().positive().optional(),
  resourceType: z.string().optional(),
  size: z.coerce.number().positive().optional(),
  tab: z.enum(['audit', 'read']).optional(),
})

export type LogPageQuery = z.infer<typeof logPageQuerySchema>

const logEntrySchema = z.object({
  action: z.string(),
  activeOrganizationId: z.string().nullable(),
  actorRole: z.string().nullable(),
  actorUserId: z.string().nullable(),
  createdAt: z.string(),
  decision: z.string(),
  details: z.unknown().nullable(),
  id: z.string(),
  ipAddress: z.string().nullable(),
  requestMethod: z.string(),
  requestPath: z.string(),
  resourceId: z.string().nullable(),
  resourceType: z.string(),
  targetOrganizationId: z.string().nullable(),
  userAgent: z.string().nullable(),
})

const logListResponseSchema = z.object({
  data: z.array(logEntrySchema),
  pageCount: z.number().int(),
  totalCount: z.number().int(),
})

export type LogEntry = z.infer<typeof logEntrySchema>
export type LogListResponse = z.infer<typeof logListResponseSchema>

const logQueryKeys = {
  audit: (organizationId: string | null, query: LogPageQuery | undefined) =>
    ['logs', 'audit', organizationId, query] as const,
  read: (organizationId: string | null, query: LogPageQuery | undefined) =>
    ['logs', 'read', organizationId, query] as const,
}

const readErrorMessage = async (response: Response) => {
  const payload = await response.json().catch(() => null)

  if (
    payload &&
    typeof payload === 'object' &&
    'message' in payload &&
    typeof payload.message === 'string'
  ) {
    return payload.message
  }

  return 'Request failed'
}

const requestLogEndpoint = async (options: {
  apiBaseUrl: string
  path: '/api/v0/logs/audit' | '/api/v0/logs/read'
  query: LogPageQuery | undefined
}) => {
  const searchParams = new URLSearchParams()

  if (options.query?.action) {
    searchParams.set('action', options.query.action)
  }
  if (options.query?.decision) {
    searchParams.set('decision', options.query.decision)
  }
  if (options.query?.page) {
    searchParams.set('page', String(options.query.page))
  }
  if (options.query?.resourceType) {
    searchParams.set('resourceType', options.query.resourceType)
  }
  if (options.query?.size) {
    searchParams.set('size', String(options.query.size))
  }

  const queryString = searchParams.toString()
  const response = await fetch(
    `${options.apiBaseUrl}${options.path}${queryString ? `?${queryString}` : ''}`,
    {
      credentials: 'include',
    },
  )

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  const payload = await response.json()
  const parsed = z
    .object({
      data: logListResponseSchema,
    })
    .parse(payload)

  return parsed.data
}

export const useAuditLogs = (
  organizationId: string | null,
  query: LogPageQuery | undefined,
  enabled = true,
) => {
  const { apiBaseUrl } = useConfig()

  return useQuery({
    queryKey: logQueryKeys.audit(organizationId, query),
    queryFn: () =>
      requestLogEndpoint({
        apiBaseUrl,
        path: '/api/v0/logs/audit',
        query,
      }),
    enabled,
  })
}

export const useReadLogs = (
  organizationId: string | null,
  query: LogPageQuery | undefined,
  enabled = true,
) => {
  const { apiBaseUrl } = useConfig()

  return useQuery({
    queryKey: logQueryKeys.read(organizationId, query),
    queryFn: () =>
      requestLogEndpoint({
        apiBaseUrl,
        path: '/api/v0/logs/read',
        query,
      }),
    enabled,
  })
}
