'use client'

import { productOutputQuerySchema } from '@repo/schemas/crud'
import { ColumnDef, createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import { normalizeFilterValues } from '~/utils'
import Pagination from '~/components/table/pagination'
import BaseCrudTable, {
  SortButton,
} from '../../../../components/table/crud-table'
import { SearchInput } from '../../../../components/table/search-input'
import {
  GeographicBoundsPickerDialog,
  getGeographicBoundsFromQuery,
  toGeographicBoundsQuery,
} from '../../_components/geographic-bounds-picker-dialog'
import { formatDateTime } from '@repo/ui/lib/date'
import { GeometryOutputButton } from '../../geometries/_components/geometry-output-button'
import { ProductRunIndicatorsSelect } from '../_components/product-run-indicators-select'
import { ProductGeometryOutputSelect } from '../_components/product-run-geometry-output-select'
import { IndicatorButton } from '../../indicator/_components/indicator-button'
import { Value } from '../../../../components/value'
import {
  ProductOutputListItem,
  useProductOutputLink,
  useProductOutputs,
} from '../_hooks'
import z from 'zod'

const columnHelper = createColumnHelper<ProductOutputListItem>()

export function ProductMainRunOutputsTable({
  productRunId,
}: {
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
  } = useProductOutputs(productRunId, undefined, false)
  const productLink = useProductOutputLink()

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
          header: () => <span>Geometry</span>,
          cell: ({ row }) => (
            <div className="flex flex-wrap items-center gap-2">
              {row.original.geometryOutput && (
                <GeometryOutputButton
                  geometryOutput={row.original.geometryOutput}
                />
              )}
            </div>
          ),
          size: 180,
        }),
      ] as ColumnDef<ProductOutputListItem>[],
    [],
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <SearchInput
          className="w-full md:max-w-md"
          placeholder="Search product outputs"
          value={query?.search ?? ''}
          onChange={(e) => setSearchParams({ search: e.target.value })}
        />
        <div className="flex flex-wrap items-end justify-end gap-3">
          <div className="min-w-[220px] md:min-w-[260px]">
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
          <div className="min-w-[220px] md:min-w-[260px]">
            <ProductGeometryOutputSelect
              title="Filter Geometry Outputs"
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
            className="min-w-[220px] md:min-w-[260px]"
            value={geographicBounds}
            onChange={(bounds) =>
              setSearchParams(toGeographicBoundsQuery(bounds))
            }
            onClear={() => setSearchParams(toGeographicBoundsQuery(null))}
          />
        </div>
      </div>
      <BaseCrudTable<
        ProductOutputListItem,
        Pick<z.output<typeof productOutputQuerySchema>, 'sort' | 'order'>
      >
        data={data?.data || []}
        isLoading={isLoading}
        baseColumns={baseColumns}
        extraColumns={columns}
        title="ProductOutput"
        itemLink={productLink}
        stickyColumnClassName="bg-white"
        sortOptions={['name', 'value', 'timePoint', 'createdAt', 'updatedAt']}
        query={{ sort: query?.sort, order: query?.order }}
        onSortChange={(next) => setSearchParams(next)}
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
