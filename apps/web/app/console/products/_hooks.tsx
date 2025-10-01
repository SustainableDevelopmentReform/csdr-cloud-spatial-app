'use client'

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { InferRequestType, InferResponseType } from 'hono/client'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState } from 'react'
import { z } from 'zod'
import { Client, QueryKey, unwrapResponse } from '~/utils/apiClient'
import { DatasetButton } from '../datasets/_components/dataset-button'
import { useDataset, useDatasetRun } from '../datasets/_hooks'
import { GeometriesButton } from '../geometries/_components/geometries-button'
import { useGeometries, useGeometriesRun } from '../geometries/_hooks'
import { GeometriesRunButton } from '../geometries/_components/geometries-run-button'
import { DatasetRunButton } from '../datasets/_components/dataset-run-button'
import { useApiClient } from '../../../hooks/useApiClient'

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

const productQuerySchema = z.object({
  datasetId: z.string().optional(),
  geometriesId: z.string().optional(),
})

const productRunQuerySchema = z.object({
  datasetRunId: z.string().optional(),
  geometriesRunId: z.string().optional(),
})

export const useProductParams = (
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
  const [page, setPage] = useState(1)
  const client = useApiClient()
  const searchParams = useSearchParams()

  const { datasetId, geometriesId } = productQuerySchema.parse(
    Object.fromEntries(searchParams ?? []),
  )

  const { data: dataset } = useDataset(datasetId)
  const { data: geometries } = useGeometries(geometriesId)

  const { data } = useQuery({
    queryKey: [QueryKey.Product, datasetId, geometriesId],
    queryFn: async () => {
      const res = client.api.v0.product.$get({
        query: {
          page,
          datasetId,
          geometriesId,
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
  const params = useParams()
  const [page, setPage] = useState(1)

  const { productId } = _productId
    ? { productId: _productId }
    : productParamsSchema.parse(params)

  const searchParams = useSearchParams()

  const { geometriesRunId, datasetRunId } = productRunQuerySchema.parse(
    Object.fromEntries(searchParams ?? []),
  )

  const { data: datasetRun } = useDatasetRun(datasetRunId)
  const { data: geometriesRun } = useGeometriesRun(geometriesRunId)

  const { data } = useQuery({
    queryKey: [QueryKey.ProductRun, productId, datasetRunId, geometriesRunId],
    queryFn: async () => {
      if (!productId) return null
      const res = client.api.v0['product'][':id']['runs'].$get({
        query: {
          page,
          datasetRunId,
          geometriesRunId,
        },
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
    page,
    setPage,
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

export const useProductOutputs = (_productRunId?: string) => {
  const client = useApiClient()
  const params = useParams()
  const { productRunId } = _productRunId
    ? { productRunId: _productRunId }
    : productParamsSchema.parse(params)

  const [page, setPage] = useState(1)

  const { data } = useQuery({
    queryKey: [QueryKey.ProductOutput],
    queryFn: async () => {
      if (!productRunId) return null
      const res = client.api.v0['product-run'][':id']['outputs'].$get({
        query: {
          page,
        },
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
    page,
    setPage,
  }
}

export const useProduct = (_productId?: string) => {
  const { productId } = useProductParams(_productId)
  const client = useApiClient()
  return useQuery({
    queryKey: [QueryKey.Product, productId],
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
    queryKey: [QueryKey.ProductRun, productRunId],
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
    queryKey: [QueryKey.ProductOutput, productOutputId],
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
        queryKey: [QueryKey.Product],
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
        queryKey: [QueryKey.ProductRun],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Product, data.productId],
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
        queryKey: [QueryKey.ProductOutput],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.ProductRun, data.productRunId],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.ProductRun],
      })
      // queryClient.invalidateQueries({
      //   queryKey: [QueryKey.Product, data.productRun.productId],
      // })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Product],
      })
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
        queryKey: [QueryKey.Product, productId],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Product],
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
        queryKey: [QueryKey.ProductRun, productRunId],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.ProductRun],
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
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryKey.ProductOutput, productOutputId],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.ProductOutput],
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
        queryKey: [QueryKey.ProductRun, run?.id],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.ProductRun],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Product, run?.product.id],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Product],
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
        queryKey: [QueryKey.ProductRun, run?.id],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.ProductRun],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Product, run?.product.id],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Product],
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
        queryKey: [QueryKey.Product],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Product, productId],
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
        queryKey: [QueryKey.ProductRun],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Product, productRunId],
      })
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
      `${PRODUCTS_BASE_PATH}?${new URLSearchParams(query ?? {}).toString()}`,
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
      `${PRODUCTS_BASE_PATH}/${product?.id ?? '*'}/runs?${new URLSearchParams(query ?? {}).toString()}`,
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
