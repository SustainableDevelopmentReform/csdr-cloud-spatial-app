'use client'

import { Button } from '@repo/ui/components/ui/button'
import { ColumnDef, createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import Pagination from '~/components/pagination'
import BaseCrudTable from '../../../../../components/crud-table'
import { MainRunBadge } from '../../../_components/main-run-badge'
import { VariableButtons } from '../../../variables/_components/variable-button'
import ProductRunForm from '../../_components/form'
import {
  ProductRun,
  useDeleteProductRun,
  useProduct,
  useProductRunLink,
  useProductRuns,
} from '../../_hooks'
import { ProductRunButton } from '../../_components/product-run-button'

const columnHelper = createColumnHelper<ProductRun>()

const ProductRunFeature = () => {
  const { data, isOpen, setOpen, page, setPage, filters } = useProductRuns()
  const { data: product } = useProduct()

  const deleteProductRun = useDeleteProductRun()
  const productLink = useProductRunLink()

  const baseColumns = useMemo(() => {
    return ['createdAt', 'updatedAt'] as const
  }, [])

  // Add column to show mainfile badge if product.mainRunId === productRun.id
  const columns = useMemo(() => {
    return [
      {
        header: 'Variables',
        cell: ({ row }) => {
          return (
            <VariableButtons
              variables={row.original.outputSummary.variables.map(
                (v) => v.variable,
              )}
            />
          )
        },
      },
      {
        header: 'Number of outputs',
        cell: ({ row }) => {
          return <div>{row.original.outputSummary.outputCount}</div>
        },
      },
      {
        header: 'Main Run',
        cell: ({ row }) => {
          return (
            <div>
              {product?.mainRun && row.original.id === product?.mainRun?.id ? (
                <MainRunBadge variant="product" />
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
        <h1 className="text-3xl font-medium mb-2 flex gap-2 items-center align-middle ">
          Product Runs
          <div className="flex gap-2 items-center justify-center align-middle">
            {filters}
          </div>
        </h1>
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
          itemLink={productLink}
          itemButton={(productRun) => (
            <ProductRunButton productRun={productRun} />
          )}
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
