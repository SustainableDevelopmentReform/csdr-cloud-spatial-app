'use client'

import { Button } from '@repo/ui/components/ui/button'
import { useMemo } from 'react'
import Pagination from '~/components/pagination'
import BaseCrudTable from '../../../components/crud-table'
import ProductForm from './_components/form'
import {
  useProductLink,
  useDeleteProduct,
  useProducts,
  Product,
} from './_hooks'
import { ColumnDef, createColumnHelper } from '@tanstack/react-table'

const columnHelper = createColumnHelper<Product>()

const columns = [
  columnHelper.accessor((row) => row.mainRun?.outputSummary?.startTime, {
    id: 'startTime',
    header: () => <span>Start Time</span>,
    cell: (info) => {
      const value = info.getValue()
      if (!value) return null
      return new Date(value).toLocaleDateString()
    },
    size: 120,
  }),
  columnHelper.accessor((row) => row.mainRun?.outputSummary?.endTime, {
    id: 'endTime',
    header: () => <span>End Time</span>,
    cell: (info) => {
      const value = info.getValue()
      if (!value) return null
      return new Date(value).toLocaleDateString()
    },
    size: 120,
  }),
  columnHelper.accessor((row) => row.mainRun?.outputSummary?.variables, {
    id: 'variables',
    header: () => <span>Variables</span>,
    cell: (info) => {
      const value = info.getValue()
      if (!value) return null
      return value.map((v) => v.variable.name).join(', ')
    },
    size: 120,
  }),
] as ColumnDef<Product>[]

const ProductFeature = () => {
  const { data, isOpen, setOpen, page, setPage } = useProducts()

  const deleteProduct = useDeleteProduct()
  const productLink = useProductLink()

  const baseColumns = useMemo(() => {
    return ['name', 'createdAt', 'updatedAt'] as const
  }, [])

  return (
    <div>
      <div className="flex justify-between">
        <h1 className="text-3xl font-medium mb-2">Products</h1>
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
          extraColumns={columns}
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
