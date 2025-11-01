'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { createProductRunSchema } from '@repo/schemas/crud'
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/ui/form'
import { ColumnDef, createColumnHelper } from '@tanstack/react-table'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import Pagination from '~/components/table/pagination'
import CrudFormDialog from '../../../../../components/form/crud-form-dialog'
import { CrudFormRunFields } from '../../../../../components/form/crud-form-run-fields'
import BaseCrudTable from '../../../../../components/table/crud-table'
import { SearchInput } from '../../../../../components/table/search-input'
import { DatasetRunSelect } from '../../../dataset/_components/dataset-run-select'
import { GeometriesRunSelect } from '../../../geometries/_components/geometries-run-select'
import { VariableButtons } from '../../../variable/_components/variable-button'
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
  const { data, query, setSearchParams, filters } = useProductRuns(
    undefined,
    undefined,
    true,
  )
  const createProductRun = useCreateProductRun()
  const productLink = useProductRunLink()

  const { data: product } = useProduct()

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
                  <DatasetRunSelect
                    datasetId={product?.dataset.id}
                    value={field.value}
                    onChange={field.onChange}
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
                  <GeometriesRunSelect
                    geometriesId={product?.geometries.id}
                    value={field.value}
                    onChange={field.onChange}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <CrudFormRunFields form={form} />
          </CrudFormDialog>
        )}
      </div>
      <div>
        <SearchInput
          placeholder="Search product runs"
          value={query?.search ?? ''}
          onChange={(e) => setSearchParams({ search: e.target.value })}
        />
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
          query={query}
          onSortChange={setSearchParams}
        />
        <Pagination
          className="justify-end mt-4"
          totalPages={data?.pageCount ?? 1}
          currentPage={query?.page ?? 1}
          onPageChange={(page) => setSearchParams({ page })}
        />
      </div>
    </div>
  )
}

export default ProductRunFeature
