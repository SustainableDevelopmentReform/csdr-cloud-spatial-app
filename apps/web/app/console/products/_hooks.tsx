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
import { client, QueryKey, unwrapResponse } from '~/utils/fetcher'
import { DatasetButton } from '../datasets/_components/dataset-button'
import { useDataset, useDatasetRun } from '../datasets/_hooks'
import { GeometriesButton } from '../geometries/_components/geometries-button'
import { useGeometries, useGeometriesRun } from '../geometries/_hooks'
import { GeometriesRunButton } from '../geometries/_components/geometries-run-button'
import { DatasetRunButton } from '../datasets/_components/dataset-run-button'

export type ProductListItem = NonNullable<
  InferResponseType<typeof client.api.v1.product.$get, 200>['data']
>['data'][0]
export type ProductDetail = NonNullable<
  InferResponseType<(typeof client.api.v1.product)[':id']['$get'], 200>['data']
>

export type ProductRunListItem = NonNullable<
  InferResponseType<
    (typeof client.api.v1.product)[':id']['runs']['$get'],
    200
  >['data']
>['data'][0]
export type ProductRunDetail = NonNullable<
  InferResponseType<
    (typeof client.api.v1)['product-run'][':id']['$get'],
    200
  >['data']
>

export type ProductOutputListItem = NonNullable<
  InferResponseType<
    (typeof client.api.v1)['product-run'][':id']['outputs']['$get'],
    200
  >['data']
>['data'][0]
export type ProductOutputDetail = NonNullable<
  InferResponseType<
    (typeof client.api.v1)['product-output'][':id']['$get'],
    200
  >['data']
>

export type UpdateProductPayload = NonNullable<
  InferRequestType<(typeof client.api.v1.product)[':id']['$patch']>['json']
>
export type UpdateProductRunPayload = NonNullable<
  InferRequestType<
    (typeof client.api.v1)['product-run'][':id']['$patch']
  >['json']
>
export type UpdateProductOutputPayload = NonNullable<
  InferRequestType<
    (typeof client.api.v1)['product-output'][':id']['$patch']
  >['json']
>

export type CreateProductPayload = NonNullable<
  InferRequestType<(typeof client.api.v1.product)['$post']>['json']
>
export type CreateProductRunPayload = NonNullable<
  InferRequestType<(typeof client.api.v1)['product-run']['$post']>['json']
>
export type CreateProductRunOutputPayload = NonNullable<
  InferRequestType<(typeof client.api.v1)['product-output']['$post']>['json']
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

