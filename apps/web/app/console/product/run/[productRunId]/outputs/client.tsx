'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  createProductOutputSchema,
  productOutputQuerySchema,
} from '@repo/schemas/crud'
import { CalendarSelect } from '@repo/ui/components/ui/calendar-select'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/ui/form'
import { Input } from '@repo/ui/components/ui/input'
import { ColumnDef } from '@tanstack/react-table'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { normalizeFilterValues } from '~/utils'
import Pagination from '~/components/table/pagination'
import {
  ActiveTableFilter,
  TableFilterPopover,
} from '~/components/table/filter-popover'
import CrudFormDialog from '../../../../../../components/form/crud-form-dialog'
import BaseCrudTable, {
  SortButton,
} from '../../../../../../components/table/crud-table'
import { SearchInput } from '../../../../../../components/table/search-input'
import { useAccessControl } from '../../../../../../hooks/useAccessControl'
import { ConsoleCrudListFrame } from '../../../../_components/console-crud-list-frame'
import {
  formatBoundsLabel,
  GeographicBoundsPickerDialog,
  getGeographicBoundsFromQuery,
  toGeographicBoundsQuery,
} from '../../../../_components/geographic-bounds-picker-dialog'
import { formatDateTime } from '@repo/ui/lib/date'
import { ProductOutputsImportDialog } from '../../../_components/product-output-import'
import { ProductGeometryOutputSelect } from '../../../_components/product-run-geometry-output-select'
import { ResourcePageState } from '../../../../_components/resource-page-state'
import {
  ProductOutputListItem,
  useCreateProductRunOutput,
  useProductOutputLink,
  useProductOutputs,
  useProductRun,
} from '../../../_hooks'
import { IndicatorsSelect } from '../../../../indicator/_components/indicators-select'
import { ProductRunIndicatorsSelect } from '../../../_components/product-run-indicators-select'
import z from 'zod'
import { Value } from '../../../../../../components/value'
import { canManageConsoleChildResource } from '../../../../../../utils/access-control'

