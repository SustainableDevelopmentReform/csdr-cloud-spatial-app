'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { createProductRunSchema } from '@repo/schemas/crud'
import { FormField, FormItem, FormMessage } from '@repo/ui/components/ui/form'
import { ColumnDef, createColumnHelper } from '@tanstack/react-table'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import Pagination from '~/components/table/pagination'
import { BadgeLink } from '../../../../../components/badge-link'
import CrudFormDialog from '../../../../../components/form/crud-form-dialog'
import { CrudFormRunFields } from '../../../../../components/form/crud-form-run-fields'
import BaseCrudTable from '../../../../../components/table/crud-table'
import { SearchInput } from '../../../../../components/table/search-input'
import { DatasetRunSelect } from '../../../dataset/_components/dataset-run-select'
import { GeometriesRunSelect } from '../../../geometries/_components/geometries-run-select'
import { IndicatorButtons } from '../../../indicator/_components/indicator-button'
import { ProductButton } from '../../_components/product-button'
import { ProductRunButton } from '../../_components/product-run-button'
import {
  ProductRunListItem,
  useCreateProductRun,
  useProduct,
  useProductRunLink,
  useProductRunOutputsLink,
  useProductRuns,
} from '../../_hooks'

const columnHelper = createColumnHelper<ProductRunListItem>()

const ProductRunFeature = () => {
  const {
    data,
    query,
    setSearchParams,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
    filters,
  } = useProductRuns(undefined, undefined, true)
  const createProductRun = useCreateProductRun()
  const productLink = useProductRunLink()
  const productRunOutputsLink = useProductRunOutputsLink()

  const { data: product } = useProduct()

  const baseColumns = useMemo(() => {
    return ['createdAt'] as const
  }, [])

  // Add column to show mainfile badge if product.mainRunId === productRun.id
  const columns = useMemo(() => {
    return [
      {
        header: 'Indicators',
        cell: ({ row }) => {
          return (
            <IndicatorButtons
              indicators={row.original.outputSummary?.indicators}
            />
          )
        },
      },
      {
        header: 'Number of outputs',
        cell: ({ row }) => {
          return (
            <BadgeLink
              href={productRunOutputsLink(row.original)}
              variant="outline"
            >
              {row.original.outputSummary?.outputCount}
            </BadgeLink>
          )
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
        <h1 className="text-3xl font-medium mb-2 flex gap-2 items-center align-middle">
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
            hiddenFields={['visibility']}
          >
            {product.dataset && (
              <FormField
                control={form.control}
                name="datasetRunId"
                render={({ field }) => (
                  <FormItem>
                    <DatasetRunSelect
                      datasetId={product.dataset!.id}
                      value={field.value}
                      onChange={(nextValue) =>
                        field.onChange(nextValue?.id ?? null)
                      }
                      isClearable
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {product.geometries && (
              <FormField
                control={form.control}
                name="geometriesRunId"
                render={({ field }) => (
                  <FormItem>
                    <GeometriesRunSelect
                      geometriesId={product.geometries!.id}
                      value={field.value}
                      onChange={(nextValue) =>
                        field.onChange(nextValue?.id ?? null)
                      }
                      isClearable
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
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
          isLoading={isLoading}
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
          hasNextPage={!!hasNextPage}
          isLoading={isFetchingNextPage}
          onLoadMore={() => fetchNextPage()}
        />
      </div>
    </div>
  )
}

export default ProductRunFeature