export const useProducts = () => {
  const [isOpen, setOpen] = useState(false)
  const [page, setPage] = useState(1)

  const searchParams = useSearchParams()

  const { datasetId, geometriesId } = productQuerySchema.parse(
    Object.fromEntries(searchParams ?? []),
  )

  const { data: dataset } = useDataset(datasetId)
  const { data: geometries } = useGeometries(geometriesId)

  const { data } = useQuery({
    queryKey: [QueryKey.Product],
    queryFn: async () => {
      const res = client.api.v1.product.$get({
        query: {
          page: page.toString(),
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
    isOpen,
    setOpen,
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
  const params = useParams()
  const [isOpen, setOpen] = useState(false)
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
    queryKey: [QueryKey.ProductRun],
    queryFn: async () => {
      if (!productId) return null
      const res = client.api.v1['product'][':id']['runs'].$get({
        query: {
          page: page.toString(),
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
    isOpen,
    setOpen,
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
  const params = useParams()
  const { productRunId } = _productRunId
    ? { productRunId: _productRunId }
    : productParamsSchema.parse(params)

  const [isOpen, setOpen] = useState(false)
  const [page, setPage] = useState(1)

  const { data } = useQuery({
    queryKey: [QueryKey.ProductOutput],
    queryFn: async () => {
      if (!productRunId) return null
      const res = client.api.v1['product-run'][':id']['outputs'].$get({
        query: {
          page: page.toString(),
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
    isOpen,
    setOpen,
    page,
    setPage,
  }
}

export const useProduct = (_productId?: string) => {
  const params = useParams()
  const { productId } = _productId
    ? { productId: _productId }
    : productParamsSchema.parse(params)

  return useQuery({
    queryKey: [QueryKey.Product, productId],
    queryFn: async () => {
      if (!productId || productId === '*') return null
      const res = client.api.v1.product[':id'].$get({
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
  const params = useParams()
  const { productRunId } = _productRunId
    ? { productRunId: _productRunId }
    : productParamsSchema.parse(params)

  return useQuery({
    queryKey: [QueryKey.ProductRun, productRunId],
    queryFn: async () => {
      if (!productRunId) return null
      const res = client.api.v1['product-run'][':id'].$get({
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
  const params = useParams()
  const { productOutputId } = _productOutputId
    ? { productOutputId: _productOutputId }
    : productParamsSchema.parse(params)

  return useQuery({
    queryKey: [QueryKey.ProductOutput, productOutputId],
    queryFn: async () => {
      if (!productOutputId) return null
      const res = client.api.v1['product-output'][':id'].$get({
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
  return useMutation({
    mutationFn: async (data: CreateProductPayload) => {
      const res = client.api.v1.product.$post({
        json: data,
      })
      await unwrapResponse(res)

      queryClient.invalidateQueries({
        queryKey: [QueryKey.Product],
      })
    },
  })
}

export const useCreateProductRun = () => {
  return useMutation({
    mutationFn: async (data: CreateProductRunPayload) => {
      const res = client.api.v1['product-run'].$post({
        json: data,
      })
      await unwrapResponse(res)
    },
  })
}

export const useCreateProductRunOutput = () => {
  return useMutation({
    mutationFn: async (data: CreateProductRunOutputPayload) => {
      const res = client.api.v1['product-output'].$post({
        json: data,
      })
      await unwrapResponse(res)
    },
  })
}

export const useUpdateProduct = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: { id: string } & UpdateProductPayload) => {
      const res = client.api.v1.product[':id'].$patch({
        param: { id },
        json: payload,
      })
      return await unwrapResponse(res)
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Product, id],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Product],
      })
    },
  })
}

export const useUpdateProductRun = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: { id: string } & UpdateProductRunPayload) => {
      const res = client.api.v1['product-run'][':id'].$patch({
        param: { id },
        json: payload,
      })
      return await unwrapResponse(res)
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: [QueryKey.ProductRun, id],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.ProductRun],
      })
    },
  })
}

export const useUpdateProductOutput = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: { id: string } & UpdateProductOutputPayload) => {
      const res = client.api.v1['product-output'][':id'].$patch({
        param: { id },
        json: payload,
      })
      return await unwrapResponse(res)
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: [QueryKey.ProductOutput, id],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.ProductOutput],
      })
    },
  })
}

export const useRefreshProductRunSummary = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (productRun: Pick<ProductRunDetail, 'id'>) => {
      const res = client.api.v1['product-run'][':id']['refresh-summary'].$post({
        param: { id: productRun.id },
      })
      return await unwrapResponse(res)
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: [QueryKey.ProductRun, id],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.ProductRun],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Product, id],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Product],
      })
    },
  })
}
export const useDeleteProduct = (redirect: string | null = null) => {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const res = client.api.v1.product[':id'].$delete({
        param: {
          id,
        },
      })

      return await unwrapResponse(res)
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Product],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Product, id],
      })
      if (redirect) {
        router.push(redirect)
      }
    },
  })
}

export const useDeleteProductRun = (redirect: string | null = null) => {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const res = client.api.v1['product-run'][':id'].$delete({
        param: {
          id,
        },
      })

      return await unwrapResponse(res)
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: [QueryKey.ProductRun],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Product, id],
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
      `/console/products?${new URLSearchParams(query ?? {}).toString()}`,
    [],
  )

export type ProductLinkParams = Pick<ProductDetail, 'id' | 'name'>

export const useProductLink = () =>
  useCallback(
    (product: ProductLinkParams) => `/console/products/${product.id}`,
    [],
  )

export const useProductRunsLink = () =>
  useCallback(
    (
      product: ProductLinkParams | null,
      query?: z.infer<typeof productRunQuerySchema>,
    ) =>
      `/console/products/${product?.id ?? '*'}/runs?${new URLSearchParams(query ?? {}).toString()}`,
    [],
  )

export type ProductRunLinkParams = Pick<
  ProductRunDetail,
  'id' | 'name' | 'product'
>

export const useProductRunLink = () =>
  useCallback(
    (productRun: ProductRunLinkParams) =>
      `/console/products/${productRun.product.id}/runs/${productRun.id}`,
    [],
  )

export type ProductOutputLinkParams = Pick<
  ProductOutputListItem,
  'id' | 'name' | 'productRun'
>

export const useProductOutputLink = () =>
  useCallback(
    (productOutput: ProductOutputLinkParams) =>
      `/console/products/${productOutput.productRun.product.id}/runs/${productOutput.productRun.id}/outputs/${productOutput.id}`,
    [],
  )
