import { indicatorQuerySchema } from '@repo/schemas/crud'
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
import {
  INDICATORS_BASE_PATH,
  INDICATORS_DERIVED_BASE_PATH,
} from '../../../lib/paths'

export type IndicatorListResponse = NonNullable<
  InferResponseType<Client['api']['v0']['indicator']['$get'], 200>['data']
>
export type IndicatorListItem = IndicatorListResponse['data'][0]
export type IndicatorDetail = NonNullable<
  InferResponseType<
    Client['api']['v0']['indicator'][':id']['$get'],
    200
  >['data']
>

export type UpdateIndicatorPayload = NonNullable<
  InferRequestType<Client['api']['v0']['indicator'][':id']['$patch']>['json']
>

export type UpdateDerivedIndicatorPayload = NonNullable<
  InferRequestType<
    Client['api']['v0']['indicator']['derived'][':id']['$patch']
  >['json']
>

export type CreateIndicatorPayload = NonNullable<
  InferRequestType<Client['api']['v0']['indicator']['$post']>['json']
>

export type CreateDerivedIndicatorPayload = NonNullable<
  InferRequestType<Client['api']['v0']['indicator']['derived']['$post']>['json']
>

export type IndicatorCategoryListItem = NonNullable<
  InferResponseType<
    Client['api']['v0']['indicator-category']['$get'],
    200
  >['data']
>['data'][0]
export type IndicatorCategoryDetail = NonNullable<
  InferResponseType<
    Client['api']['v0']['indicator-category'][':id']['$get'],
    200
  >['data']
>

export type UpdateIndicatorCategoryPayload = NonNullable<
  InferRequestType<
    Client['api']['v0']['indicator-category'][':id']['$patch']
  >['json']
>

export type CreateIndicatorCategoryPayload = NonNullable<
  InferRequestType<Client['api']['v0']['indicator-category']['$post']>['json']
>

const indicatorParamsSchema = z.object({
  indicatorId: z.string().optional(),
  derivedIndicatorId: z.string().optional(),
  indicatorCategoryId: z.string().optional(),
})

const indicatorQueryKeys = {
  all: ['indicator'] as const,
  list: (query: z.infer<typeof indicatorQuerySchema> | undefined) =>
    [...indicatorQueryKeys.all, 'list', { query }] as const,
  detail: (indicatorId: string | undefined) =>
    [...indicatorQueryKeys.all, 'detail', indicatorId] as const,
  derivedDetail: (derivedIndicatorId: string | undefined) =>
    [
      ...indicatorQueryKeys.all,
      'derived',
      'detail',
      derivedIndicatorId,
    ] as const,
}

const indicatorCategoryQueryKeys = {
  all: ['indicatorCategory'] as const,
  detail: (indicatorCategoryId: string | undefined) =>
    [...indicatorCategoryQueryKeys.all, 'detail', indicatorCategoryId] as const,
}

const useIndicatorParams = (
  _indicatorId?: string,
  _derivedIndicatorId?: string,
  _indicatorCategoryId?: string,
) => {
  const params = useParams()
  const { indicatorId, indicatorCategoryId, derivedIndicatorId } =
    indicatorParamsSchema.parse(params)

  return {
    indicatorId: _indicatorId ?? indicatorId,
    indicatorCategoryId: _indicatorCategoryId ?? indicatorCategoryId,
    derivedIndicatorId: _derivedIndicatorId ?? derivedIndicatorId,
  }
}

