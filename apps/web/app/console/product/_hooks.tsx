'use client'

import {
  importProductOutputsSchema,
  productOutputExportQuerySchema,
  productOutputQuerySchema,
  productQuerySchema,
  productRunQuerySchema,
} from '@repo/schemas/crud'
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
import { mergePaginatedInfiniteData } from '../../../hooks/mergePaginatedInfiniteData'
import { useApiClient } from '../../../hooks/useApiClient'
import { useQueryWithSearchParams } from '../../../hooks/useSearchParams'
import {
  PRODUCTS_BASE_PATH,
  PRODUCTS_RUNS_BASE_PATH,
  PRODUCTS_RUNS_OUTPUTS_BASE_PATH,
} from '../../../lib/paths'
import {
  ResourceVisibility,
  VisibilityImpact,
} from '../../../utils/access-control'
import { DatasetButton } from '../dataset/_components/dataset-button'
import { DatasetRunButton } from '../dataset/_components/dataset-run-button'
import {
  datasetQueryKeys,
  datasetRunQueryKeys,
  useDatasetRun,
} from '../dataset/_hooks'
import { GeometriesButton } from '../geometries/_components/geometries-button'
import { GeometriesRunButton } from '../geometries/_components/geometries-run-button'
import {
  geometriesQueryKeys,
  geometriesRunQueryKeys,
  useGeometriesRun,
} from '../geometries/_hooks'

export type ProductListResponse = NonNullable<
  InferResponseType<Client['api']['v0']['product']['$get'], 200>['data']
>
export type ProductListItem = ProductListResponse['data'][0]
export type ProductDetail = NonNullable<
  InferResponseType<Client['api']['v0']['product'][':id']['$get'], 200>['data']
>

export type ProductRunListResponse = NonNullable<
  InferResponseType<
    Client['api']['v0']['product'][':id']['runs']['$get'],
    200
  >['data']
>
export type ProductRunListItem = ProductRunListResponse['data'][0]
export type ProductRunDetail = NonNullable<
  InferResponseType<
    Client['api']['v0']['product-run'][':id']['$get'],
    200
  >['data']
>

export type ProductOutputListResponse = NonNullable<
  InferResponseType<
    Client['api']['v0']['product-run'][':id']['outputs']['$get'],
    200
  >['data']
>
export type ProductOutputListItem = ProductOutputListResponse['data'][0]

// Note we parse dates in the hook - so we use the return type of the hook
export type ProductOutputExportListItem = NonNullable<
  ReturnType<typeof useProductOutputsExport>['data']
>['data'][0]
export type ProductOutputDetail = NonNullable<
  InferResponseType<
    Client['api']['v0']['product-output'][':id']['$get'],
    200
  >['data']
>

export type UpdateProductPayload = NonNullable<
  InferRequestType<Client['api']['v0']['product'][':id']['$patch']>['json']
>
export type UpdateProductVisibilityPayload = NonNullable<
  InferRequestType<
    Client['api']['v0']['product'][':id']['visibility']['$patch']
  >['json']
>
export type UpdateProductRunPayload = NonNullable<
  InferRequestType<Client['api']['v0']['product-run'][':id']['$patch']>['json']
>
export type UpdateProductOutputPayload = NonNullable<
  InferRequestType<
    Client['api']['v0']['product-output'][':id']['$patch']
  >['json']
>

export type CreateProductPayload = NonNullable<
  InferRequestType<Client['api']['v0']['product']['$post']>['json']
>
export type CreateProductRunPayload = NonNullable<
  InferRequestType<Client['api']['v0']['product-run']['$post']>['json']
>
export type CreateProductRunOutputPayload = NonNullable<
  InferRequestType<Client['api']['v0']['product-output']['$post']>['json']
>

export type AssignDerivedIndicatorPayload = NonNullable<
  InferRequestType<
    Client['api']['v0']['product-run'][':id']['derived-indicators']['$post']
  >['json']
>

export type ProductRunAssignedDerivedIndicator = NonNullable<
  InferResponseType<
    Client['api']['v0']['product-run'][':id']['derived-indicators']['$get'],
    200
  >['data']
>[number]

export type ImportProductOutputsPayload = z.infer<
  typeof importProductOutputsSchema
