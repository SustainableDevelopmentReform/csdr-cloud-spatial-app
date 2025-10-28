import { variableQuerySchema } from '@repo/schemas/crud'
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

export type VariableListItem = NonNullable<
  InferResponseType<Client['api']['v0']['variable']['$get'], 200>['data']
>['data'][0]
export type VariableDetail = NonNullable<
  InferResponseType<Client['api']['v0']['variable'][':id']['$get'], 200>['data']
>

export type UpdateVariablePayload = NonNullable<
  InferRequestType<Client['api']['v0']['variable'][':id']['$patch']>['json']
>

export type CreateVariablePayload = NonNullable<
  InferRequestType<Client['api']['v0']['variable']['$post']>['json']
>

export type VariableCategoryListItem = NonNullable<
  InferResponseType<
    Client['api']['v0']['variable-category']['$get'],
    200
  >['data']
>['data'][0]
export type VariableCategoryDetail = NonNullable<
  InferResponseType<
    Client['api']['v0']['variable-category'][':id']['$get'],
    200
  >['data']
>

export type UpdateVariableCategoryPayload = NonNullable<
  InferRequestType<
    Client['api']['v0']['variable-category'][':id']['$patch']
  >['json']
>

export type CreateVariableCategoryPayload = NonNullable<
  InferRequestType<Client['api']['v0']['variable-category']['$post']>['json']
>

const variableParamsSchema = z.object({
  variableId: z.string().optional(),
  variableCategoryId: z.string().optional(),
})

const variableQueryKeys = {
  all: ['variable'] as const,
  list: (query: z.infer<typeof variableQuerySchema> | undefined) =>
    [...variableQueryKeys.all, 'list', { query }] as const,
  detail: (variableId: string | undefined) =>
    [...variableQueryKeys.all, 'detail', variableId] as const,
}

const variableCategoryQueryKeys = {
  all: ['variableCategory'] as const,
  detail: (variableCategoryId: string | undefined) =>
    [...variableCategoryQueryKeys.all, 'detail', variableCategoryId] as const,
}

const useVariableParams = (
  _variableId?: string,
  _variableCategoryId?: string,
) => {
  const params = useParams()
  const { variableId, variableCategoryId } = variableParamsSchema.parse(params)

  return {
    variableId: _variableId ?? variableId,
    variableCategoryId: _variableCategoryId ?? variableCategoryId,
  }
}

export const useVariables = (
  _query?: z.infer<typeof variableQuerySchema>,
  useSearchParams?: boolean,
) => {
  const client = useApiClient()
  const { query, setSearchParams } = useQueryWithSearchParams(
    variableQuerySchema,
    _query,
    useSearchParams,
  )

  const { data } = useQuery({
    queryKey: variableQueryKeys.list(query),
    queryFn: async () => {
      if (!query) return null
      const res = client.api.v0.variable.$get({
        query,
      })

      const json = await unwrapResponse(res)

      return json.data
    },
    placeholderData: keepPreviousData,
    enabled: !!query,
  })

  return {
    data,
    query,
    setSearchParams,
  }
}

// Note - for the moment we just return all categories in a single query
export const useVariableCategories = () => {
  const client = useApiClient()
  const { data } = useQuery({
    queryKey: variableCategoryQueryKeys.all,
    queryFn: async () => {
      const res = client.api.v0['variable-category'].$get()

      const json = await unwrapResponse(res)

      return json.data
    },
    placeholderData: keepPreviousData,
  })

  return {
    data,
  }
}

export const useVariable = (id?: string) => {
  const { variableId } = useVariableParams(id)
  const client = useApiClient()
  return useQuery({
    queryKey: variableQueryKeys.detail(variableId),
    queryFn: async () => {
      if (!variableId) return null
      const res = client.api.v0.variable[':id'].$get({
        param: {
          id: variableId,
        },
      })

      const json = await unwrapResponse(res)

      return json.data
    },
    placeholderData: keepPreviousData,
    enabled: !!variableId,
  })
}

export const useVariableCategory = (id?: string) => {
  const { variableCategoryId } = useVariableParams(undefined, id)
  const client = useApiClient()
  return useQuery({
    queryKey: variableCategoryQueryKeys.detail(variableCategoryId),
    queryFn: async () => {
      if (!variableCategoryId) return null
      const res = client.api.v0['variable-category'][':id'].$get({
        param: {
          id: variableCategoryId,
        },
      })

      const json = await unwrapResponse(res)

      return json.data
    },
    placeholderData: keepPreviousData,
    enabled: !!variableCategoryId,
  })
}

