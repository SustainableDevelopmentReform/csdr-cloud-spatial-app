'use client'

import { dashboardQuerySchema } from '@repo/schemas/crud'
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

export type DashboardListItem = NonNullable<
  InferResponseType<Client['api']['v0']['dashboard']['$get'], 200>['data']
>['data'][0]

export type DashboardDetail = NonNullable<
  InferResponseType<
    Client['api']['v0']['dashboard'][':id']['$get'],
    200
  >['data']
>

export type CreateDashboardPayload = NonNullable<
  InferRequestType<Client['api']['v0']['dashboard']['$post']>['json']
>

export type UpdateDashboardPayload = NonNullable<
  InferRequestType<Client['api']['v0']['dashboard'][':id']['$patch']>['json']
>

const dashboardParamsSchema = z.object({
  dashboardId: z.string().optional(),
})

const queryKeys = {
  dashboardAll: ['dashboard'] as const,
  dashboardDetail: (dashboardId: string | undefined) =>
    [...queryKeys.dashboardAll, dashboardId] as const,
  dashboardList: (query: z.infer<typeof dashboardQuerySchema> | undefined) =>
    [...queryKeys.dashboardAll, { query }] as const,
}

const useDashboardParams = (_dashboardId?: string) => {
  const params = useParams()
  const { dashboardId } = dashboardParamsSchema.parse(params)

  return {
    dashboardId: _dashboardId ?? dashboardId,
  }
}

export const useDashboards = (
  _query?: z.infer<typeof dashboardQuerySchema>,
  useSearchParams?: boolean,
) => {
  const client = useApiClient()

  const { query, setSearchParams } = useQueryWithSearchParams(
    dashboardQuerySchema,
    _query,
    useSearchParams,
  )

  const { data } = useQuery({
    queryKey: queryKeys.dashboardList(query),
    queryFn: async () => {
      if (!query) return null
      const res = client.api.v0.dashboard.$get({ query })
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

export const useDashboard = (id?: string) => {
  const { dashboardId } = useDashboardParams(id)
  const client = useApiClient()

  return useQuery({
    queryKey: queryKeys.dashboardDetail(dashboardId),
    queryFn: async () => {
      if (!dashboardId) return null
      const res = client.api.v0.dashboard[':id'].$get({
        param: { id: dashboardId },
      })
      const json = await unwrapResponse(res)
      return json.data
    },
    placeholderData: keepPreviousData,
  })
}

export const useCreateDashboard = () => {
  const queryClient = useQueryClient()
  const client = useApiClient()

  return useMutation({
    mutationFn: async (payload: CreateDashboardPayload) => {
      const res = client.api.v0.dashboard.$post({
        json: payload,
      })
      await unwrapResponse(res, 201)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardAll })
    },
  })
}

export const useUpdateDashboard = (_dashboardId?: string) => {
  const { dashboardId } = useDashboardParams(_dashboardId)
  const queryClient = useQueryClient()
  const client = useApiClient()

  return useMutation({
    mutationFn: async (payload: UpdateDashboardPayload) => {
      if (!dashboardId) return
      const res = client.api.v0.dashboard[':id'].$patch({
        param: { id: dashboardId },
        json: payload,
      })
      return await unwrapResponse(res)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardAll })
    },
  })
}

export const useDeleteDashboard = (
  _dashboardId?: string,
  redirect: string | null = null,
) => {
  const { dashboardId } = useDashboardParams(_dashboardId)
  const queryClient = useQueryClient()
  const router = useRouter()
  const client = useApiClient()

  return useMutation({
    mutationFn: async () => {
      if (!dashboardId) return
      const res = client.api.v0.dashboard[':id'].$delete({
        param: { id: dashboardId },
      })
      return await unwrapResponse(res)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardAll })
      if (redirect) {
        router.push(redirect)
      }
    },
  })
}

export type DashboardLinkParams = Pick<DashboardListItem, 'id' | 'name'>

export const DASHBOARDS_BASE_PATH = '/console/dashboards'

export const useDashboardsLink = () =>
  useCallback(
    (query?: z.infer<typeof dashboardQuerySchema>) =>
      `${DASHBOARDS_BASE_PATH}?${getSearchParams(query ?? {})}`,
    [],
  )

export const useDashboardLink = () =>
  useCallback(
    (dashboard: DashboardLinkParams) =>
      `${DASHBOARDS_BASE_PATH}/${dashboard.id}`,
    [],
  )
