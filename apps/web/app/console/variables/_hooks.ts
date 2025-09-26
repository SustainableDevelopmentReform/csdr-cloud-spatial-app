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
  InferResponseType<typeof client.api.v0.variable.$get, 200>['data']
>['data'][0]
export type VariableDetail = NonNullable<
  InferResponseType<(typeof client.api.v0.variable)[':id']['$get'], 200>['data']
>

export type UpdateVariablePayload = NonNullable<
  InferRequestType<(typeof client.api.v0.variable)[':id']['$patch']>['json']
>

export type CreateVariablePayload = NonNullable<
  InferRequestType<(typeof client.api.v0.variable)['$post']>['json']
>

export type VariableCategoryListItem = NonNullable<
  InferResponseType<
    (typeof client.api.v0)['variable-category']['$get'],
    200
  >['data']
>['data'][0]
export type VariableCategoryDetail = NonNullable<
  InferResponseType<
    (typeof client.api.v0)['variable-category'][':id']['$get'],
    200
  >['data']
>

export type UpdateVariableCategoryPayload = NonNullable<
  InferRequestType<
    (typeof client.api.v0)['variable-category'][':id']['$patch']
  >['json']
>

export type CreateVariableCategoryPayload = NonNullable<
  InferRequestType<(typeof client.api.v0)['variable-category']['$post']>['json']
>

const variableParamsSchema = z.object({
  variableId: z.string().optional(),
  variableCategoryId: z.string().optional(),
})

export const useVariableParams = (
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

export const useVariables = () => {
  const [page, setPage] = useState(1)

  const { data } = useQuery({
    queryKey: [QueryKey.Variable],
    queryFn: async () => {
      const res = client.api.v0.variable.$get({
        query: {
          page,
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

// Note - for the moment we just return all categories in a single query
export const useVariableCategories = () => {
  const { data } = useQuery({
    queryKey: [QueryKey.VariableCategory],
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

  return useQuery({
    queryKey: [QueryKey.Variable, variableId],
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
  })
}

export const useVariableCategory = (id?: string) => {
  const { variableCategoryId } = useVariableParams(undefined, id)

  return useQuery({
    queryKey: [QueryKey.VariableCategory, variableCategoryId],
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
  })
}

export const useCreateVariable = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateVariablePayload) => {
      const res = client.api.v0.variable.$post({
        json: data,
      })
      await unwrapResponse(res, 201)

      queryClient.invalidateQueries({
        queryKey: [QueryKey.Variable],
      })
    },
  })
}

export const useCreateVariableCategory = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateVariableCategoryPayload) => {
      const res = client.api.v0['variable-category'].$post({
        json: data,
      })
      const variableCategory = await unwrapResponse(res, 201)

      queryClient.invalidateQueries({
        queryKey: [QueryKey.VariableCategory],
      })

      return variableCategory.data
    },
  })
}

export const useUpdateVariable = (_variableId?: string) => {
  const { variableId } = useVariableParams(_variableId)
  const queryClient = useQueryClient()

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
        queryKey: [QueryKey.Variable, variableId],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Variable],
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
        queryKey: [QueryKey.VariableCategory, variableCategoryId],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.VariableCategory],
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
      const res = client.api.v0.variable[':id'].$delete({
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
      queryClient.invalidateQueries({
        queryKey: [QueryKey.VariableCategory],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.VariableCategory, variableCategoryId],
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

export const useVariableLink = () =>
  useCallback(
    (variable: VariableLinkParams) => `/console/variables/${variable.id}`,
    [],
  )

export const useVariableCategoryLink = () =>
  useCallback(
    (variableCategory: VariableCategoryLinkParams) =>
      `/console/variables/categories/${variableCategory.id}`,
    [],
  )