export const useCreateVariable = () => {
  const queryClient = useQueryClient()
  const client = useApiClient()
  return useMutation({
    mutationFn: async (data: CreateVariablePayload) => {
      const res = client.api.v0.variable.$post({
        json: data,
      })
      await unwrapResponse(res, 201)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: variableQueryKeys.all,
      })
    },
  })
}

export const useCreateVariableCategory = () => {
  const queryClient = useQueryClient()
  const client = useApiClient()
  return useMutation({
    mutationFn: async (data: CreateVariableCategoryPayload) => {
      const res = client.api.v0['variable-category'].$post({
        json: data,
      })
      const variableCategory = await unwrapResponse(res, 201)
      return variableCategory.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: variableCategoryQueryKeys.all,
      })
    },
  })
}

export const useUpdateVariable = (_variableId?: string) => {
  const { variableId } = useVariableParams(_variableId)
  const queryClient = useQueryClient()
  const client = useApiClient()
  return useMutation({
    mutationFn: async (payload: UpdateVariablePayload) => {
      if (!variableId) return
      const res = client.api.v0.variable[':id'].$patch({
        param: { id: variableId },
        json: payload,
      })
      return await unwrapResponse(res)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: variableQueryKeys.all,
      })
    },
  })
}

export const useUpdateVariableCategory = (_variableCategoryId?: string) => {
  const { variableCategoryId } = useVariableParams(
    undefined,
    _variableCategoryId,
  )
  const queryClient = useQueryClient()
  const client = useApiClient()
  return useMutation({
    mutationFn: async (payload: UpdateVariableCategoryPayload) => {
      if (!variableCategoryId) return
      const res = client.api.v0['variable-category'][':id'].$patch({
        param: { id: variableCategoryId },
        json: payload,
      })
      return await unwrapResponse(res)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: variableCategoryQueryKeys.all,
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
  const client = useApiClient()
  return useMutation({
    mutationFn: async () => {
      if (!variableId) return
      const res = client.api.v0.variable[':id'].$delete({
        param: {
          id: variableId,
        },
      })

      return await unwrapResponse(res)
    },
    onSuccess: () => {
      if (variableId) {
        queryClient.removeQueries({
          queryKey: variableQueryKeys.detail(variableId),
        })
      }
      queryClient.invalidateQueries({
        queryKey: variableQueryKeys.all,
      })
      if (redirect) {
        router.push(redirect)
      }
    },
  })
}

export const useDeleteVariableCategory = (
  _variableCategoryId?: string,
  redirect: string | null = null,
) => {
  const { variableCategoryId } = useVariableParams(
    undefined,
    _variableCategoryId,
  )
  const queryClient = useQueryClient()
  const router = useRouter()
  const client = useApiClient()
  return useMutation({
    mutationFn: async () => {
      if (!variableCategoryId) return
      const res = client.api.v0['variable-category'][':id'].$delete({
        param: {
          id: variableCategoryId,
        },
      })

      return await unwrapResponse(res)
    },
    onSuccess: () => {
      if (variableCategoryId) {
        queryClient.removeQueries({
          queryKey: variableCategoryQueryKeys.detail(variableCategoryId),
        })
      }
      queryClient.invalidateQueries({
        queryKey: variableCategoryQueryKeys.all,
      })
      if (redirect) {
        router.push(redirect)
      }
    },
  })
}

export type VariableLinkParams = Pick<VariableListItem, 'id' | 'name'>
export type VariableCategoryLinkParams = Pick<
  VariableCategoryListItem,
  'id' | 'name'
>

export const VARIABLES_BASE_PATH = '/console/variables'

export const useVariablesLink = () =>
  useCallback(
    (query?: z.infer<typeof variableQuerySchema>) =>
      `${VARIABLES_BASE_PATH}?${getSearchParams(query ?? {})}`,
    [],
  )

export const useVariableLink = () =>
  useCallback(
    (variable: VariableLinkParams) => `${VARIABLES_BASE_PATH}/${variable.id}`,
    [],
  )

export const useVariableCategoryLink = () =>
  useCallback(
    (variableCategory: VariableCategoryLinkParams) =>
      `${VARIABLES_BASE_PATH}/categories/${variableCategory.id}`,
    [],
  )