const ProductOutputFeature = () => {
  const {
    data,
    query,
    setSearchParams,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
  } = useProductOutputs(undefined, undefined, true)
  const createProductOutput = useCreateProductRunOutput()
  const productRunQuery = useProductRun()
  const productRun = productRunQuery.data
  const productLink = useProductOutputLink()
  const { access } = useAccessControl()
  const canEdit = canManageConsoleChildResource({
    access,
    resourceData: productRun,
  })
  const selectedIndicatorIds = useMemo(
    () => normalizeFilterValues(query?.indicatorId),
    [query?.indicatorId],
  )
  const selectedGeometryOutputIds = useMemo(
    () => normalizeFilterValues(query?.geometryOutputId),
    [query?.geometryOutputId],
  )
  const geographicBounds = getGeographicBoundsFromQuery(query)

  const baseColumns = useMemo(() => {
    return ['updatedAt'] as const
  }, [])

  const columns = useMemo<ColumnDef<ProductOutputListItem>[]>(
    () => [
      {
        id: 'indicator',
        accessorFn: (row) => row.indicator?.name,
        header: () => <span>Indicator</span>,
        cell: (info) => info.row.original.indicator?.name,
        size: 180,
      },
      {
        id: 'value',
        accessorFn: (row) => row.value,
        header: ({ column }) => (
          <SortButton
            order={column.getIsSorted()}
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Value
          </SortButton>
        ),
        cell: (info) => {
          return (
            <Value
              value={info.row.original.value}
              indicator={info.row.original.indicator}
            />
          )
        },
        size: 120,
      },
      {
        id: 'timePoint',
        accessorFn: (row) => row.timePoint,
        header: ({ column }) => (
          <SortButton
            order={column.getIsSorted()}
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Time Point
          </SortButton>
        ),
        cell: (info) => {
          return formatDateTime(info.row.original.timePoint)
        },
        size: 120,
      },
    ],
    [],
  )
  const activeFilters = useMemo<ActiveTableFilter[]>(() => {
    const filters: ActiveTableFilter[] = []

    if (selectedIndicatorIds.length > 0) {
      filters.push({
        id: 'indicators',
        label: 'Indicators',
        value: `${selectedIndicatorIds.length} selected`,
        onClear: () => setSearchParams({ indicatorId: undefined }),
      })
    }

    if (selectedGeometryOutputIds.length > 0) {
      filters.push({
        id: 'geometry-outputs',
        label: 'Geometry outputs',
        value: `${selectedGeometryOutputIds.length} selected`,
        onClear: () => setSearchParams({ geometryOutputId: undefined }),
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
    selectedGeometryOutputIds.length,
    selectedIndicatorIds.length,
    setSearchParams,
  ])

  const form = useForm({
    resolver: zodResolver(createProductOutputSchema),
  })

  useEffect(() => {
    if (productRun) {
      form.setValue('productRunId', productRun.id)
    }
  }, [form, productRun])

  return (
    <ResourcePageState
      error={productRunQuery.error}
      errorMessage="Failed to load product run"
      isLoading={productRunQuery.isLoading}
      loadingMessage="Loading product run"
      notFoundMessage="Product run not found"
    >
      <ConsoleCrudListFrame
        title="Product Outputs"
        description="Create and manage product outputs for this run."
        actions={
          <>
            {productRun?.id && canEdit ? (
              <ProductOutputsImportDialog
                productRunId={productRun.id}
                geometriesRunId={productRun.geometriesRun?.id}
              />
            ) : null}
            <CrudFormDialog
              form={form}
              mutation={createProductOutput}
              buttonText="Add Product Output"
              entityName="Product Output"
              entityNamePlural="product outputs"
              hiddenFields={['visibility']}
              hideTrigger={!canEdit}
            >
              <FormField
                control={form.control}
                name="geometryOutputId"
                render={({ field }) => (
                  <FormItem>
                    <ProductGeometryOutputSelect
                      productRunId={productRun?.id}
                      value={field.value}
                      onChange={(value) => field.onChange(value?.id ?? null)}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="indicatorId"
                render={({ field }) => (
                  <FormItem>
                    <IndicatorsSelect
                      value={field.value}
                      onChange={(value) => field.onChange(value?.id ?? null)}
                      creatable
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={'value'}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Value</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="timePoint"
                render={({ field }) => (
                  <FormItem className="w-full relative">
                    <FormLabel>Time Point</FormLabel>
                    <CalendarSelect
                      label="Time Point"
                      value={new Date(field.value)}
                      onChange={(event) => {
                        field.onChange(
                          event?.toISOString().replace('+00:00', 'Z'),
                        )
                      }}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CrudFormDialog>
          </>
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
              placeholder="Search product outputs"
              value={query?.search ?? ''}
              onChange={(e) => setSearchParams({ search: e.target.value })}
            />
            <TableFilterPopover activeFilters={activeFilters}>
              <div>
                <ProductRunIndicatorsSelect
                  productRunId={productRun?.id}
                  value={selectedIndicatorIds}
                  onChange={(selected) =>
                    setSearchParams({
                      indicatorId: selected.map((indicator) => indicator.id),
                    })
                  }
                  isMulti
                  isClearable
                />
              </div>
              <div>
                <ProductGeometryOutputSelect
                  title="Filter Geometry Outputs"
                  productRunId={productRun?.id}
                  value={selectedGeometryOutputIds}
                  onChange={(selected) =>
                    setSearchParams({
                      geometryOutputId: selected.map((output) => output.id),
                    })
                  }
                  isMulti
                />
              </div>
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
        <BaseCrudTable<
          ProductOutputListItem,
          Pick<z.output<typeof productOutputQuerySchema>, 'sort' | 'order'>
        >
          data={data?.data || []}
          isLoading={isLoading}
          baseColumns={baseColumns}
          extraColumns={columns}
          sortOptions={['name', 'createdAt', 'updatedAt', 'value', 'timePoint']}
          title="ProductOutput"
          itemLink={productLink}
          canModifyItem={() => canEdit}
          query={{ sort: query?.sort, order: query?.order }}
          onSortChange={(next) => setSearchParams(next)}
        />
      </ConsoleCrudListFrame>
    </ResourcePageState>
  )
}

export default ProductOutputFeature
