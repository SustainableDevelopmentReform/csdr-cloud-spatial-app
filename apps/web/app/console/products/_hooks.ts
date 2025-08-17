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

export type Product = NonNullable<
  InferResponseType<typeof client.api.v1.product.$get, 200>['data']
>['data'][0]
export type ProductRun = NonNullable<
  InferResponseType<
    (typeof client.api.v1)['product-run'][':id']['$get'],
    200
  >['data']
>
export type ProductOutput = NonNullable<
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

export type CreateProductPayload = NonNullable<
  InferRequestType<(typeof client.api.v1.product)['$post']>['json']
>
export type CreateProductRunPayload = NonNullable<
  InferRequestType<(typeof client.api.v1)['product-run']['$post']>['json']
>
export type CreateProductRunOutputPayload = NonNullable<
  InferRequestType<(typeof client.api.v1)['product-output']['$post']>['json']
>

const productQuerySchema = z.object({
  productId: z.string().optional(),
  productRunId: z.string().optional(),
  productOutputId: z.string().optional(),
})

export const useProducts = () => {
  const [isOpen, setOpen] = useState(false)
  const [page, setPage] = useState(1)

  const { data } = useQuery({
    queryKey: [QueryKey.Product],
    queryFn: async () => {
      const res = client.api.v1.product.$get({
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
    isOpen,
    setOpen,
    page,
    setPage,
  }
}

export const useProductRuns = (_productId?: string) => {
  const { productId } = _productId
    ? { productId: _productId }
    : productQuerySchema.parse(useParams())

  const [isOpen, setOpen] = useState(false)
  const [page, setPage] = useState(1)

  const { data } = useQuery({
    queryKey: [QueryKey.ProductRun],
    queryFn: async () => {
      if (!productId) return null
      const res = client.api.v1['product'][':id']['runs'].$get({
        query: {
          page: page.toString(),
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
  }
}
export const useProductOutputs = (_productRunId?: string) => {
  const { productRunId } = _productRunId
    ? { productRunId: _productRunId }
    : productQuerySchema.parse(useParams())

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
  const { productId } = _productId
    ? { productId: _productId }
    : productQuerySchema.parse(useParams())

  return useQuery({
    queryKey: [QueryKey.Product, productId],
    queryFn: async () => {
      if (!productId) return null
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
  const { productRunId } = _productRunId
    ? { productRunId: _productRunId }
    : productQuerySchema.parse(useParams())

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
  const { productOutputId } = _productOutputId
    ? { productOutputId: _productOutputId }
    : productQuerySchema.parse(useParams())

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

export const useRefreshProductRunSummary = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (productRun: Pick<ProductRun, 'id'>) => {
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
        queryKey: [QueryKey.Product, id],
      })
    },
  })
}
export const useDeleteProduct = (redirect: string | null = null) => {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async (product: Product) => {
      const res = client.api.v1.product[':id'].$delete({
        param: {
          id: product.id,
        },
      })

      await unwrapResponse(res)
      return product
    },
    onSuccess: (product) => {
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Product],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Product, product.id],
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
    mutationFn: async (productRun: ProductRun) => {
      const res = client.api.v1['product-run'][':id'].$delete({
        param: {
          id: productRun.id,
        },
      })

      await unwrapResponse(res)
      return productRun
    },
    onSuccess: (productRun) => {
      queryClient.invalidateQueries({
        queryKey: [QueryKey.ProductRun],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Product, productRun.id],
      })
      if (redirect) {
        router.push(redirect)
      }
    },
  })
}

export const useProductLink = () =>
  useCallback(
    (product: Pick<Product, 'id'>) => `/console/products/${product.id}`,
    [],
  )

export const useProductRunLink = () =>
  useCallback(
    (productRun: Pick<ProductRun, 'id' | 'productId'>) =>
      `/console/products/${productRun.productId}/runs/${productRun.id}`,
    [],
  )

export const useProductOutputLink = () =>
  useCallback(
    (productOutput: Pick<ProductOutput, 'id' | 'productRunId'>) =>
      `/console/products/${productOutput.productRunId}/outputs/${productOutput.id}`,
    [],
  )