export const useIndicators = (
  _query?: z.infer<typeof indicatorQuerySchema>,
  useSearchParams?: boolean,
  enabled = true,
) => {
  const client = useApiClient()
  const { query, setSearchParams } = useQueryWithSearchParams(
    indicatorQuerySchema,
    _query,
    useSearchParams,
  )

  const queryResult = useInfiniteQuery<IndicatorListResponse>({
    queryKey: indicatorQueryKeys.list(query),
    queryFn: async ({ pageParam = 1 }) => {
      const res = client.api.v0.indicator.$get({
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
    enabled: enabled ?? true,
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

// Note - for the moment we just return all categories in a single query
export const useIndicatorCategories = () => {
  const client = useApiClient()
  const queryResult = useQuery({
    queryKey: indicatorCategoryQueryKeys.all,
    queryFn: async () => {
      const res = client.api.v0['indicator-category'].$get()

      const json = await unwrapResponse(res)

      return json.data
    },
  })

  return {
    ...queryResult,
  }
}

export const useIndicator = (id?: string) => {
  const { indicatorId } = useIndicatorParams(id)
  const client = useApiClient()
  return useQuery({
    queryKey: indicatorQueryKeys.detail(indicatorId),
    queryFn: async () => {
      if (!indicatorId) return null
      const res = client.api.v0.indicator[':id'].$get({
        param: {
          id: indicatorId,
        },
      })

      const json = await unwrapResponse(res)

      return json.data
    },

    enabled: !!indicatorId,
  })
}

export const useDerivedIndicator = (id?: string) => {
  const { derivedIndicatorId } = useIndicatorParams(undefined, id)
  const client = useApiClient()
  return useQuery({
    queryKey: indicatorQueryKeys.derivedDetail(derivedIndicatorId),
    queryFn: async () => {
      if (!derivedIndicatorId) return null
      const res = client.api.v0.indicator.derived[':id'].$get({
        param: {
          id: derivedIndicatorId,
        },
      })

      const json = await unwrapResponse(res)

      return json.data
    },

    enabled: !!derivedIndicatorId,
  })
}

export const useIndicatorCategory = (id?: string) => {
  const { indicatorCategoryId } = useIndicatorParams(undefined, undefined, id)
  const client = useApiClient()
  return useQuery({
    queryKey: indicatorCategoryQueryKeys.detail(indicatorCategoryId),
    queryFn: async () => {
      if (!indicatorCategoryId) return null
      const res = client.api.v0['indicator-category'][':id'].$get({
        param: {
          id: indicatorCategoryId,
        },
      })

      const json = await unwrapResponse(res)

      return json.data
    },

    enabled: !!indicatorCategoryId,
  })
}

export const useCreateIndicator = () => {
  const queryClient = useQueryClient()
  const client = useApiClient()
  return useMutation({
    mutationFn: async (data: CreateIndicatorPayload) => {
      const res = client.api.v0.indicator.$post({
        json: data,
      })
      const indicator = await unwrapResponse(res, 201)
      return indicator.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: indicatorQueryKeys.all,
      })
    },
  })
}

export const useCreateDerivedIndicator = () => {
  const queryClient = useQueryClient()
  const client = useApiClient()
  return useMutation({
    mutationFn: async (data: CreateDerivedIndicatorPayload) => {
      const res = client.api.v0.indicator.derived.$post({
        json: data,
      })
      const derivedIndicator = await unwrapResponse(res, 201)
      return derivedIndicator.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: indicatorQueryKeys.all,
      })
    },
  })
}

export const useCreateIndicatorCategory = () => {
  const queryClient = useQueryClient()
  const client = useApiClient()
  return useMutation({
    mutationFn: async (data: CreateIndicatorCategoryPayload) => {
      const res = client.api.v0['indicator-category'].$post({
        json: data,
      })
      const indicatorCategory = await unwrapResponse(res, 201)
      return indicatorCategory.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: indicatorCategoryQueryKeys.all,
      })
    },
  })
}

export const useUpdateIndicator = (_indicatorId?: string) => {
  const { indicatorId } = useIndicatorParams(_indicatorId)
  const queryClient = useQueryClient()
  const client = useApiClient()
  return useMutation({
    mutationFn: async (payload: UpdateIndicatorPayload) => {
      if (!indicatorId) return
      const res = client.api.v0.indicator[':id'].$patch({
        param: { id: indicatorId },
        json: payload,
      })
      return await unwrapResponse(res)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: indicatorQueryKeys.all,
      })
    },
  })
}

export const useUpdateDerivedIndicator = (_indicatorId?: string) => {
  const { derivedIndicatorId } = useIndicatorParams(undefined, _indicatorId)
  const queryClient = useQueryClient()
  const client = useApiClient()
  return useMutation({
    mutationFn: async (payload: UpdateDerivedIndicatorPayload) => {
      if (!derivedIndicatorId) return
      const res = client.api.v0.indicator.derived[':id'].$patch({
        param: { id: derivedIndicatorId },
        json: payload,
      })
      return await unwrapResponse(res)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: indicatorQueryKeys.all,
      })
    },
  })
}

