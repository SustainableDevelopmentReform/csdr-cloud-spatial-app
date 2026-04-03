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
  INDICATORS_MEASURED_BASE_PATH,
} from '../../../lib/paths'
import {
  ResourceVisibility,
  VisibilityImpact,
} from '../../../utils/access-control'
import { productQueryKeys, productRunQueryKeys } from '../product/_hooks'

export type IndicatorListResponse = NonNullable<
  InferResponseType<Client['api']['v0']['indicator']['$get'], 200>['data']
>
export type IndicatorListItem = IndicatorListResponse['data'][0]
export type AnyIndicatorDetail = NonNullable<
  InferResponseType<
    Client['api']['v0']['indicator'][':id']['$get'],
    200
  >['data']
>

export type MeasuredIndicatorDetail = NonNullable<
  InferResponseType<
    Client['api']['v0']['indicator']['measured'][':id']['$get'],
    200
  >['data']
>
export type DerivedIndicatorDetail = NonNullable<
  InferResponseType<
    Client['api']['v0']['indicator']['derived'][':id']['$get'],
    200
  >['data']
>

export type UpdateMeasuredIndicatorPayload = NonNullable<
  InferRequestType<
    Client['api']['v0']['indicator']['measured'][':id']['$patch']
  >['json']
>
export type UpdateMeasuredIndicatorVisibilityPayload = NonNullable<
  InferRequestType<
    Client['api']['v0']['indicator']['measured'][':id']['visibility']['$patch']
  >['json']
>

export type UpdateDerivedIndicatorPayload = NonNullable<
  InferRequestType<
    Client['api']['v0']['indicator']['derived'][':id']['$patch']
  >['json']
>
export type UpdateDerivedIndicatorVisibilityPayload = NonNullable<
  InferRequestType<
    Client['api']['v0']['indicator']['derived'][':id']['visibility']['$patch']
  >['json']
>

export type CreateMeasuredIndicatorPayload = NonNullable<
  InferRequestType<
    Client['api']['v0']['indicator']['measured']['$post']
  >['json']
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
  measuredIndicatorId: z.string().optional(),
  derivedIndicatorId: z.string().optional(),
  indicatorCategoryId: z.string().optional(),
})

