'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { createProductRunSchema } from '@repo/schemas/crud'
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/ui/form'
import { SelectWithSearch } from '@repo/ui/components/ui/select-with-search'
import { ColumnDef, createColumnHelper } from '@tanstack/react-table'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import Pagination from '~/components/pagination'
import CrudFormDialog from '../../../../../components/crud-form-dialog'
import { CrudFormRunFields } from '../../../../../components/crud-form-run-fields'
import BaseCrudTable from '../../../../../components/crud-table'
import { useDatasetRuns } from '../../../datasets/_hooks'
import { useGeometriesRuns } from '../../../geometries/_hooks'
import { VariableButtons } from '../../../variables/_components/variable-button'
import { ProductButton } from '../../_components/product-button'
import { ProductRunButton } from '../../_components/product-run-button'
import {
  ProductRunListItem,
  useCreateProductRun,
  useProduct,
  useProductRunLink,
  useProductRuns,
} from '../../_hooks'

const columnHelper = createColumnHelper<ProductRunListItem>()

const ProductRunFeature = () => {
  const { data, page, setPage, filters } = useProductRuns()
  const createProductRun = useCreateProductRun()
  const productLink = useProductRunLink()

  const { data: product } = useProduct()
  const { data: datasetRuns } = useDatasetRuns(product?.dataset.id)
  const { data: geometriesRuns } = useGeometriesRuns(product?.geometries.id)

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
              variables={row.original.outputSummary?.variables.map(
                (v) => v.variable,
              )}
            />
          )
        },
      },
      {
        header: 'Number of outputs',
        cell: ({ row }) => {
          return <div>{row.original.outputSummary?.outputCount}</div>
        },
      },
    ] satisfies ColumnDef<ProductRunListItem>[]
  }, [])

  const form = useForm({
    resolver: zodResolver(createProductRunSchema),
  })

  useEffect(() => {
    if (product) {
      form.setValue('productId', product.id)
    }
  }, [product])

  return (
    <div>
      <div className="flex justify-between">
        <h1 className="text-3xl font-medium mb-2 flex gap-2 items-center align-middle ">
          Product Runs
          <div className="flex gap-2 items-center justify-center align-middle">
            {filters}
          </div>
        </h1>
        {product && (
          <CrudFormDialog
            form={form}
            mutation={createProductRun}
            buttonText="Add Product Run"
            entityName="Product Run"
            entityNamePlural="product runs"
          >
            <FormField
              control={form.control}
              name="datasetRunId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dataset Run</FormLabel>
                  <SelectWithSearch
                    options={datasetRuns?.data}
                    value={field.value}
                    onSelect={field.onChange}
                    onSearch={() => {}}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="geometriesRunId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Geometries Run</FormLabel>
                  <SelectWithSearch
                    options={geometriesRuns?.data}
                    value={field.value}
                    onSelect={field.onChange}
                    onSearch={() => {}}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <CrudFormRunFields form={form} />
          </CrudFormDialog>
        )}
      </div>
      <div className="mt-8">
        <BaseCrudTable
          data={data?.data || []}
          baseColumns={baseColumns}
          extraColumns={columns}
          title="ProductRun"
          itemLink={productLink}
          itemButton={(productRun) => (
            <div className="flex flex-wrap gap-2">
              {!product && <ProductButton product={productRun.product} />}
              <ProductRunButton productRun={productRun} />
            </div>
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