>

const productParamsSchema = z.object({
  productId: z.string().optional(),
  productRunId: z.string().optional(),
  productOutputId: z.string().optional(),
})

export const productQueryKeys = {
  all: ['product'] as const,
  list: (query: z.infer<typeof productQuerySchema> | undefined) =>
    [...productQueryKeys.all, 'list', { query }] as const,
  detail: (productId: string | undefined) =>
    [...productQueryKeys.all, 'detail', productId] as const,
}
export const productRunQueryKeys = {
  all: ['productRun'] as const,
  scopeByProduct: (productId: string | undefined) =>
    [...productRunQueryKeys.all, productId] as const,
  list: (
    productId: string | undefined,
    query: z.infer<typeof productRunQuerySchema> | undefined,
  ) =>
    [
      ...productRunQueryKeys.scopeByProduct(productId),
      'list',
      { query },
    ] as const,
  // Note: we don't know the productId  ahead of time, so we can't use the scopeByProduct query key
  // This means we need to invalidate the productRun.all query key when we create/delete a new product run
  detail: (productRunId: string | undefined) =>
    [...productRunQueryKeys.all, 'detail', productRunId] as const,
  derivedIndicators: (productRunId: string | undefined) =>
    [...productRunQueryKeys.all, 'derivedIndicators', productRunId] as const,
}
const productOutputQueryKeys = {
  all: ['productOutput'] as const,
  scopeByProduct: (productId: string | undefined) =>
    [...productOutputQueryKeys.all, productId] as const,
  scopeByProductRun: (
    productId: string | undefined,
    productRunId: string | undefined,
  ) =>
    [
      ...productOutputQueryKeys.scopeByProduct(productId),
      productRunId,
    ] as const,
  list: (
    productId: string | undefined,
    productRunId: string | undefined,
    query: z.infer<typeof productOutputQuerySchema> | undefined,
  ) =>
    [
      ...productOutputQueryKeys.scopeByProductRun(productId, productRunId),
      'list',
      { query },
    ] as const,
  // Note: we don't know the productId or productRunId ahead of time, so we can't use the scopeByProductRun query key
  // This means we need to invalidate the productOutput.all query key when we create/delete a new product output
  detail: (productOutputId: string | undefined) =>
    [...productOutputQueryKeys.all, 'detail', productOutputId] as const,
  exportList: (
    productId: string | undefined,
    productRunId: string | undefined,
    query: z.infer<typeof productOutputExportQuerySchema> | undefined,
  ) =>
    [
      ...productOutputQueryKeys.scopeByProductRun(productId, productRunId),
      'export',
      { query },
    ] as const,
}

const useProductParams = (
  _productId?: string,
  _productRunId?: string,
  _productOutputId?: string,
) => {
  const params = useParams()

  const { productId, productRunId, productOutputId } =
    productParamsSchema.parse(params)

  return {
    productId: _productId ?? productId,
    productRunId: _productRunId ?? productRunId,
    productOutputId: _productOutputId ?? productOutputId,
  }
}