export const useUpdateIndicatorCategory = (_indicatorCategoryId?: string) => {
  const { indicatorCategoryId } = useIndicatorParams(
    undefined,
    undefined,
    _indicatorCategoryId,
  )
  const queryClient = useQueryClient()
  const client = useApiClient()
  return useMutation({
    mutationFn: async (payload: UpdateIndicatorCategoryPayload) => {
      if (!indicatorCategoryId) return
      const res = client.api.v0['indicator-category'][':id'].$patch({
        param: { id: indicatorCategoryId },
        json: payload,
      })
      return await unwrapResponse(res)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: indicatorCategoryQueryKeys.all,
      })
    },
  })
}

export const useDeleteIndicator = (
  _indicatorId?: string,
  redirect: string | null = null,
) => {
  const { indicatorId } = useIndicatorParams(_indicatorId)
  const queryClient = useQueryClient()
  const router = useRouter()
  const client = useApiClient()
  return useMutation({
    mutationFn: async () => {
      if (!indicatorId) return
      const res = client.api.v0.indicator[':id'].$delete({
        param: {
          id: indicatorId,
        },
      })

      return await unwrapResponse(res)
    },
    onSuccess: () => {
      if (indicatorId) {
        queryClient.removeQueries({
          queryKey: indicatorQueryKeys.detail(indicatorId),
        })
      }
      queryClient.invalidateQueries({
        queryKey: indicatorQueryKeys.all,
      })
      if (redirect) {
        router.push(redirect)
      }
    },
  })
}

export const useDeleteDerivedIndicator = (
  _derivedIndicatorId?: string,
  redirect: string | null = null,
) => {
  const { derivedIndicatorId } = useIndicatorParams(
    undefined,
    _derivedIndicatorId,
  )
  const queryClient = useQueryClient()
  const router = useRouter()
  const client = useApiClient()
  return useMutation({
    mutationFn: async () => {
      if (!derivedIndicatorId) return
      const res = client.api.v0.indicator.derived[':id'].$delete({
        param: {
          id: derivedIndicatorId,
        },
      })

      return await unwrapResponse(res)
    },
    onSuccess: () => {
      if (derivedIndicatorId) {
        queryClient.removeQueries({
          queryKey: indicatorQueryKeys.derivedDetail(derivedIndicatorId),
        })
      }
      queryClient.invalidateQueries({
        queryKey: indicatorQueryKeys.all,
      })
      if (redirect) {
        router.push(redirect)
      }
    },
  })
}

export const useDeleteIndicatorCategory = (
  _indicatorCategoryId?: string,
  redirect: string | null = null,
) => {
  const { indicatorCategoryId } = useIndicatorParams(
    undefined,
    undefined,
    _indicatorCategoryId,
  )
  const queryClient = useQueryClient()
  const router = useRouter()
  const client = useApiClient()
  return useMutation({
    mutationFn: async () => {
      if (!indicatorCategoryId) return
      const res = client.api.v0['indicator-category'][':id'].$delete({
        param: {
          id: indicatorCategoryId,
        },
      })

      return await unwrapResponse(res)
    },
    onSuccess: () => {
      if (indicatorCategoryId) {
        queryClient.removeQueries({
          queryKey: indicatorCategoryQueryKeys.detail(indicatorCategoryId),
        })
      }
      queryClient.invalidateQueries({
        queryKey: indicatorCategoryQueryKeys.all,
      })
      if (redirect) {
        router.push(redirect)
      }
    },
  })
}

export type IndicatorLinkParams = Pick<
  IndicatorListItem,
  'id' | 'name' | 'type'
>
export type IndicatorCategoryLinkParams = Pick<
  IndicatorCategoryListItem,
  'id' | 'name'
>

export const useIndicatorsLink = () =>
  useCallback(
    (query?: z.infer<typeof indicatorQuerySchema>) =>
      `${INDICATORS_BASE_PATH}?${getSearchParams(query ?? {})}`,
    [],
  )

export const useIndicatorLink = () =>
  useCallback(
    (indicator: IndicatorLinkParams) =>
      `${indicator.type === 'derived' ? INDICATORS_DERIVED_BASE_PATH : INDICATORS_BASE_PATH}/${indicator.id}`,
    [],
  )

export const useIndicatorCategoryLink = () =>
  useCallback(
    (indicatorCategory: IndicatorCategoryLinkParams) =>
      `${INDICATORS_BASE_PATH}/categories/${indicatorCategory.id}`,
    [],
  )
