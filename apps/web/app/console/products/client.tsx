'use client'

import { Button } from '@repo/ui/components/ui/button'
import { ColumnDef, createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import Pagination from '~/components/pagination'
import BaseCrudTable from '../../../components/crud-table'
import { DatasetButton } from '../datasets/_components/dataset-button'
import { GeometriesButton } from '../geometries/_components/geometries-button'
import { VariableButtons } from '../variables/_components/variable-button'
import ProductForm from './_components/form'
import {
  ProductListItem,
  useDeleteProduct,
  useProductLink,
  useProducts,
} from './_hooks'
import { ProductButton } from './_components/product-button'

const columnHelper = createColumnHelper<ProductListItem>()

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
  columnHelper.display({
    id: 'variables',
    header: () => <span>Variables</span>,
    cell: ({ row }) => {
      return (
        <VariableButtons
          variables={row.original.mainRun?.outputSummary?.variables.map(
            (v) => v.variable,
          )}
        />
      )
    },
    size: 120,
  }),
  columnHelper.display({
    id: 'dataset',
    header: () => <span>Dataset</span>,
    cell: ({ row }) => {
      return <DatasetButton dataset={row.original?.dataset} />
    },
    size: 120,
  }),
  columnHelper.display({
    id: 'geometries',
    header: () => <span>Geometries</span>,
    cell: ({ row }) => {
      return <GeometriesButton geometries={row.original?.geometries} />
    },
    size: 120,
  }),
] as ColumnDef<ProductListItem>[]

const ProductFeature = () => {
  const { data, isOpen, setOpen, page, setPage, filters } = useProducts()

  const deleteProduct = useDeleteProduct()
  const productLink = useProductLink()

  const baseColumns = useMemo(() => {
    return ['createdAt', 'updatedAt'] as const
  }, [])

  return (
    <div>
      <div className="flex justify-between">
        <h1 className="text-3xl font-medium mb-2 flex gap-2 items-center align-middle ">
          Products
          <div className="flex gap-2 items-center justify-center align-middle">
            {filters}
          </div>
        </h1>
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
          itemLink={productLink}
          itemButton={(product) => <ProductButton product={product} />}
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
