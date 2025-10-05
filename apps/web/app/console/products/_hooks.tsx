'use client'

import {
  productOutputExportQuerySchema,
  productOutputQuerySchema,
  productQuerySchema,
  productRunQuerySchema,
} from '@repo/schemas/crud'
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { InferRequestType, InferResponseType } from 'hono/client'
import { useParams, useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { z } from 'zod'
import { Client, unwrapResponse } from '~/utils/apiClient'
import { getSearchParams } from '~/utils/browser'
import { useApiClient } from '../../../hooks/useApiClient'
import { useQueryWithSearchParams } from '../../../hooks/useSearchParams'
import { DatasetButton } from '../datasets/_components/dataset-button'
import { DatasetRunButton } from '../datasets/_components/dataset-run-button'
import { useDataset, useDatasetRun } from '../datasets/_hooks'
import { GeometriesButton } from '../geometries/_components/geometries-button'
import { GeometriesRunButton } from '../geometries/_components/geometries-run-button'
import { useGeometries, useGeometriesRun } from '../geometries/_hooks'

export type ProductListItem = NonNullable<
  InferResponseType<Client['api']['v0']['product']['$get'], 200>['data']
>['data'][0]
export type ProductDetail = NonNullable<
  InferResponseType<Client['api']['v0']['product'][':id']['$get'], 200>['data']
>

export type ProductRunListItem = NonNullable<
  InferResponseType<
    Client['api']['v0']['product'][':id']['runs']['$get'],
    200
  >['data']
>['data'][0]
export type ProductRunDetail = NonNullable<
  InferResponseType<
    Client['api']['v0']['product-run'][':id']['$get'],
    200
  >['data']
>

export type ProductOutputListItem = NonNullable<
  InferResponseType<
    Client['api']['v0']['product-run'][':id']['outputs']['$get'],
    200
  >['data']
>['data'][0]
export type ProductOutputExportListItem = NonNullable<
  InferResponseType<
    Client['api']['v0']['product-run'][':id']['outputs']['export']['$get'],
    200
  >['data']
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

const productParamsSchema = z.object({
  productId: z.string().optional(),
  productRunId: z.string().optional(),
  productOutputId: z.string().optional(),
})

const queryKeys = {
  productAll: ['product'] as const,
  productDetail: (productId: string | undefined) =>
    [...queryKeys.productAll, productId] as const,
  productList: (query: z.infer<typeof productQuerySchema> | undefined) =>
    [...queryKeys.productAll, { query }] as const,
  productRunAll: ['productRun'] as const,
  productRunDetail: (productRunId: string | undefined) =>
    [...queryKeys.productRunAll, productRunId] as const,
  productRunList: (
    productId: string | undefined,
    query: z.infer<typeof productRunQuerySchema> | undefined,
  ) => [...queryKeys.productRunAll, productId, { query }] as const,
  productOutputAll: ['productOutput'] as const,
  productOutputDetail: (productOutputId: string | undefined) =>
    [...queryKeys.productOutputAll, productOutputId] as const,
  productOutputList: (
    productRunId: string | undefined,
    query: z.infer<typeof productOutputQuerySchema> | undefined,
  ) => [...queryKeys.productOutputAll, productRunId, { query }] as const,
  productOutputExportList: (
    productRunId: string | undefined,
    query: z.infer<typeof productOutputExportQuerySchema> | undefined,
  ) => [...queryKeys.productOutputAll, productRunId, { query }] as const,
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

export const useProducts = () => {
  const client = useApiClient()

  const { query, setSearchParams } =
    useQueryWithSearchParams(productQuerySchema)

  const { data: dataset } = useDataset(query?.datasetId)
  const { data: geometries } = useGeometries(query?.geometriesId)

  const { data } = useQuery({
    queryKey: queryKeys.productList(query),
    queryFn: async () => {
      if (!query) return null
      const res = client.api.v0.product.$get({
        query,
      })

      const json = await unwrapResponse(res)

      return json.data
    },
    placeholderData: keepPreviousData,
  })

  return {
    data,
    query,
    setSearchParams,
    filters: [
      dataset && <DatasetButton dataset={dataset} key={dataset.id} />,
      geometries && (
        <GeometriesButton geometries={geometries} key={geometries.id} />
      ),
    ].filter((d) => !!d) as React.ReactNode[],
  }
}

export const useProductRuns = (_productId?: string) => {
  const client = useApiClient()
  const { query, setSearchParams } = useQueryWithSearchParams(
    productRunQuerySchema,
  )

  const { productId } = useProductParams(_productId)

  const { data: datasetRun } = useDatasetRun(query?.datasetRunId)
  const { data: geometriesRun } = useGeometriesRun(query?.geometriesRunId)

  const { data } = useQuery({
    queryKey: queryKeys.productRunList(productId, query),
    queryFn: async () => {
      if (!productId || !query) return null
      const res = client.api.v0['product'][':id']['runs'].$get({
        query,
        param: {
          id: productId,
        },
      })

      const json = await unwrapResponse(res)

      return json.data
    },
    placeholderData: keepPreviousData,
  })

  return {
    data,
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
    ].filter((d) => !!d) as React.ReactNode[],
  }
}

export const useProductOutputs = (
  _productRunId?: string,
  _query?: z.infer<typeof productOutputQuerySchema>,
) => {
  const client = useApiClient()
  const { productRunId } = useProductParams(undefined, _productRunId)
  const { query, setSearchParams } = useQueryWithSearchParams(
    productOutputQuerySchema,
    _query,
  )

  const { data } = useQuery({
    queryKey: queryKeys.productOutputList(productRunId, query),
    queryFn: async () => {
      if (!productRunId || !query) return null
      const res = client.api.v0['product-run'][':id']['outputs'].$get({
        query,
        param: {
          id: productRunId,
        },
      })

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

export const useProductOutputsExport = (
  _productRunId?: string,
  _query?: Partial<z.infer<typeof productOutputExportQuerySchema>>,
  fetch = true,
) => {
  const client = useApiClient()
  const { productRunId } = useProductParams(undefined, _productRunId)
  const { query, setSearchParams } = useQueryWithSearchParams(
    productOutputExportQuerySchema,
    _query,
  )

  const { data } = useQuery({
    queryKey: queryKeys.productOutputExportList(productRunId, query),
    queryFn: async () => {
      if (!productRunId || !query || !fetch) return null
      const res = client.api.v0['product-run'][':id']['outputs']['export'].$get(
        {
          query,
          param: {
            id: productRunId,
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
    placeholderData: keepPreviousData,
  })

  return {
    data,
    query,
    setSearchParams,
  }
}

export const useProduct = (_productId?: string) => {
  const { productId } = useProductParams(_productId)
  const client = useApiClient()
  return useQuery({
    queryKey: queryKeys.productDetail(productId),
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
    placeholderData: keepPreviousData,
  })
}

export const useProductRun = (_productRunId?: string) => {
  const { productRunId } = useProductParams(undefined, _productRunId)
  const client = useApiClient()
  return useQuery({
    queryKey: queryKeys.productRunDetail(productRunId),
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
    placeholderData: keepPreviousData,
  })
}

export const useProductOutput = (_productOutputId?: string) => {
  const { productOutputId } = useProductParams(
    undefined,
    undefined,
    _productOutputId,
  )
  const client = useApiClient()
  return useQuery({
    queryKey: queryKeys.productOutputDetail(productOutputId),
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
    placeholderData: keepPreviousData,
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
      await unwrapResponse(res, 201)

      queryClient.invalidateQueries({
        queryKey: queryKeys.productAll,
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
      await unwrapResponse(res, 201)
      queryClient.invalidateQueries({
        queryKey: queryKeys.productRunAll,
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.productDetail(data.productId),
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
      await unwrapResponse(res, 201)
      queryClient.invalidateQueries({
        queryKey: queryKeys.productOutputAll,
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.productRunDetail(data.productRunId),
      })
      // queryClient.invalidateQueries({
      //   queryKey: queryKeys.productDetail(data.productRun.productId),
      // })
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
        queryKey: queryKeys.productAll,
      })
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
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.productRunAll,
      })
      // queryClient.invalidateQueries({
      //   queryKey: queryKeys.productDetail(payload.productId),
      // })
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
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.productOutputAll,
      })
      // queryClient.invalidateQueries({
      //   queryKey: queryKeys.productRunDetail(payload.productRunId),
      // })
      // queryClient.invalidateQueries({
      //   queryKey: queryKeys.productDetail(payload.productRun.productId),
      // })
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
        queryKey: queryKeys.productRunAll,
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.productAll,
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
        queryKey: queryKeys.productRunAll,
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.productAll,
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
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.productAll,
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
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.productRunAll,
      })
      // queryClient.invalidateQueries({
      //   queryKey: queryKeys.productDetail(data.productRun.productId),
      // })
      if (redirect) {
        router.push(redirect)
      }
    },
  })
}

export const PRODUCTS_BASE_PATH = '/console/products'

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

export const PRODUCTS_RUNS_BASE_PATH = '/console/product-run'

export const useProductRunLink = () =>
  useCallback(
    (productRun: ProductRunLinkParams) =>
      `${PRODUCTS_RUNS_BASE_PATH}/${productRun.id}`,
    [],
  )

export const useProductRunOutputsLink = () =>
  useCallback(
    (productRun: ProductRunLinkParams) =>
      `${PRODUCTS_RUNS_BASE_PATH}/${productRun.id}/outputs`,
    [],
  )

export type ProductOutputLinkParams = Pick<
  ProductOutputListItem,
  'id' | 'name' | 'productRun'
>

export const PRODUCTS_RUNS_OUTPUTS_BASE_PATH = '/console/product-output'

export const useProductOutputLink = () =>
  useCallback(
    (productOutput: ProductOutputLinkParams) =>
      `${PRODUCTS_RUNS_OUTPUTS_BASE_PATH}/${productOutput.id}`,
    [],
  )
