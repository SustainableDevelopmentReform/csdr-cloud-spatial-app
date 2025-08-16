'use client'

import { Button } from '@repo/ui/components/ui/button'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import Pagination from '~/components/pagination'
import { client, QueryKey, unwrapResponse } from '~/utils/fetcher'
import BaseCrudTable from '../../../components/crud-table'
import ProductForm from './_components/form'
import { InferResponseType } from 'hono/client'

type Product = NonNullable<
  InferResponseType<typeof client.api.v1.product.$get, 200>['data']
>['data'][0]

const ProductFeature = () => {
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

  const deleteProduct = useCallback(async (product: Product) => {
    const res = client.api.v1.product[':id'].$delete({
      param: {
        id: product.id,
      },
    })

    await unwrapResponse(res)
  }, [])

  const productLink = useCallback(
    (product: Product) => `/console/product/${product.id}`,
    [],
  )

  const baseColumns = useMemo(() => {
    return ['name', 'description', 'createdAt', 'updatedAt'] as const
  }, [])

  return (
    <div>
      <div className="flex justify-between">
        <h1 className="text-3xl font-medium mb-2">Product</h1>
        <ProductForm
          key={`add-product-form-${isOpen}`}
          isOpen={isOpen}
          onOpen={() => setOpen(true)}
          onClose={() => setOpen(false)}
        >
          <Button>Add Product</Button>
        </ProductForm>
      </div>
      <div className="mt-8">
        <BaseCrudTable
          data={data?.data || []}
          baseColumns={baseColumns}
          queryKey={QueryKey.Product}
          title="Product"
          deleteItem={deleteProduct}
          itemLink={productLink}
        />
        <Pagination
          className="justify-end mt-4"
          totalPages={data?.pageCount ?? 1}
          currentPage={page}
          onPageChange={setPage}
        />
      </div>
    </div>
  )
}

export default ProductFeature
