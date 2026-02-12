'use client'

import { workflowsQuerySchema } from '@repo/schemas/crud'
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
import { WORKFLOWS_BASE_PATH } from '../../../lib/paths'
import { useAuthClient } from '~/hooks/useAuthClient'

export type WorkflowsListResponse = NonNullable<
  InferResponseType<Client['api']['v0']['workflows']['$get'], 200>['data']
>
export type WorkflowsListItem = WorkflowsListResponse['data'][0]
export type WorkflowsDetail = NonNullable<
  InferResponseType<
    Client['api']['v0']['workflows'][':id']['$get'],
    200
  >['data']
>

export type UpdateWorkflowsPayload = NonNullable<
  InferRequestType<Client['api']['v0']['workflows'][':id']['$patch']>['json']
>

export type CreateWorkflowsPayload = NonNullable<
  InferRequestType<Client['api']['v0']['workflows']['$post']>['json']
>

const workflowsParamsSchema = z.object({
  workflowsId: z.string().optional(),
})

export const workflowsQueryKeys = {
  all: ['workflows'] as const,
  list: (query: z.infer<typeof workflowsQuerySchema> | undefined) =>
    [...workflowsQueryKeys.all, 'list', { query }] as const,
  detail: (workflowsId: string | undefined) =>
    [...workflowsQueryKeys.all, 'detail', workflowsId] as const,
}

export const useWorkflowsParams = (_workflowsId?: string) => {
  const params = useParams()
  const { workflowsId } = workflowsParamsSchema.parse(params)

  return {
    workflowsId: _workflowsId ?? workflowsId,
  }
}

export const useAllWorkflows = (
  _query?: z.infer<typeof workflowsQuerySchema>,
  useSearchParams?: boolean,
) => {
  const authClient = useAuthClient()
  const { data } = authClient.useSession()
  const user = data?.user
  const userId = user?.id
  const client = useApiClient()
  const { query, setSearchParams } = useQueryWithSearchParams(
    workflowsQuerySchema,
    _query,
    useSearchParams,
  )

  const queryResult = useInfiniteQuery<WorkflowsListResponse>({
    queryKey: workflowsQueryKeys.list(query),
    queryFn: async ({ pageParam = 1 }) => {
      if (!userId) {
        return {
          data: [],
          pageCount: 0,
          totalCount: 0,
          error: {
            status: 500,
            message: 'Missing userId',
          },
        }
      }
      const res = client.api.v0.workflows.$get({
        query: {
          ...query,
          userId,
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
    enabled: !!userId,
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

export const useWorkflows = (
  _workflowsId?: string,
  enabled: boolean = true,
) => {
  const { workflowsId } = useWorkflowsParams(_workflowsId)
  const client = useApiClient()
  return useQuery({
    queryKey: workflowsQueryKeys.detail(workflowsId),
    queryFn: async () => {
      if (!workflowsId) return null
      const res = client.api.v0.workflows[':id'].$get({
        param: {
          id: workflowsId,
        },
      })

      const json = await unwrapResponse(res)

      return json.data
    },
    enabled: enabled ?? !!workflowsId,
  })
}

export const useCreateWorkflows = () => {
  const queryClient = useQueryClient()
  const client = useApiClient()
  return useMutation({
    mutationFn: async (data: CreateWorkflowsPayload) => {
      const res = client.api.v0.workflows.$post({
        json: data,
      })
      await unwrapResponse(res, 201)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workflowsQueryKeys.all,
      })
    },
  })
}

export const useUpdateWorkflows = (_workflowsId?: string) => {
  const { workflowsId } = useWorkflowsParams(_workflowsId)
  const queryClient = useQueryClient()
  const client = useApiClient()
  return useMutation({
    mutationFn: async (payload: UpdateWorkflowsPayload) => {
      if (!workflowsId) return
      const res = client.api.v0.workflows[':id'].$patch({
        param: { id: workflowsId },
        json: payload,
      })
      return await unwrapResponse(res)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workflowsQueryKeys.all,
      })
    },
  })
}

export const useDeleteWorkflows = (
  _workflowsId?: string,
  redirect: string | null = null,
) => {
  const { workflowsId } = useWorkflowsParams(_workflowsId)
  const queryClient = useQueryClient()
  const router = useRouter()
  const client = useApiClient()
  return useMutation({
    mutationFn: async () => {
      if (!workflowsId) return
      const res = client.api.v0.workflows[':id'].$delete({
        param: {
          id: workflowsId,
        },
      })

      return await unwrapResponse(res)
    },
    onSuccess: (response) => {
      queryClient.removeQueries({
        queryKey: workflowsQueryKeys.detail(response?.data?.id),
      })

      queryClient.invalidateQueries({
        queryKey: workflowsQueryKeys.all,
      })

      if (redirect) {
        router.push(redirect)
      }
    },
  })
}

export type WorkflowsLinkParams = Pick<WorkflowsListItem, 'id' | 'name'>

export const useAllWorkflowsLink = () =>
  useCallback(
    (query?: z.infer<typeof workflowsQuerySchema>) =>
      `${WORKFLOWS_BASE_PATH}?${getSearchParams(query ?? {})}`,
    [],
  )

export const useWorkflowsLink = () =>
  useCallback(
    (workflows: WorkflowsLinkParams) =>
      `${WORKFLOWS_BASE_PATH}/${workflows.id}`,
    [],
  )
