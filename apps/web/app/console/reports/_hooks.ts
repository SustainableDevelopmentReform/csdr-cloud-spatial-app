'use client'

import { reportQuerySchema } from '@repo/schemas/crud'
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { InferRequestType, InferResponseType } from 'hono/client'
import { useCallback } from 'react'
import { z } from 'zod'
import { Client, unwrapResponse } from '~/utils/apiClient'
import { useParams, useRouter } from 'next/navigation'
import { useApiClient } from '../../../hooks/useApiClient'
import { useQueryWithSearchParams } from '../../../hooks/useSearchParams'
import { getSearchParams } from '~/utils/browser'

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

const queryKeys = {
  reportAll: ['report'] as const,
  reportDetail: (reportId: string | undefined) =>
    [...queryKeys.reportAll, reportId] as const,
  reportList: (query: z.infer<typeof reportQuerySchema> | undefined) =>
    [...queryKeys.reportAll, { query }] as const,
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

  const { data } = useQuery({
    queryKey: queryKeys.reportList(query),
    queryFn: async () => {
      if (!query) return null
      const res = client.api.v0.report.$get({
        query,
      })

      const json = await unwrapResponse(res)

      return json.data
    },
    placeholderData: keepPreviousData,
  })

  return {
    data,
    query,
    setSearchParams,
  }
}

export const useReport = (id?: string) => {
  const { reportId } = useReportParams(id)
  const client = useApiClient()
  return useQuery({
    queryKey: queryKeys.reportDetail(reportId),
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
        queryKey: queryKeys.reportAll,
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
        queryKey: queryKeys.reportAll,
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
      queryClient.invalidateQueries({
        queryKey: queryKeys.reportAll,
      })
      if (redirect) {
        router.push(redirect)
      }
    },
  })
}

export type ReportLinkParams = Pick<ReportListItem, 'id' | 'name'>

export const REPORTS_BASE_PATH = '/console/reports'

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
