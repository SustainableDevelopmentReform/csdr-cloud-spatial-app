'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { createProductSchema } from '@repo/schemas/crud'
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/ui/select'
import { ColumnDef, createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { normalizeFilterValues } from '~/utils'
import Pagination from '~/components/table/pagination'
import CrudFormDialog from '../../../components/form/crud-form-dialog'
import BaseCrudTable from '../../../components/table/crud-table'
import { useAccessControl } from '../../../hooks/useAccessControl'
import { SearchInput } from '../../../components/table/search-input'
import { DatasetButton } from '../dataset/_components/dataset-button'
import { DatasetSelect } from '../dataset/_components/dataset-select'
import { GeometriesButton } from '../geometries/_components/geometries-button'
import { GeometriesSelect } from '../geometries/_components/geometries-select'
import { IndicatorButtons } from '../indicator/_components/indicator-button'
import { IndicatorsSelect } from '../indicator/_components/indicators-select'
import { ProductButton } from './_components/product-button'
import {
  ProductListItem,
  useCreateProduct,
  useProductLink,
  useProducts,
} from './_hooks'
import { canCreateConsoleResource } from '../../../utils/access-control'

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
  const createProduct = useCreateProduct()
  const { access } = useAccessControl()
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
  const baseColumns = useMemo(() => {
    return ['createdAt'] as const
  }, [])

  const form = useForm({
    resolver: zodResolver(createProductSchema),
  })

  return (
    <div>
      <div className="flex justify-between">
        <h1 className="text-3xl font-medium mb-2 flex gap-2 items-center align-middle ">
          Products
        </h1>
        <CrudFormDialog
          form={form}
          mutation={createProduct}
          entityName="Product"
          entityNamePlural="Products"
          buttonText="Add Product"
          hideTrigger={!canCreateConsoleResource(access, 'product')}
        >
          <FormField
            control={form.control}
            name="datasetId"
            render={({ field }) => (
              <FormItem>
                <DatasetSelect
                  value={field.value}
                  onChange={(selectedDataset) =>
                    field.onChange(selectedDataset?.id)
                  }
                  isClearable
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="geometriesId"
            render={({ field }) => (
              <FormItem>
                <GeometriesSelect
                  value={field.value}
                  onChange={(selectedGeometries) =>
                    field.onChange(selectedGeometries?.id)
                  }
                  isClearable
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="timePrecision"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Time Precision</FormLabel>
                <Select {...field} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hour">Hour</SelectItem>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                    <SelectItem value="year">Year</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </CrudFormDialog>
      </div>
      <div>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <SearchInput
            className="w-full md:max-w-md"
            placeholder="Search products"
            value={query?.search ?? ''}
            onChange={(e) => setSearchParams({ search: e.target.value })}
          />
          <div className="flex flex-wrap justify-end gap-3 items-end md:flex-wrap-reverse">
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
          </div>
        </div>
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
          className="justify-end mt-4"
          hasNextPage={!!hasNextPage}
          isLoading={isFetchingNextPage}
          onLoadMore={() => fetchNextPage()}
        />
      </div>
    </div>
  )
}

export default ProductFeature
