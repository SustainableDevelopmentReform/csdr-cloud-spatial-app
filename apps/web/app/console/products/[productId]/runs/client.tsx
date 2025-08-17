'use client'

import { Button } from '@repo/ui/components/ui/button'
import { useMemo } from 'react'
import Pagination from '~/components/pagination'
import BaseCrudTable from '../../../../../components/crud-table'
import ProductRunForm from '../../_components/form'
import {
  ProductRun,
  useDeleteProductRun,
  useProduct,
  useProductRunLink,
  useProductRuns,
} from '../../_hooks'
import { ColumnDef, createColumnHelper } from '@tanstack/react-table'
import { Badge } from '@repo/ui/components/ui/badge'
import { VariableButton } from '../../../variables/_components/variable-button'

const columnHelper = createColumnHelper<ProductRun>()

const ProductRunFeature = () => {
  const { data, isOpen, setOpen, page, setPage } = useProductRuns()
  const { data: product } = useProduct()

  const deleteProductRun = useDeleteProductRun()
  const productLink = useProductRunLink()

  const baseColumns = useMemo(() => {
    return ['id', 'createdAt', 'updatedAt'] as const
  }, [])

  // Add column to show mainfile badge if product.mainRunId === productRun.id
  const columns = useMemo(() => {
    return [
      {
        header: 'Variables',
        cell: ({ row }) => {
          return (
            <div className="flex flex-wrap gap-2">
              {row.original.outputSummaryVariables.map((variable) => (
                <VariableButton
                  variable={variable.variable}
                  key={variable.variable.id}
                />
              ))}
            </div>
          )
        },
      },
      {
        header: 'Main Run',
        cell: ({ row }) => {
          return (
            <div>
              {row.original.id === product?.mainRun?.id ? (
                <Badge color="primary">Main Run</Badge>
              ) : null}
            </div>
          )
        },
      },
    ] satisfies ColumnDef<ProductRun>[]
  }, [product?.mainRun?.id])

  return (
    <div>
      <div className="flex justify-between">
        <h1 className="text-3xl font-medium mb-2">Product Runs</h1>
        <ProductRunForm
          key={`add-product-form-${isOpen}`}
          isOpen={isOpen}
          onOpen={() => setOpen(true)}
          onClose={() => setOpen(false)}
        >
          <Button>Add Product Run</Button>
        </ProductRunForm>
      </div>
      <div className="mt-8">
        <BaseCrudTable
          data={data?.data || []}
          baseColumns={baseColumns}
          extraColumns={columns}
          title="ProductRun"
          deleteItem={deleteProductRun}
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

export default ProductRunFeature
