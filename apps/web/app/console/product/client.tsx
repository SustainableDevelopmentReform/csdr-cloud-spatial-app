'use client'

import { ColumnDef, createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import { normalizeFilterValues } from '~/utils'
import Pagination from '~/components/table/pagination'
import BaseCrudTable from '../../../components/table/crud-table'
import { SearchInput } from '../../../components/table/search-input'
import { ConsoleCrudListFrame } from '../_components/console-crud-list-frame'
import { ConsolePageHeader } from '../_components/console-page-header'
import {
  GeographicBoundsPickerDialog,
  getGeographicBoundsFromQuery,
  toGeographicBoundsQuery,
} from '../_components/geographic-bounds-picker-dialog'
import { DatasetButton } from '../dataset/_components/dataset-button'
import { DatasetSelect } from '../dataset/_components/dataset-select'
import { GeometriesButton } from '../geometries/_components/geometries-button'
import { GeometriesSelect } from '../geometries/_components/geometries-select'
import { IndicatorButtons } from '../indicator/_components/indicator-button'
import { IndicatorsSelect } from '../indicator/_components/indicators-select'
import { ProductsBreadcrumbs } from './_components/breadcrumbs'
import { ProductCreateAction } from './_components/product-create-action'
import { ProductButton } from './_components/product-button'
import { ProductListItem, useProductLink, useProducts } from './_hooks'

const columnHelper = createColumnHelper<ProductListItem>()

const columns = [
  columnHelper.accessor((row) => row.mainRun?.outputSummary?.startTime, {
    id: 'startTime',
    header: () => <span>Start Time</span>,
    cell: (info) => {
      const value = info.getValue()
      if (!value) return null
      return new Date(value).toLocaleDateString()
    },
    size: 120,
  }),
  columnHelper.accessor((row) => row.mainRun?.outputSummary?.endTime, {
    id: 'endTime',
    header: () => <span>End Time</span>,
    cell: (info) => {
      const value = info.getValue()
      if (!value) return null
      return new Date(value).toLocaleDateString()
    },
    size: 120,
  }),
  columnHelper.display({
    id: 'indicators',
    header: () => <span>Indicators</span>,
    cell: ({ row }) => {
      return (
        <IndicatorButtons
          indicators={row.original.mainRun?.outputSummary?.indicators}
        />
      )
    },
    size: 120,
  }),
  columnHelper.display({
    id: 'dataset',
    header: () => <span>Dataset</span>,
    cell: ({ row }) => {
      return (
        row.original.dataset && <DatasetButton dataset={row.original.dataset} />
      )
    },
    size: 120,
  }),
  columnHelper.display({
    id: 'geometries',
    header: () => <span>Geometries</span>,
    cell: ({ row }) => {
      return (
        row.original.geometries && (
          <GeometriesButton geometries={row.original.geometries} />
        )
      )
    },
    size: 120,
  }),
] as ColumnDef<ProductListItem>[]

const ProductFeature = () => {
  const {
    data,
    query,
    setSearchParams,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
  } = useProducts(undefined, true)
  const productLink = useProductLink()
  const selectedDatasetIds = useMemo(
    () => normalizeFilterValues(query?.datasetId),
    [query?.datasetId],
  )
  const selectedGeometriesIds = useMemo(
    () => normalizeFilterValues(query?.geometriesId),
    [query?.geometriesId],
  )
  const selectedIndicatorIds = useMemo(
    () => normalizeFilterValues(query?.indicatorId),
    [query?.indicatorId],
  )
  const geographicBounds = getGeographicBoundsFromQuery(query)
  const baseColumns = useMemo(() => {
    return ['createdAt'] as const
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <ConsolePageHeader breadcrumbs={<ProductsBreadcrumbs />} />
      <ConsoleCrudListFrame
        title="Products"
        description="Create and manage products in the system."
        actions={<ProductCreateAction />}
        toolbar={
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <SearchInput
              className="w-full md:max-w-md"
              placeholder="Search products"
              value={query?.search ?? ''}
              onChange={(e) => setSearchParams({ search: e.target.value })}
            />
            <div className="flex flex-wrap items-end justify-end gap-3">
              <div className="min-w-[220px] md:min-w-[260px]">
                <DatasetSelect
                  title="Filter Datasets"
                  value={selectedDatasetIds}
                  onChange={(selected) =>
                    setSearchParams({
                      datasetId: selected.map((dataset) => dataset.id),
                    })
                  }
                  isMulti
                  isClearable
                />
              </div>
              <div className="min-w-[220px] md:min-w-[260px]">
                <GeometriesSelect
                  title="Filter Geometries"
                  value={selectedGeometriesIds}
                  onChange={(selected) =>
                    setSearchParams({
                      geometriesId: selected.map((geometries) => geometries.id),
                    })
                  }
                  isMulti
                  isClearable
                />
              </div>
              <div className="min-w-[220px] md:min-w-[260px]">
                <IndicatorsSelect
                  title="Filter Indicators"
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
        }
      >
        <BaseCrudTable
          data={data?.data || []}
          isLoading={isLoading}
          baseColumns={baseColumns}
          extraColumns={columns}
          title="Product"
          itemLink={productLink}
          itemButton={(product) => <ProductButton product={product} />}
          query={query}
          onSortChange={setSearchParams}
        />
        <Pagination
          className="justify-end"
          hasNextPage={!!hasNextPage}
          isLoading={isFetchingNextPage}
          onLoadMore={() => fetchNextPage()}
        />
      </ConsoleCrudListFrame>
    </div>
  )
}

export default ProductFeature
