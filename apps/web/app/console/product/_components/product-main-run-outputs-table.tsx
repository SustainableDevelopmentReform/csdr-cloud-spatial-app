'use client'

import { productOutputQuerySchema } from '@repo/schemas/crud'
import { ColumnDef, createColumnHelper } from '@tanstack/react-table'
import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { GeometryOutputDetailsSidebar } from '../../geometries/_components/geometry-output-details-sidebar'
import { ProductRunIndicatorsSelect } from '../_components/product-run-indicators-select'
import { ProductGeometryOutputSelect } from '../_components/product-run-geometry-output-select'
import { IndicatorButton } from '../../indicator/_components/indicator-button'
import { Value } from '../../../../components/value'
import { getEditModeHref } from '../../_components/resource-detail-mode'
import { ProductOutputDetailsSidebar } from '../../report/_components/chart-selected-item'
import {
  ProductOutputListItem,
  useProductOutputLink,
  useProductOutputs,
} from '../_hooks'
import z from 'zod'

const columnHelper = createColumnHelper<ProductOutputListItem>()

export function ProductMainRunOutputsTable({
  canEdit,
  productRunId,
}: {
  canEdit: boolean
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
      setSelectedGeometryOutputId(null)
      setSelectedProductOutputId(productOutput.id)
    },
    [],
  )

  const openGeometryOutputDetails = useCallback((geometryOutputId: string) => {
    setSelectedProductOutputId(null)
    setSelectedGeometryOutputId(geometryOutputId)
  }, [])

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
        open={Boolean(selectedProductOutputId)}
        productOutputId={selectedProductOutputId}
      />
      <GeometryOutputDetailsSidebar
        geometryOutputId={selectedGeometryOutputId}
        onClose={closeGeometryOutputDetails}
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