export const indicatorQueryKeys = {
  all: ['indicator'] as const,
  list: (query: z.infer<typeof indicatorQuerySchema> | undefined) =>
    [...indicatorQueryKeys.all, 'list', { query }] as const,
  measuredDetail: (measuredIndicatorId: string | undefined) =>
    [
      ...indicatorQueryKeys.all,
      'measured',
      'detail',
      measuredIndicatorId,
    ] as const,
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
  _measuredIndicatorId?: string,
  _derivedIndicatorId?: string,
  _indicatorCategoryId?: string,
) => {
  const params = useParams()
  const { measuredIndicatorId, indicatorCategoryId, derivedIndicatorId } =
    indicatorParamsSchema.parse(params)

  return {
    measuredIndicatorId: _measuredIndicatorId ?? measuredIndicatorId,
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
  const { measuredIndicatorId, derivedIndicatorId } = useIndicatorParams()
  const indicatorId = id ?? measuredIndicatorId ?? derivedIndicatorId
  const client = useApiClient()
  return useQuery({
    queryKey: indicatorQueryKeys.measuredDetail(indicatorId),
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

export const useMeasuredIndicator = (id?: string) => {
  const { measuredIndicatorId } = useIndicatorParams(id)
  const client = useApiClient()
  return useQuery({
    queryKey: indicatorQueryKeys.measuredDetail(measuredIndicatorId),
    queryFn: async () => {
      if (!measuredIndicatorId) return null
      const res = client.api.v0.indicator.measured[':id'].$get({
        param: {
          id: measuredIndicatorId,
        },
      })

      const json = await unwrapResponse(res)

      return json.data
    },

    enabled: !!measuredIndicatorId,
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

export const useCreateMeasuredIndicator = () => {
  const queryClient = useQueryClient()
  const client = useApiClient()
  return useMutation({
    mutationFn: async (data: CreateMeasuredIndicatorPayload) => {
      const res = client.api.v0.indicator.measured.$post({
        json: data,
      })
      const measuredIndicator = await unwrapResponse(res, 201)
      return measuredIndicator.data
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

export const useUpdateMeasuredIndicator = (_indicatorId?: string) => {
  const { measuredIndicatorId } = useIndicatorParams(_indicatorId)
  const queryClient = useQueryClient()
  const client = useApiClient()
  return useMutation({
    mutationFn: async (payload: UpdateMeasuredIndicatorPayload) => {
      if (!measuredIndicatorId) return
      const res = client.api.v0.indicator.measured[':id'].$patch({
        param: { id: measuredIndicatorId },
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

export const useUpdateMeasuredIndicatorVisibility = (_indicatorId?: string) => {
  const { measuredIndicatorId } = useIndicatorParams(_indicatorId)
  const queryClient = useQueryClient()
  const client = useApiClient()
  return useMutation({
    mutationFn: async (payload: UpdateMeasuredIndicatorVisibilityPayload) => {
      if (!measuredIndicatorId) return
      const res = client.api.v0.indicator.measured[':id'].visibility.$patch({
        param: { id: measuredIndicatorId },
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

export const usePreviewMeasuredIndicatorVisibility = (
  _indicatorId?: string,
) => {
  const { measuredIndicatorId } = useIndicatorParams(_indicatorId)
  const client = useApiClient()
  return useMutation<
    VisibilityImpact | null,
    Error,
    { visibility: ResourceVisibility }
  >({
    mutationFn: async (payload) => {
      if (!measuredIndicatorId) {
        return null
      }

      const res = client.api.v0.indicator.measured[':id'][
        'visibility-impact'
      ].$get({
        param: {
          id: measuredIndicatorId,
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

export const useUpdateDerivedIndicatorVisibility = (_indicatorId?: string) => {
  const { derivedIndicatorId } = useIndicatorParams(undefined, _indicatorId)
  const queryClient = useQueryClient()
  const client = useApiClient()
  return useMutation({
    mutationFn: async (payload: UpdateDerivedIndicatorVisibilityPayload) => {
      if (!derivedIndicatorId) return
      const res = client.api.v0.indicator.derived[':id'].visibility.$patch({
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

export const usePreviewDerivedIndicatorVisibility = (_indicatorId?: string) => {
  const { derivedIndicatorId } = useIndicatorParams(undefined, _indicatorId)
  const client = useApiClient()
  return useMutation<
    VisibilityImpact | null,
    Error,
    { visibility: ResourceVisibility }
  >({
    mutationFn: async (payload) => {
      if (!derivedIndicatorId) {
        return null
      }

      const res = client.api.v0.indicator.derived[':id'][
        'visibility-impact'
      ].$get({
        param: {
          id: derivedIndicatorId,
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

export const useDeleteMeasuredIndicator = (
  _indicatorId?: string,
  redirect: string | null = null,
) => {
  const { measuredIndicatorId } = useIndicatorParams(_indicatorId)
  const queryClient = useQueryClient()
  const router = useRouter()
  const client = useApiClient()
  return useMutation({
    mutationFn: async () => {
      if (!measuredIndicatorId) return
      const res = client.api.v0.indicator.measured[':id'].$delete({
        param: {
          id: measuredIndicatorId,
        },
      })

      return await unwrapResponse(res)
    },
    onSuccess: () => {
      if (measuredIndicatorId) {
        queryClient.removeQueries({
          queryKey: indicatorQueryKeys.measuredDetail(measuredIndicatorId),
        })
      }
      queryClient.invalidateQueries({
        queryKey: indicatorQueryKeys.all,
      })
      queryClient.invalidateQueries({
        queryKey: productQueryKeys.all,
      })
      queryClient.invalidateQueries({
        queryKey: productRunQueryKeys.all,
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
> & {
  visibility?: ResourceVisibility | null
}
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
      `${indicator.type === 'derived' ? INDICATORS_DERIVED_BASE_PATH : INDICATORS_MEASURED_BASE_PATH}/${indicator.id}`,
    [],
  )

export const useIndicatorCategoryLink = () =>
  useCallback(
    (indicatorCategory: IndicatorCategoryLinkParams) =>
      `${INDICATORS_BASE_PATH}/categories/${indicatorCategory.id}`,
    [],
  )
