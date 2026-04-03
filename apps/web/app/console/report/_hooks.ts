'use client'

import {
  createReportSchema,
  reportQuerySchema,
  updateReportSchema,
} from '@repo/schemas/crud'
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { InferRequestType, InferResponseType } from 'hono/client'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useMemo } from 'react'
import { z } from 'zod'
import { Client, unwrapResponse } from '~/utils/apiClient'
import { getSearchParams } from '~/utils/browser'
import { useApiClient } from '../../../hooks/useApiClient'
import { mergePaginatedInfiniteData } from '../../../hooks/mergePaginatedInfiniteData'
import { useQueryWithSearchParams } from '../../../hooks/useSearchParams'
import { REPORTS_BASE_PATH } from '../../../lib/paths'
import {
  ResourceVisibility,
  VisibilityImpact,
} from '../../../utils/access-control'
import { invalidateChartUsageDependencyQueries } from '../_utils/chart-usage-invalidation'

export type ReportListResponse = NonNullable<
  InferResponseType<Client['api']['v0']['report']['$get'], 200>['data']
>
export type ReportListItem = ReportListResponse['data'][0]
export type ReportDetail = NonNullable<
  InferResponseType<Client['api']['v0']['report'][':id']['$get'], 200>['data']
>

export type UpdateReportPayload = z.infer<typeof updateReportSchema>
export type UpdateReportVisibilityPayload = NonNullable<
  InferRequestType<
    Client['api']['v0']['report'][':id']['visibility']['$patch']
  >['json']
>

export type CreateReportPayload = z.infer<typeof createReportSchema>

const reportParamsSchema = z.object({
  reportId: z.string().optional(),
})

const reportQueryKeys = {
  all: ['report'] as const,
  list: (query: z.infer<typeof reportQuerySchema> | undefined) =>
    [...reportQueryKeys.all, 'list', { query }] as const,
  detail: (reportId: string | undefined) =>
    [...reportQueryKeys.all, 'detail', reportId] as const,
}

const useReportParams = (_reportId?: string) => {
  const params = useParams()
  const { reportId } = reportParamsSchema.parse(params)

  return {
    reportId: _reportId ?? reportId,
  }
}

export const useReports = (
  _query?: z.infer<typeof reportQuerySchema>,
  useSearchParams?: boolean,
) => {
  const client = useApiClient()

  const { query, setSearchParams } = useQueryWithSearchParams(
    reportQuerySchema,
    _query,
    useSearchParams,
  )

  const queryResult = useInfiniteQuery<ReportListResponse>({
    queryKey: reportQueryKeys.list(query),
    queryFn: async ({ pageParam = 1 }) => {
      const res = client.api.v0.report.$get({
        query: {
          ...query,
          page: pageParam,
        },
      })

      const json = await unwrapResponse(res)

      return json.data
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage) return undefined
      const nextPage = allPages.length + 1
      return nextPage <= lastPage.pageCount ? nextPage : undefined
    },
  })

  const aggregatedData = useMemo(
    () => mergePaginatedInfiniteData(queryResult.data),
    [queryResult.data],
  )

  return {
    ...queryResult,
    data: aggregatedData,
    query,

    setSearchParams,
  }
}

export const useReport = (id?: string) => {
  const { reportId } = useReportParams(id)
  const client = useApiClient()
  return useQuery({
    queryKey: reportQueryKeys.detail(reportId),
    queryFn: async () => {
      if (!reportId) return null
      const res = client.api.v0.report[':id'].$get({
        param: {
          id: reportId,
        },
      })

      const json = await unwrapResponse(res)

      return json.data
    },

    enabled: !!reportId,
  })
}

export const useCreateReport = () => {
  const queryClient = useQueryClient()
  const client = useApiClient()
  return useMutation({
    mutationFn: async (data: CreateReportPayload) => {
      const res = client.api.v0.report.$post({
        json: data,
      })
      await unwrapResponse(res, 201)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: reportQueryKeys.all,
      })
      await invalidateChartUsageDependencyQueries(queryClient)
    },
  })
}

export const useUpdateReport = (_reportId?: string) => {
  const { reportId } = useReportParams(_reportId)
  const queryClient = useQueryClient()
  const client = useApiClient()
  return useMutation({
    meta: {
      suppressGlobalErrorToast: true,
    },
    mutationFn: async (payload: UpdateReportPayload) => {
      if (!reportId) return
      const res = client.api.v0.report[':id'].$patch({
        param: { id: reportId },
        json: payload,
      })
      return await unwrapResponse(res)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: reportQueryKeys.all,
      })
      await invalidateChartUsageDependencyQueries(queryClient)
    },
  })
}

export const useUpdateReportVisibility = (_reportId?: string) => {
  const { reportId } = useReportParams(_reportId)
  const queryClient = useQueryClient()
  const client = useApiClient()
  return useMutation({
    mutationFn: async (payload: UpdateReportVisibilityPayload) => {
      if (!reportId) return
      const res = client.api.v0.report[':id'].visibility.$patch({
        param: { id: reportId },
        json: payload,
      })
      return await unwrapResponse(res)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: reportQueryKeys.all,
      })
      await invalidateChartUsageDependencyQueries(queryClient)
    },
  })
}

export const usePreviewReportVisibility = (_reportId?: string) => {
  const { reportId } = useReportParams(_reportId)
  const client = useApiClient()
  return useMutation<
    VisibilityImpact | null,
    Error,
    { visibility: ResourceVisibility }
  >({
    mutationFn: async (payload) => {
      if (!reportId) {
        return null
      }

      const res = client.api.v0.report[':id']['visibility-impact'].$get({
        param: {
          id: reportId,
        },
        query: {
          targetVisibility: payload.visibility,
        },
      })

      const json = await unwrapResponse(res)
      return json.data
    },
  })
}

export const useDeleteReport = (
  _reportId?: string,
  redirect: string | null = null,
) => {
  const { reportId } = useReportParams(_reportId)
  const queryClient = useQueryClient()
  const router = useRouter()
  const client = useApiClient()
  return useMutation({
    mutationFn: async () => {
      if (!reportId) return
      const res = client.api.v0.report[':id'].$delete({
        param: {
          id: reportId,
        },
      })

      return await unwrapResponse(res)
    },
    onSuccess: async () => {
      if (reportId) {
        queryClient.removeQueries({
          queryKey: reportQueryKeys.detail(reportId),
        })
      }
      await queryClient.invalidateQueries({
        queryKey: reportQueryKeys.all,
      })
      await invalidateChartUsageDependencyQueries(queryClient)
      if (redirect) {
        router.push(redirect)
      }
    },
  })
}

export type ReportLinkParams = Pick<ReportListItem, 'id' | 'name'> & {
  visibility?: ResourceVisibility | null
}

export const useReportsLink = () =>
  useCallback(
    (query?: z.infer<typeof reportQuerySchema>) =>
      `${REPORTS_BASE_PATH}?${getSearchParams(query ?? {})}`,
    [],
  )

export const useReportLink = () =>
  useCallback(
    (report: ReportLinkParams) => `${REPORTS_BASE_PATH}/${report.id}`,
    [],
  )
