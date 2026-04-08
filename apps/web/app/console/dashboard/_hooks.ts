'use client'

import { dashboardQuerySchema } from '@repo/schemas/crud'
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
import { DASHBOARDS_BASE_PATH } from '../../../lib/paths'
import {
  ResourceVisibility,
  VisibilityImpact,
} from '../../../utils/access-control'
import { invalidateChartUsageDependencyQueries } from '../_utils/chart-usage-invalidation'

export type DashboardListResponse = NonNullable<
  InferResponseType<Client['api']['v0']['dashboard']['$get'], 200>['data']
>
export type DashboardListItem = DashboardListResponse['data'][0]

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
export type UpdateDashboardVisibilityPayload = NonNullable<
  InferRequestType<
    Client['api']['v0']['dashboard'][':id']['visibility']['$patch']
  >['json']
>

const dashboardParamsSchema = z.object({
  dashboardId: z.string().optional(),
})

const dashboardQueryKeys = {
  all: ['dashboard'] as const,
  list: (query: z.infer<typeof dashboardQuerySchema> | undefined) =>
    [...dashboardQueryKeys.all, 'list', { query }] as const,
  detail: (dashboardId: string | undefined) =>
    [...dashboardQueryKeys.all, 'detail', dashboardId] as const,
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

  const queryResult = useInfiniteQuery<DashboardListResponse>({
    queryKey: dashboardQueryKeys.list(query),
    queryFn: async ({ pageParam = 1 }) => {
      const res = client.api.v0.dashboard.$get({
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

export const useDashboard = (id?: string) => {
  const { dashboardId } = useDashboardParams(id)
  const client = useApiClient()

  return useQuery({
    queryKey: dashboardQueryKeys.detail(dashboardId),
    queryFn: async () => {
      if (!dashboardId) return null
      const res = client.api.v0.dashboard[':id'].$get({
        param: { id: dashboardId },
      })
      const json = await unwrapResponse(res)
      return json.data
    },
    enabled: !!dashboardId,
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all })
      await invalidateChartUsageDependencyQueries(queryClient)
    },
  })
}

export const useUpdateDashboard = (_dashboardId?: string) => {
  const { dashboardId } = useDashboardParams(_dashboardId)
  const queryClient = useQueryClient()
  const client = useApiClient()

  return useMutation({
    meta: {
      suppressGlobalErrorToast: true,
    },
    mutationFn: async (payload: UpdateDashboardPayload) => {
      if (!dashboardId) return
      const res = client.api.v0.dashboard[':id'].$patch({
        param: { id: dashboardId },
        json: payload,
      })
      return await unwrapResponse(res)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all })
      await invalidateChartUsageDependencyQueries(queryClient)
    },
  })
}

export const useUpdateDashboardVisibility = (_dashboardId?: string) => {
  const { dashboardId } = useDashboardParams(_dashboardId)
  const queryClient = useQueryClient()
  const client = useApiClient()

  return useMutation({
    mutationFn: async (payload: UpdateDashboardVisibilityPayload) => {
      if (!dashboardId) return
      const res = client.api.v0.dashboard[':id'].visibility.$patch({
        param: { id: dashboardId },
        json: payload,
      })
      return await unwrapResponse(res)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all })
      await invalidateChartUsageDependencyQueries(queryClient)
    },
  })
}

export const useDuplicateDashboard = (_dashboardId?: string) => {
  const { dashboardId } = useDashboardParams(_dashboardId)
  const queryClient = useQueryClient()
  const client = useApiClient()

  return useMutation({
    meta: {
      suppressGlobalErrorToast: true,
    },
    mutationFn: async () => {
      if (!dashboardId) {
        return null
      }

      const res = client.api.v0.dashboard[':id'].duplicate.$post({
        param: {
          id: dashboardId,
        },
      })

      const json = await unwrapResponse(res, 201)
      return json.data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all })
      await invalidateChartUsageDependencyQueries(queryClient)
    },
  })
}

export const usePreviewDashboardVisibility = (_dashboardId?: string) => {
  const { dashboardId } = useDashboardParams(_dashboardId)
  const client = useApiClient()
  return useMutation<
    VisibilityImpact | null,
    Error,
    { visibility: ResourceVisibility }
  >({
    mutationFn: async (payload) => {
      if (!dashboardId) {
        return null
      }

      const res = client.api.v0.dashboard[':id']['visibility-impact'].$get({
        param: {
          id: dashboardId,
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
    onSuccess: async () => {
      if (dashboardId) {
        queryClient.removeQueries({
          queryKey: dashboardQueryKeys.detail(dashboardId),
        })
      }
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all })
      await invalidateChartUsageDependencyQueries(queryClient)
      if (redirect) {
        router.push(redirect)
      }
    },
  })
}

export type DashboardLinkParams = Pick<DashboardListItem, 'id' | 'name'> & {
  visibility?: ResourceVisibility | null
}

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
