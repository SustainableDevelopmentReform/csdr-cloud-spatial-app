'use client'

import { reportQuerySchema } from '@repo/schemas/crud'
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { InferRequestType, InferResponseType } from 'hono/client'
import { useParams, useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { z } from 'zod'
import { Client, unwrapResponse } from '~/utils/apiClient'
import { getSearchParams } from '~/utils/browser'
import { useApiClient } from '../../../hooks/useApiClient'
import { useQueryWithSearchParams } from '../../../hooks/useSearchParams'
import { REPORTS_BASE_PATH } from '../../../lib/paths'

export type ReportListItem = NonNullable<
  InferResponseType<Client['api']['v0']['report']['$get'], 200>['data']
>['data'][0]
export type ReportDetail = NonNullable<
  InferResponseType<Client['api']['v0']['report'][':id']['$get'], 200>['data']
>

export type UpdateReportPayload = NonNullable<
  InferRequestType<Client['api']['v0']['report'][':id']['$patch']>['json']
>

export type CreateReportPayload = NonNullable<
  InferRequestType<Client['api']['v0']['report']['$post']>['json']
>

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

  const queryResult = useQuery({
    queryKey: reportQueryKeys.list(query),
    queryFn: async () => {
      if (!query) return null
      const res = client.api.v0.report.$get({
        query,
      })

      const json = await unwrapResponse(res)

      return json.data
    },
    placeholderData: keepPreviousData,
    enabled: !!query,
  })

  return {
    ...queryResult,
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
    placeholderData: keepPreviousData,
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
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: reportQueryKeys.all,
      })
    },
  })
}

export const useUpdateReport = (_reportId?: string) => {
  const { reportId } = useReportParams(_reportId)
  const queryClient = useQueryClient()
  const client = useApiClient()
  return useMutation({
    mutationFn: async (payload: UpdateReportPayload) => {
      if (!reportId) return
      const res = client.api.v0.report[':id'].$patch({
        param: { id: reportId },
        json: payload,
      })
      return await unwrapResponse(res)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: reportQueryKeys.all,
      })
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
    onSuccess: () => {
      if (reportId) {
        queryClient.removeQueries({
          queryKey: reportQueryKeys.detail(reportId),
        })
      }
      queryClient.invalidateQueries({
        queryKey: reportQueryKeys.all,
      })
      if (redirect) {
        router.push(redirect)
      }
    },
  })
}

export type ReportLinkParams = Pick<ReportListItem, 'id' | 'name'>

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
