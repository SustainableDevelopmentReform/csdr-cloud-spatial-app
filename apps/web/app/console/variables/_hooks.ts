import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { InferRequestType, InferResponseType } from 'hono/client'
import { useCallback, useState } from 'react'
import { z } from 'zod'
import { client, QueryKey, unwrapResponse } from '~/utils/fetcher'
import { useParams, useRouter } from 'next/navigation'

export type VariableListItem = NonNullable<
  InferResponseType<typeof client.api.v1.variable.$get, 200>['data']
>['data'][0]
export type VariableDetail = NonNullable<
  InferResponseType<(typeof client.api.v1.variable)[':id']['$get'], 200>['data']
>

export type UpdateVariablePayload = NonNullable<
  InferRequestType<(typeof client.api.v1.variable)[':id']['$patch']>['json']
>

export type CreateVariablePayload = NonNullable<
  InferRequestType<(typeof client.api.v1.variable)['$post']>['json']
>

const variableParamsSchema = z.object({
  variableId: z.string().optional(),
})

export const useVariableParams = (_variableId?: string) => {
  const params = useParams()
  const { variableId } = variableParamsSchema.parse(params)

  return {
    variableId: _variableId ?? variableId,
  }
}

export const useVariables = () => {
  const [page, setPage] = useState(1)

  const { data } = useQuery({
    queryKey: [QueryKey.Variable],
    queryFn: async () => {
      const res = client.api.v1.variable.$get({
        query: {
          page: page.toString(),
        },
      })

      const json = await unwrapResponse(res)

      return json.data
    },
    placeholderData: keepPreviousData,
  })

  return {
    data,
    page,
    setPage,
  }
}

export const useVariable = (id?: string) => {
  const { variableId } = useVariableParams(id)

  return useQuery({
    queryKey: [QueryKey.Variable, variableId],
    queryFn: async () => {
      if (!variableId) return null
      const res = client.api.v1.variable[':id'].$get({
        param: {
          id: variableId,
        },
      })

      const json = await unwrapResponse(res)

      return json.data
    },
    placeholderData: keepPreviousData,
  })
}

export const useCreateVariable = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateVariablePayload) => {
      const res = client.api.v1.variable.$post({
        json: data,
      })
      await unwrapResponse(res)

      queryClient.invalidateQueries({
        queryKey: [QueryKey.Variable],
      })
    },
  })
}

export const useUpdateVariable = (_variableId?: string) => {
  const { variableId } = useVariableParams(_variableId)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: UpdateVariablePayload) => {
      if (!variableId) return
      const res = client.api.v1.variable[':id'].$patch({
        param: { id: variableId },
        json: payload,
      })
      return await unwrapResponse(res)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Variable, variableId],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Variable],
      })
    },
  })
}

export const useDeleteVariable = (
  _variableId?: string,
  redirect: string | null = null,
) => {
  const { variableId } = useVariableParams(_variableId)
  const queryClient = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: async () => {
      if (!variableId) return
      const res = client.api.v1.variable[':id'].$delete({
        param: {
          id: variableId,
        },
      })

      return await unwrapResponse(res)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Variable],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Variable, variableId],
      })
      if (redirect) {
        router.push(redirect)
      }
    },
  })
}

export type VariableLinkParams = Pick<VariableListItem, 'id' | 'name'>

export const useVariableLink = () =>
  useCallback(
    (variable: VariableLinkParams) => `/console/variables/${variable.id}`,
    [],
  )
