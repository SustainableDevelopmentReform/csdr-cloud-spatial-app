'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { createProductRunSchema } from '@repo/schemas/crud'
import { FormField, FormItem, FormMessage } from '@repo/ui/components/ui/form'
import { ColumnDef } from '@tanstack/react-table'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import Pagination from '~/components/table/pagination'
import {
  ActiveTableFilter,
  TableFilterPopover,
} from '~/components/table/filter-popover'
import CrudFormDialog from '../../../../../components/form/crud-form-dialog'
import { CrudFormRunFields } from '../../../../../components/form/crud-form-run-fields'
import BaseCrudTable from '../../../../../components/table/crud-table'
import { TableRowDeleteAction } from '../../../../../components/table/table-row-delete-action'
import { SearchInput } from '../../../../../components/table/search-input'
import { useAccessControl } from '../../../../../hooks/useAccessControl'
import { ConsoleCrudListFrame } from '../../../_components/console-crud-list-frame'
import {
  formatBoundsLabel,
  GeographicBoundsPickerDialog,
  getGeographicBoundsFromQuery,
  toGeographicBoundsQuery,
} from '../../../_components/geographic-bounds-picker-dialog'
import { DatasetRunSelect } from '../../../dataset/_components/dataset-run-select'
import { GeometriesRunSelect } from '../../../geometries/_components/geometries-run-select'
import { ResourcePageState } from '../../../_components/resource-page-state'
import {
  ProductRunListItem,
  useCreateProductRun,
  useDeleteProductRun,
  useProduct,
  useProductRunLink,
  useProductRuns,
} from '../../_hooks'
import { canManageConsoleChildResource } from '../../../../../utils/access-control'

const ProductRunDeleteAction = ({
  productRun,
}: {
  productRun: ProductRunListItem
}) => {
  const deleteProductRun = useDeleteProductRun(productRun.id)

  return (
    <TableRowDeleteAction
      entityName="product run"
      itemName={productRun.name}
      mutation={deleteProductRun}
    />
  )
}

const ProductRunFeature = () => {
  const {
    data,
    query,
    setSearchParams,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
  } = useProductRuns(undefined, undefined, true)
  const createProductRun = useCreateProductRun()
  const productLink = useProductRunLink()

  const productQuery = useProduct()
  const product = productQuery.data
  const dataset = product?.dataset
  const geometries = product?.geometries
  const { access } = useAccessControl()
  const canEdit = canManageConsoleChildResource({
    access,
    resourceData: product,
  })
  const geographicBounds = getGeographicBoundsFromQuery(query)

  const baseColumns = useMemo(() => {
    return ['description', 'updatedAt'] as const
  }, [])

  const columns = useMemo(() => {
    return [
      {
        id: 'latestRun',
        header: 'Latest run',
        cell: ({ row }) => {
          const isLatest = product?.mainRunId === row.original.id

          return (
            <span
              className={isLatest ? 'text-foreground' : 'text-muted-foreground'}
            >
              {isLatest ? 'Latest' : 'No'}
            </span>
          )
        },
        size: 140,
      },
    ] satisfies ColumnDef<ProductRunListItem>[]
  }, [product?.mainRunId])
  const activeFilters = useMemo<ActiveTableFilter[]>(() => {
    const filters: ActiveTableFilter[] = []

    if (query?.datasetRunId) {
      filters.push({
        id: 'dataset-run',
        label: 'Dataset run',
        value: 'Selected',
        onClear: () => setSearchParams({ datasetRunId: undefined }),
      })
    }

    if (query?.geometriesRunId) {
      filters.push({
        id: 'geometries-run',
        label: 'Boundary run',
        value: 'Selected',
        onClear: () => setSearchParams({ geometriesRunId: undefined }),
      })
    }

    if (geographicBounds) {
      filters.push({
        id: 'geography',
        label: 'Area',
        value: formatBoundsLabel(geographicBounds),
        onClear: () => setSearchParams(toGeographicBoundsQuery(null)),
      })
    }

    return filters
  }, [
    geographicBounds,
    query?.datasetRunId,
    query?.geometriesRunId,
    setSearchParams,
  ])

  const form = useForm({
    resolver: zodResolver(createProductRunSchema),
  })

  useEffect(() => {
    if (product) {
      form.setValue('productId', product.id)
    }
  }, [form, product])

  return (
    <ResourcePageState
      error={productQuery.error}
      errorMessage="Failed to load product"
      isLoading={productQuery.isLoading}
      loadingMessage="Loading product"
      notFoundMessage="Product not found"
    >
      <ConsoleCrudListFrame
        title="Product Runs"
        description="Create and manage runs for this product."
        actions={
          product ? (
            <CrudFormDialog
              form={form}
              mutation={createProductRun}
              buttonText="Add Product Run"
              entityName="Product Run"
              entityNamePlural="product runs"
              hiddenFields={['visibility']}
              hideTrigger={!canEdit}
            >
              {dataset && (
                <FormField
                  control={form.control}
                  name="datasetRunId"
                  render={({ field }) => (
                    <FormItem>
                      <DatasetRunSelect
                        datasetId={dataset.id}
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
              {geometries && (
                <FormField
                  control={form.control}
                  name="geometriesRunId"
                  render={({ field }) => (
                    <FormItem>
                      <GeometriesRunSelect
                        geometriesId={geometries.id}
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
          ) : null
        }
        footer={
          <Pagination
            hasNextPage={!!hasNextPage}
            isLoading={isFetchingNextPage}
            loadedCount={data?.data.length}
            totalCount={data?.totalCount}
            onLoadMore={() => fetchNextPage()}
          />
        }
        toolbar={
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <SearchInput
              className="w-full md:w-72"
              placeholder="Search product runs"
              value={query?.search ?? ''}
              onChange={(e) => setSearchParams({ search: e.target.value })}
            />
            <TableFilterPopover activeFilters={activeFilters}>
              <GeographicBoundsPickerDialog
                title="Area of Interest"
                value={geographicBounds}
                onChange={(bounds) =>
                  setSearchParams(toGeographicBoundsQuery(bounds))
                }
                onClear={() => setSearchParams(toGeographicBoundsQuery(null))}
              />
            </TableFilterPopover>
          </div>
        }
      >
        <BaseCrudTable
          data={data?.data || []}
          isLoading={isLoading}
          baseColumns={baseColumns}
          extraColumns={columns}
          sortOptions={['name', 'createdAt', 'updatedAt']}
          title="ProductRun"
          itemLink={productLink}
          canModifyItem={() => canEdit}
          deleteAction={(productRun) => (
            <ProductRunDeleteAction productRun={productRun} />
          )}
          query={query}
          onSortChange={setSearchParams}
        />
      </ConsoleCrudListFrame>
    </ResourcePageState>
  )
}

export default ProductRunFeature