export const useProducts = (
  _query?: z.infer<typeof productQuerySchema>,
  useSearchParams?: boolean,
  enabled: boolean = true,
) => {
  const client = useApiClient()

  const { query, setSearchParams } = useQueryWithSearchParams(
    productQuerySchema,
    _query,
    useSearchParams,
  )

  const queryResult = useInfiniteQuery<ProductListResponse>({
    queryKey: productQueryKeys.list(query),
    queryFn: async ({ pageParam = 1 }) => {
      const res = client.api.v0.product.$get({
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

export const useProductRuns = (
  _productId?: string,
  _query?: z.infer<typeof productRunQuerySchema>,
  useSearchParams?: boolean,
) => {
  const client = useApiClient()
  const { query, setSearchParams } = useQueryWithSearchParams(
    productRunQuerySchema,
    _query,
    useSearchParams,
  )

  const { productId } = useProductParams(_productId)

  const { data: datasetRun } = useDatasetRun(query?.datasetRunId)
  const { data: geometriesRun } = useGeometriesRun(query?.geometriesRunId)

  const queryResult = useInfiniteQuery<ProductRunListResponse>({
    queryKey: productRunQueryKeys.list(productId, query),
    queryFn: async ({ pageParam = 1 }) => {
      if (!productId) {
        throw new Error('Product ID is required to fetch product runs')
      }
      const res = client.api.v0['product'][':id']['runs'].$get({
        query: {
          ...query,
          page: pageParam,
        },
        param: {
          id: productId,
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
    enabled: !!productId,
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
    filters: [
      datasetRun && (
        <DatasetButton
          dataset={datasetRun.dataset}
          key={datasetRun.dataset.id}
        />
      ),
      datasetRun && (
        <DatasetRunButton datasetRun={datasetRun} key={datasetRun.id} />
      ),
      geometriesRun && (
        <GeometriesButton
          geometries={geometriesRun.geometries}
          key={geometriesRun.geometries.id}
        />
      ),
      geometriesRun && (
        <GeometriesRunButton
          geometriesRun={geometriesRun}
          key={geometriesRun.id}
        />
      ),
    ].filter(Boolean) as React.ReactNode[],
  }
}

export const useProductOutputs = (
  _productRunId?: string,
  _query?: z.infer<typeof productOutputQuerySchema>,
  useSearchParams?: boolean,
) => {
  const client = useApiClient()
  const { productRunId } = useProductParams(undefined, _productRunId)
  const { data: productRun } = useProductRun(productRunId)
  const { query, setSearchParams } = useQueryWithSearchParams(
    productOutputQuerySchema,
    _query,
    useSearchParams,
  )
  const queryResult = useInfiniteQuery<ProductOutputListResponse>({
    queryKey: productOutputQueryKeys.list(
      productRun?.product?.id,
      productRun?.id,
      query,
    ),
    queryFn: async ({ pageParam = 1 }) => {
      if (!productRun) {
        throw new Error('Product run is required to fetch outputs')
      }
      const res = client.api.v0['product-run'][':id']['outputs'].$get({
        query: {
          ...query,
          page: pageParam,
        },
        param: {
          id: productRun.id,
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
    enabled: !!productRun,
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

export const useProductOutputsExport = (
  _productRunId?: string,
  _query?: Partial<z.infer<typeof productOutputExportQuerySchema>>,
  useSearchParams?: boolean,
) => {
  const client = useApiClient()
  const { productRunId } = useProductParams(undefined, _productRunId)
  const { data: productRun } = useProductRun(productRunId)
  const { query, setSearchParams } = useQueryWithSearchParams(
    productOutputExportQuerySchema,
    _query,
    useSearchParams,
  )

  const queryResult = useQuery({
    queryKey: productOutputQueryKeys.exportList(
      productRun?.product?.id,
      productRun?.id,
      query,
    ),
    queryFn: async () => {
      if (!productRun) {
        throw new Error('Product run is required to export outputs')
      }
      const res = client.api.v0['product-run'][':id']['outputs']['export'].$get(
        {
          query: query ?? {},
          param: {
            id: productRun.id,
          },
        },
      )

      const json = await unwrapResponse(res)

      // Parse dates
      const parsedData = json.data.data.map((item) => ({
        ...item,
        timePoint: new Date(item.timePoint),
      }))

      return {
        ...json.data,
        data: parsedData,
      }
    },

    enabled: !!productRun,
  })

  return {
    ...queryResult,
    query,

    setSearchParams,
  }
}

export const useProduct = (_productId?: string, enabled: boolean = true) => {
  const { productId } = useProductParams(_productId)
  const client = useApiClient()
  return useQuery({
    queryKey: productQueryKeys.detail(productId),
    queryFn: async () => {
      if (!productId || productId === '*') return null
      const res = client.api.v0.product[':id'].$get({
        param: {
          id: productId,
        },
      })

      const json = await unwrapResponse(res)

      return json.data
    },

    enabled: enabled ?? (!!productId && productId !== '*'),
  })
}

export const useProductRun = (
  _productRunId?: string,
  enabled: boolean = true,
) => {
  const { productRunId } = useProductParams(undefined, _productRunId)
  const client = useApiClient()
  return useQuery({
    queryKey: productRunQueryKeys.detail(productRunId),
    queryFn: async () => {
      if (!productRunId) return null
      const res = client.api.v0['product-run'][':id'].$get({
        param: {
          id: productRunId,
        },
      })

      const json = await unwrapResponse(res)

      return json.data
    },

    enabled: enabled ?? !!productRunId,
  })
}

export const useProductRunDerivedIndicators = (
  _productRunId?: string,
  enabled: boolean = true,
) => {
  const { productRunId } = useProductParams(undefined, _productRunId)
  const client = useApiClient()
  return useQuery({
    queryKey: productRunQueryKeys.derivedIndicators(productRunId),
    queryFn: async () => {
      if (!productRunId) return null
      const res = client.api.v0['product-run'][':id'][
        'derived-indicators'
      ].$get({
        param: {
          id: productRunId,
        },
      })

      const json = await unwrapResponse(res)

      return json.data
    },

    enabled: enabled && !!productRunId,
  })
}

export const useProductOutput = (
  _productOutputId?: string,
  enabled: boolean = true,
) => {
  const { productOutputId } = useProductParams(
    undefined,
    undefined,
    _productOutputId,
  )
  const client = useApiClient()
  return useQuery({
    queryKey: productOutputQueryKeys.detail(productOutputId),
    queryFn: async () => {
      if (!productOutputId) return null
      const res = client.api.v0['product-output'][':id'].$get({
        param: {
          id: productOutputId,
        },
      })

      const json = await unwrapResponse(res)

      return json.data
    },

    enabled: enabled ?? !!productOutputId,
  })
}

export const useCreateProduct = () => {
  const queryClient = useQueryClient()
  const client = useApiClient()
  return useMutation({
    mutationFn: async (data: CreateProductPayload) => {
      const res = client.api.v0.product.$post({
        json: data,
      })
      return await unwrapResponse(res, 201)
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({
        queryKey: productQueryKeys.all,
      })

      queryClient.invalidateQueries({
        queryKey: datasetQueryKeys.detail(response?.data?.dataset?.id),
      })
      queryClient.invalidateQueries({
        queryKey: geometriesQueryKeys.detail(response?.data?.geometries?.id),
      })
    },
  })
}

export const useCreateProductRun = () => {
  const queryClient = useQueryClient()
  const client = useApiClient()
  return useMutation({
    mutationFn: async (data: CreateProductRunPayload) => {
      const res = client.api.v0['product-run'].$post({
        json: data,
      })
      return await unwrapResponse(res, 201)
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({
        queryKey: productQueryKeys.detail(response?.data?.product?.id),
      })
      // Note we need to invalidate all product run queries - as useProductRuns get's used with productId = undefined (with other filters - eg geometry or dataset run)
      queryClient.invalidateQueries({
        queryKey: productRunQueryKeys.all,
      })

      queryClient.invalidateQueries({
        queryKey: datasetRunQueryKeys.detail(response?.data?.datasetRun?.id),
      })
      queryClient.invalidateQueries({
        queryKey: geometriesRunQueryKeys.detail(
          response?.data?.geometriesRun?.id,
        ),
      })
    },
  })
}

export const useCreateProductRunOutput = () => {
  const queryClient = useQueryClient()
  const client = useApiClient()
  return useMutation({
    mutationFn: async (data: CreateProductRunOutputPayload) => {
      const res = client.api.v0['product-output'].$post({
        json: data,
      })
      return await unwrapResponse(res, 201)
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({
        queryKey: productOutputQueryKeys.scopeByProductRun(
          response?.data?.productRun?.product?.id,
          response?.data?.productRun?.id,
        ),
      })
      queryClient.invalidateQueries({
        queryKey: productRunQueryKeys.detail(response?.data?.productRun?.id),
      })
      queryClient.invalidateQueries({
        queryKey: productQueryKeys.detail(
          response?.data?.productRun?.product?.id,
        ),
      })
    },
  })
}

export const useImportProductOutputs = () => {
  const queryClient = useQueryClient()
  const client = useApiClient()
  return useMutation({
    mutationFn: async (payload: ImportProductOutputsPayload) => {
      const res = client.api.v0['product-output'].import.$post({
        form: {
          ...payload,
          indicatorMappings: JSON.stringify(payload.indicatorMappings),
        },
      })
      return await unwrapResponse(res, 201)
    },
    onSuccess: (response, indicators) => {
      const productRunId =
        response?.data?.productRunId ?? indicators.productRunId
      const productId = response?.data?.productId

      queryClient.invalidateQueries({
        queryKey: productOutputQueryKeys.scopeByProductRun(
          productId,
          productRunId,
        ),
      })
      if (productRunId) {
        queryClient.invalidateQueries({
          queryKey: productRunQueryKeys.detail(productRunId),
        })
      }
      if (productId) {
        queryClient.invalidateQueries({
          queryKey: productQueryKeys.detail(productId),
        })
      }
    },
  })
}

export const useUpdateProduct = (_productId?: string) => {
  const { productId } = useProductParams(_productId)
  const queryClient = useQueryClient()
  const client = useApiClient()
  return useMutation({
    mutationFn: async (payload: UpdateProductPayload) => {
      if (!productId) return
      const res = client.api.v0.product[':id'].$patch({
        param: { id: productId },
        json: payload,
      })
      return await unwrapResponse(res)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: productQueryKeys.all,
      })
    },
  })
}

export const useUpdateProductVisibility = (_productId?: string) => {
  const { productId } = useProductParams(_productId)
  const queryClient = useQueryClient()
  const client = useApiClient()
  return useMutation({
    mutationFn: async (payload: UpdateProductVisibilityPayload) => {
      if (!productId) return
      const res = client.api.v0.product[':id'].visibility.$patch({
        param: { id: productId },
        json: payload,
      })
      return await unwrapResponse(res)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: productQueryKeys.all,
      })
    },
  })
}

export const usePreviewProductVisibility = (_productId?: string) => {
  const { productId } = useProductParams(_productId)
  const client = useApiClient()
  return useMutation<
    VisibilityImpact | null,
    Error,
    { visibility: ResourceVisibility }
  >({
    mutationFn: async (payload) => {
      if (!productId) {
        return null
      }

      const res = client.api.v0.product[':id']['visibility-impact'].$get({
        param: {
          id: productId,
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

export const useUpdateProductRun = (_productRunId?: string) => {
  const { productRunId } = useProductParams(undefined, _productRunId)
  const queryClient = useQueryClient()
  const client = useApiClient()
  return useMutation({
    mutationFn: async (payload: UpdateProductRunPayload) => {
      if (!productRunId) return
      const res = client.api.v0['product-run'][':id'].$patch({
        param: { id: productRunId },
        json: payload,
      })
      return await unwrapResponse(res)
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({
        queryKey: productQueryKeys.detail(response?.data?.product?.id),
      })
      queryClient.invalidateQueries({
        queryKey: productRunQueryKeys.detail(response?.data?.id),
      })
      queryClient.invalidateQueries({
        queryKey: productRunQueryKeys.scopeByProduct(
          response?.data?.product?.id,
        ),
      })
    },
  })
}

export const useUpdateProductOutput = (_productOutputId?: string) => {
  const { productOutputId } = useProductParams(
    undefined,
    undefined,
    _productOutputId,
  )
  const queryClient = useQueryClient()
  const client = useApiClient()
  return useMutation({
    mutationFn: async (payload: UpdateProductOutputPayload) => {
      if (!productOutputId) return
      const res = client.api.v0['product-output'][':id'].$patch({
        param: { id: productOutputId },
        json: payload,
      })
      return await unwrapResponse(res)
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({
        queryKey: productQueryKeys.detail(
          response?.data?.productRun?.product?.id,
        ),
      })
      queryClient.invalidateQueries({
        queryKey: productRunQueryKeys.detail(response?.data?.productRun?.id),
      })
      queryClient.invalidateQueries({
        queryKey: productOutputQueryKeys.detail(response?.data?.id),
      })
      queryClient.invalidateQueries({
        queryKey: productOutputQueryKeys.scopeByProductRun(
          response?.data?.productRun?.product?.id,
          response?.data?.productRun?.id,
        ),
      })
    },
  })
}

export const useRefreshProductRunSummary = (
  run?: ProductRunLinkParams | null,
) => {
  const queryClient = useQueryClient()
  const client = useApiClient()
  return useMutation({
    mutationFn: async () => {
      if (!run) return
      const res = client.api.v0['product-run'][':id']['refresh-summary'].$post({
        param: { id: run.id },
      })
      return await unwrapResponse(res)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: productQueryKeys.all,
      })
      queryClient.invalidateQueries({
        queryKey: productRunQueryKeys.all,
      })
    },
  })
}
export const useSetProductMainRun = (run?: ProductRunLinkParams | null) => {
  const queryClient = useQueryClient()
  const client = useApiClient()
  return useMutation({
    mutationFn: async () => {
      if (!run) return
      const res = client.api.v0['product-run'][':id']['set-as-main-run'].$post({
        param: { id: run.id },
      })
      return await unwrapResponse(res)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: productQueryKeys.all,
      })
      queryClient.invalidateQueries({
        queryKey: productRunQueryKeys.all,
      })
    },
  })
}

export const useComputeDerivedIndicatorsForProductRun = (
  run?: ProductRunLinkParams | null,
) => {
  const queryClient = useQueryClient()
  const client = useApiClient()
  return useMutation({
    mutationFn: async () => {
      if (!run) return
      const res = client.api.v0['product-run'][':id'][
        'compute-derived-indicators'
      ].$post({
        param: { id: run.id },
      })
      return await unwrapResponse(res)
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({
        queryKey: productQueryKeys.all,
      })
      queryClient.invalidateQueries({
        queryKey: productRunQueryKeys.all,
      })
      queryClient.invalidateQueries({
        queryKey: productOutputQueryKeys.scopeByProductRun(
          response?.data?.productRun.product?.id,
          response?.data?.productRun.id,
        ),
      })
    },
  })
}

export const useAssignDerivedIndicatorToProductRun = (
  _productRunId?: string,
) => {
  const { productRunId } = useProductParams(undefined, _productRunId)
  const queryClient = useQueryClient()
  const client = useApiClient()
  return useMutation({
    mutationFn: async (payload: AssignDerivedIndicatorPayload) => {
      if (!productRunId) return
      const res = client.api.v0['product-run'][':id'][
        'derived-indicators'
      ].$post({
        param: { id: productRunId },
        json: payload,
      })
      return await unwrapResponse(res, 201)
    },
    onSuccess: (response) => {
      const resolvedProductRunId = response?.data?.id ?? productRunId
      const resolvedProductId = response?.data?.product?.id

      if (resolvedProductRunId) {
        queryClient.invalidateQueries({
          queryKey: productRunQueryKeys.detail(resolvedProductRunId),
        })
        queryClient.invalidateQueries({
          queryKey: productRunQueryKeys.derivedIndicators(resolvedProductRunId),
        })
      }
      if (resolvedProductId) {
        queryClient.invalidateQueries({
          queryKey: productQueryKeys.detail(resolvedProductId),
        })
      }
      queryClient.invalidateQueries({
        queryKey: productRunQueryKeys.all,
      })
    },
  })
}

export const useDeleteAssignedDerivedIndicator = (_productRunId?: string) => {
  const { productRunId } = useProductParams(undefined, _productRunId)
  const queryClient = useQueryClient()
  const client = useApiClient()
  return useMutation({
    mutationFn: async (assignedDerivedIndicatorId: string) => {
      if (!productRunId) return
      const res = client.api.v0['product-run'][':id']['derived-indicators'][
        ':assignedDerivedIndicatorId'
      ].$delete({
        param: { id: productRunId, assignedDerivedIndicatorId },
      })
      return await unwrapResponse(res)
    },
    onSuccess: (response) => {
      const resolvedProductRunId = response?.data?.id ?? productRunId
      const resolvedProductId = response?.data?.product?.id

      if (resolvedProductRunId) {
        queryClient.invalidateQueries({
          queryKey: productRunQueryKeys.detail(resolvedProductRunId),
        })
        queryClient.invalidateQueries({
          queryKey: productRunQueryKeys.derivedIndicators(resolvedProductRunId),
        })
      }
      if (resolvedProductId) {
        queryClient.invalidateQueries({
          queryKey: productQueryKeys.detail(resolvedProductId),
        })
      }
      queryClient.invalidateQueries({
        queryKey: productRunQueryKeys.all,
      })
    },
  })
}

export const useDeleteProduct = (
  _productId?: string,
  redirect: string | null = null,
) => {
  const { productId } = useProductParams(_productId)
  const queryClient = useQueryClient()
  const router = useRouter()
  const client = useApiClient()
  return useMutation({
    mutationFn: async () => {
      if (!productId) return
      const res = client.api.v0.product[':id'].$delete({
        param: {
          id: productId,
        },
      })

      return await unwrapResponse(res)
    },
    onSuccess: (response) => {
      queryClient.removeQueries({
        queryKey: productQueryKeys.detail(response?.data?.id),
      })
      queryClient.removeQueries({
        queryKey: productRunQueryKeys.scopeByProduct(response?.data?.id),
      })
      queryClient.removeQueries({
        queryKey: productOutputQueryKeys.scopeByProduct(response?.data?.id),
      })

      queryClient.invalidateQueries({
        queryKey: productQueryKeys.all,
      })
      queryClient.invalidateQueries({
        queryKey: productRunQueryKeys.all,
      })
      queryClient.invalidateQueries({
        queryKey: productOutputQueryKeys.all,
      })
      if (redirect) {
        router.push(redirect)
      }
    },
  })
}

export const useDeleteProductRun = (
  _productRunId?: string,
  redirect: string | null = null,
) => {
  const { productRunId } = useProductParams(undefined, _productRunId)
  const queryClient = useQueryClient()
  const router = useRouter()
  const client = useApiClient()
  return useMutation({
    mutationFn: async () => {
      if (!productRunId) return
      const res = client.api.v0['product-run'][':id'].$delete({
        param: {
          id: productRunId,
        },
      })

      return await unwrapResponse(res)
    },
    onSuccess: (response) => {
      queryClient.removeQueries({
        queryKey: productOutputQueryKeys.scopeByProductRun(
          response?.data?.product?.id,
          response?.data?.id,
        ),
      })

      queryClient.removeQueries({
        queryKey: productRunQueryKeys.detail(response?.data?.id),
      })

      queryClient.invalidateQueries({
        queryKey: productRunQueryKeys.all,
      })
      queryClient.invalidateQueries({
        queryKey: productQueryKeys.detail(response?.data?.product?.id),
      })

      if (redirect) {
        router.push(redirect)
      }
    },
  })
}

export const useProductsLink = () =>
  useCallback(
    (query?: z.infer<typeof productQuerySchema>) =>
      `${PRODUCTS_BASE_PATH}?${getSearchParams(query ?? {})}`,
    [],
  )

export type ProductLinkParams = Pick<ProductDetail, 'id' | 'name'>

export const useProductLink = () =>
  useCallback(
    (product: ProductLinkParams) => `${PRODUCTS_BASE_PATH}/${product.id}`,
    [],
  )

export const useProductRunsLink = () =>
  useCallback(
    (
      product: ProductLinkParams | null,
      query?: z.infer<typeof productRunQuerySchema>,
    ) =>
      `${PRODUCTS_BASE_PATH}/${product?.id ?? '*'}/runs?${getSearchParams(query ?? {})}`,
    [],
  )

export type ProductRunLinkParams = Pick<
  ProductRunDetail,
  'id' | 'name' | 'product'
>

export const useProductRunLink = () =>
  useCallback(
    (productRun: ProductRunLinkParams) =>
      `${PRODUCTS_RUNS_BASE_PATH}/${productRun.id}`,
    [],
  )

export const useProductRunOutputsLink = () =>
  useCallback(
    (
      productRun: ProductRunLinkParams,
      query?: z.infer<typeof productOutputQuerySchema>,
    ) =>
      `${PRODUCTS_RUNS_BASE_PATH}/${productRun.id}/outputs?${getSearchParams(query ?? {})}`,
    [],
  )

export type ProductOutputLinkParams = Pick<
  ProductOutputListItem,
  'id' | 'name' | 'productRun'
>

export const useProductOutputLink = () =>
  useCallback(
    (productOutput: ProductOutputLinkParams) =>
      `${PRODUCTS_RUNS_OUTPUTS_BASE_PATH}/${productOutput.id}`,
    [],
  )
