'use client'

import { workflowQuerySchema } from '@repo/schemas/crud'
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

export type WorkflowListResponse = NonNullable<
  InferResponseType<Client['api']['v0']['workflow']['$get'], 200>['data']
>
export type WorkflowListItem = WorkflowListResponse['data'][0]
export type WorkflowDetail = NonNullable<
  InferResponseType<Client['api']['v0']['workflow'][':id']['$get'], 200>['data']
>

export type UpdateWorkflowPayload = NonNullable<
  InferRequestType<Client['api']['v0']['workflow'][':id']['$patch']>['json']
>

export type CreateWorkflowPayload = NonNullable<
  InferRequestType<Client['api']['v0']['workflow']['$post']>['json']
>

const workflowParamsSchema = z.object({
  workflowId: z.string().optional(),
})

export const workflowQueryKeys = {
  all: ['workflow'] as const,
  list: (query: z.infer<typeof workflowQuerySchema> | undefined) =>
    [...workflowQueryKeys.all, 'list', { query }] as const,
  detail: (workflowId: string | undefined) =>
    [...workflowQueryKeys.all, 'detail', workflowId] as const,
}

export const useWorkflowParams = (_workflowId?: string) => {
  const params = useParams()
  const { workflowId } = workflowParamsSchema.parse(params)

  return {
    workflowId: _workflowId ?? workflowId,
  }
}

export const useAllWorkflows = (
  _query?: z.infer<typeof workflowQuerySchema>,
  useSearchParams?: boolean,
) => {
  const client = useApiClient()
  const { query, setSearchParams } = useQueryWithSearchParams(
    workflowQuerySchema,
    _query,
    useSearchParams,
  )

  const queryResult = useInfiniteQuery<WorkflowListResponse>({
    queryKey: workflowQueryKeys.list(query),
    queryFn: async ({ pageParam = 1 }) => {
      const res = client.api.v0.workflow.$get({
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

export const useWorkflow = (_workflowId?: string, enabled: boolean = true) => {
  const { workflowId } = useWorkflowParams(_workflowId)
  const client = useApiClient()
  return useQuery({
    queryKey: workflowQueryKeys.detail(workflowId),
    queryFn: async () => {
      if (!workflowId) return null
      const res = client.api.v0.workflow[':id'].$get({
        param: {
          id: workflowId,
        },
      })

      const json = await unwrapResponse(res)

      return json.data
    },
    enabled: enabled ?? !!workflowId,
  })
}

export const useCreateWorkflow = () => {
  const queryClient = useQueryClient()
  const client = useApiClient()
  return useMutation({
    mutationFn: async (data: CreateWorkflowPayload) => {
      const res = client.api.v0.workflow.$post({
        json: data,
      })
      await unwrapResponse(res, 201)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workflowQueryKeys.all,
      })
    },
  })
}

export const useUpdateWorkflow = (_workflowId?: string) => {
  const { workflowId } = useWorkflowParams(_workflowId)
  const queryClient = useQueryClient()
  const client = useApiClient()
  return useMutation({
    mutationFn: async (payload: UpdateWorkflowPayload) => {
      if (!workflowId) return
      const res = client.api.v0.workflow[':id'].$patch({
        param: { id: workflowId },
        json: payload,
      })
      return await unwrapResponse(res)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workflowQueryKeys.all,
      })
    },
  })
}

export const useDeleteWorkflow = (
  _workflowId?: string,
  redirect: string | null = null,
) => {
  const { workflowId } = useWorkflowParams(_workflowId)
  const queryClient = useQueryClient()
  const router = useRouter()
  const client = useApiClient()
  return useMutation({
    mutationFn: async () => {
      if (!workflowId) return
      const res = client.api.v0.workflow[':id'].$delete({
        param: {
          id: workflowId,
        },
      })

      return await unwrapResponse(res)
    },
    onSuccess: (response) => {
      queryClient.removeQueries({
        queryKey: workflowQueryKeys.detail(response?.data?.id),
      })

      queryClient.invalidateQueries({
        queryKey: workflowQueryKeys.all,
      })

      if (redirect) {
        router.push(redirect)
      }
    },
  })
}

export type WorkflowLinkParams = Pick<WorkflowListItem, 'id' | 'name'>

export const useAllWorkflowLink = () =>
  useCallback(
    (query?: z.infer<typeof workflowQuerySchema>) =>
      `${WORKFLOWS_BASE_PATH}?${getSearchParams(query ?? {})}`,
    [],
  )

export const useWorkflowLink = () =>
  useCallback(
    (workflow: WorkflowLinkParams) => `${WORKFLOWS_BASE_PATH}/${workflow.id}`,
    [],
  )
