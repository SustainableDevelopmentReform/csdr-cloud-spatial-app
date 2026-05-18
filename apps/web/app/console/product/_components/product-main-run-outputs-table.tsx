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
import { ColumnDef, createColumnHelper } from '@tanstack/react-table'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { normalizeFilterValues } from '~/utils'
import Pagination from '~/components/table/pagination'
import BaseCrudTable, {
  SortButton,
} from '../../../../components/table/crud-table'
import CrudFormDialog from '../../../../components/form/crud-form-dialog'
import { SearchInput } from '../../../../components/table/search-input'
import {
  ActiveTableFilter,
  formatActiveFilterValue,
  TableFilterPopover,
} from '../../../../components/table/filter-popover'
import {
  formatBoundsLabel,
  GeographicBoundsPickerDialog,
  getGeographicBoundsFromQuery,
  toGeographicBoundsQuery,
} from '../../_components/geographic-bounds-picker-dialog'
import { formatDateTime } from '@repo/ui/lib/date'
import { GeometryOutputButton } from '../../geometries/_components/geometry-output-button'
import { GeometryOutputDetailsSidebar } from '../../geometries/_components/geometry-output-details-sidebar'
import { useGeometryOutputs } from '../../geometries/_hooks'
import { ProductRunIndicatorsSelect } from '../_components/product-run-indicators-select'
import { ProductGeometryOutputSelect } from '../_components/product-run-geometry-output-select'
import { ProductOutputsImportDialog } from './product-output-import'
import { IndicatorButton } from '../../indicator/_components/indicator-button'
import { IndicatorsSelect } from '../../indicator/_components/indicators-select'
import { Value } from '../../../../components/value'
import { useConsoleSideDrawerStack } from '../../_components/console-side-drawer'
import { getEditModeHref } from '../../_components/resource-detail-mode'
import { ProductOutputDetailsSidebar } from '../../report/_components/chart-selected-item'
import { useIndicators } from '../../indicator/_hooks'
import {
  ProductOutputListItem,
  useCreateProductRunOutput,
  useProductRun,
  useProductOutputLink,
  useProductOutputs,
} from '../_hooks'
import z from 'zod'

const columnHelper = createColumnHelper<ProductOutputListItem>()

export function ProductMainRunOutputsTable({
  canEdit,
  showManagementActions = false,
  productRunId,
}: {
  canEdit: boolean
  showManagementActions?: boolean
  productRunId: string
}) {
  const {
    data,
    query,
    setSearchParams,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
  } = useProductOutputs(productRunId, undefined, true)
  const createProductOutput = useCreateProductRunOutput()
  const productLink = useProductOutputLink()
  const { closeActiveDrawer } = useConsoleSideDrawerStack()
  const [selectedProductOutputId, setSelectedProductOutputId] = useState<
    string | null
  >(null)
  const [selectedGeometryOutputId, setSelectedGeometryOutputId] = useState<
    string | null
  >(null)

  const closeProductOutputDetails = useCallback(() => {
    setSelectedProductOutputId(null)
  }, [])

  const closeGeometryOutputDetails = useCallback(() => {
    setSelectedGeometryOutputId(null)
  }, [])

  const openProductOutputDetails = useCallback(
    (productOutput: ProductOutputListItem) => {
      closeActiveDrawer()
      setSelectedGeometryOutputId(null)
      setSelectedProductOutputId(productOutput.id)
    },
    [closeActiveDrawer],
  )

  const openGeometryOutputDetails = useCallback(
    (geometryOutputId: string) => {
      closeActiveDrawer()
      setSelectedProductOutputId(null)
      setSelectedGeometryOutputId(geometryOutputId)
    },
    [closeActiveDrawer],
  )

  const selectProductOutputDetails = useCallback((productOutputId: string) => {
    setSelectedGeometryOutputId(null)
    setSelectedProductOutputId(productOutputId)
  }, [])

  const selectGeometryOutputDetails = useCallback(
    (geometryOutputId: string) => {
      setSelectedProductOutputId(null)
      setSelectedGeometryOutputId(geometryOutputId)
    },
    [],
  )

  const editProductOutputLink = useCallback(
    (productOutput: ProductOutputListItem) =>
      getEditModeHref(productLink(productOutput)),
    [productLink],
  )

  useEffect(() => {
    if (!selectedProductOutputId && !selectedGeometryOutputId) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeProductOutputDetails()
        closeGeometryOutputDetails()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [
    closeGeometryOutputDetails,
    closeProductOutputDetails,
    selectedGeometryOutputId,
    selectedProductOutputId,
  ])

  const selectedIndicatorIds = useMemo(
    () => normalizeFilterValues(query?.indicatorId),
    [query?.indicatorId],
  )
  const selectedGeometryOutputIds = useMemo(
    () => normalizeFilterValues(query?.geometryOutputId),
    [query?.geometryOutputId],
  )
  const geographicBounds = getGeographicBoundsFromQuery(query)
  const { data: productRun } = useProductRun(productRunId)
  const { data: selectedIndicators } = useIndicators(
    { indicatorIds: selectedIndicatorIds },
    false,
    selectedIndicatorIds.length > 0,
  )
  const { data: selectedGeometryOutputs } = useGeometryOutputs(
    productRun?.geometriesRun?.id,
    {
      geometryOutputIds: selectedGeometryOutputIds,
      size: selectedGeometryOutputIds.length || undefined,
    },
    false,
    selectedGeometryOutputIds.length > 0 && !!productRun?.geometriesRun?.id,
  )
  const activeFilters = useMemo<ActiveTableFilter[]>(() => {
    const filters: ActiveTableFilter[] = []

    if (selectedIndicatorIds.length > 0) {
      filters.push({
        id: 'indicators',
        label: 'Indicators',
        value: formatActiveFilterValue(
          selectedIndicatorIds,
          selectedIndicators?.data,
        ),
        onClear: () => setSearchParams({ indicatorId: undefined }),
      })
    }

    if (selectedGeometryOutputIds.length > 0) {
      filters.push({
        id: 'boundary-features',
        label: 'Boundary features',
        value: formatActiveFilterValue(
          selectedGeometryOutputIds,
          selectedGeometryOutputs?.data,
        ),
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
    selectedGeometryOutputs?.data,
    selectedGeometryOutputIds,
    selectedGeometryOutputIds.length,
    selectedIndicators?.data,
    selectedIndicatorIds,
    selectedIndicatorIds.length,
    setSearchParams,
  ])
  const form = useForm({
    resolver: zodResolver(createProductOutputSchema),
    defaultValues: {
      productRunId,
    },
  })

  useEffect(() => {
    form.setValue('productRunId', productRunId)
  }, [form, productRunId])

  const baseColumns = useMemo<
    ReadonlyArray<keyof ProductOutputListItem>
  >(() => {
    return ['createdAt', 'updatedAt']
  }, [])

  const columns = useMemo(
    () =>
      [
        columnHelper.accessor((row) => row.indicator?.name, {
          id: 'indicator',
          header: () => <span>Indicator</span>,
          cell: (info) =>
            info.row.original.indicator && (
              <IndicatorButton indicator={info.row.original.indicator} />
            ),
          size: 220,
        }),
        columnHelper.accessor((row) => row.value, {
          id: 'value',
          header: ({ column }) => (
            <SortButton
              order={column.getIsSorted()}
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === 'asc')
              }
            >
              Value
            </SortButton>
          ),
          cell: (info) => (
            <Value
              value={info.getValue()}
              indicator={info.row.original.indicator}
            />
          ),
          size: 120,
        }),
        columnHelper.accessor((row) => row.timePoint, {
          id: 'timePoint',
          header: ({ column }) => (
            <SortButton
              order={column.getIsSorted()}
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === 'asc')
              }
            >
              Time Point
            </SortButton>
          ),
          cell: (info) => formatDateTime(info.getValue()),
          size: 160,
        }),
        columnHelper.display({
          id: 'geometry',
          header: () => <span>Boundary</span>,
          cell: ({ row }) => {
            const geometryOutput = row.original.geometryOutput

            return (
              <div className="flex flex-wrap items-center gap-2">
                {geometryOutput && (
                  <GeometryOutputButton
                    geometryOutput={geometryOutput}
                    onClick={() => openGeometryOutputDetails(geometryOutput.id)}
                  />
                )}
              </div>
            )
          },
          size: 180,
        }),
      ] as ColumnDef<ProductOutputListItem>[],
    [openGeometryOutputDetails],
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <SearchInput
          className="w-full md:max-w-md"
          placeholder="Search product outputs"
          value={query?.search ?? ''}
          onChange={(e) => setSearchParams({ search: e.target.value })}
        />
        <div className="flex flex-wrap items-center justify-end gap-3">
          <TableFilterPopover activeFilters={activeFilters}>
            <div>
              <ProductRunIndicatorsSelect
                productRunId={productRunId}
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
                title="Filter Boundary Features"
                productRunId={productRunId}
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
          {showManagementActions && canEdit ? (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              <ProductOutputsImportDialog productRunId={productRunId} />
              <CrudFormDialog
                form={form}
                mutation={createProductOutput}
                buttonText="Add Product Output"
                entityName="Product Output"
                entityNamePlural="product outputs"
                hiddenFields={['visibility']}
                onOpen={() => form.setValue('productRunId', productRunId)}
              >
                <FormField
                  control={form.control}
                  name="geometryOutputId"
                  render={({ field }) => (
                    <FormItem>
                      <ProductGeometryOutputSelect
                        productRunId={productRunId}
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
                  name="value"
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
                        value={field.value ? new Date(field.value) : undefined}
                        onChange={(event) => {
                          field.onChange(
                            event
                              ? new Date(event.getTime()).toISOString()
                              : undefined,
                          )
                        }}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CrudFormDialog>
            </div>
          ) : null}
        </div>
      </div>
      <BaseCrudTable<
        ProductOutputListItem,
        Pick<z.output<typeof productOutputQuerySchema>, 'sort' | 'order'>
      >
        data={data?.data || []}
        isLoading={isLoading}
        baseColumns={baseColumns}
        canModifyItem={() => canEdit}
        editLink={editProductOutputLink}
        extraColumns={columns}
        title="ProductOutput"
        itemAction={openProductOutputDetails}
        itemLink={productLink}
        selectedItemId={selectedProductOutputId}
        stickyColumnClassName="bg-white"
        sortOptions={['name', 'value', 'timePoint', 'createdAt', 'updatedAt']}
        query={{ sort: query?.sort, order: query?.order }}
        onSortChange={(next) => setSearchParams(next)}
      />
      <ProductOutputDetailsSidebar
        onClose={closeProductOutputDetails}
        onProductOutputSelect={selectProductOutputDetails}
        open={Boolean(selectedProductOutputId)}
        productOutputId={selectedProductOutputId}
      />
      <GeometryOutputDetailsSidebar
        geometryOutputId={selectedGeometryOutputId}
        onClose={closeGeometryOutputDetails}
        onGeometryOutputSelect={selectGeometryOutputDetails}
        open={Boolean(selectedGeometryOutputId)}
      />
      <Pagination
        className="justify-end mt-4"
        hasNextPage={!!hasNextPage}
        isLoading={isFetchingNextPage}
        onLoadMore={() => fetchNextPage()}
      />
    </div>
  )
}
