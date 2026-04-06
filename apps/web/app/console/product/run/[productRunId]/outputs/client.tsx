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
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { normalizeFilterValues } from '~/utils'
import Pagination from '~/components/table/pagination'
import CrudFormDialog from '../../../../../../components/form/crud-form-dialog'
import BaseCrudTable, {
  SortButton,
} from '../../../../../../components/table/crud-table'
import { SearchInput } from '../../../../../../components/table/search-input'
import { useAccessControl } from '../../../../../../hooks/useAccessControl'
import { formatDateTime } from '@repo/ui/lib/date'
import { DatasetButton } from '../../../../dataset/_components/dataset-button'
import { DatasetRunButton } from '../../../../dataset/_components/dataset-run-button'
import { GeometriesButton } from '../../../../geometries/_components/geometries-button'
import { GeometriesRunButton } from '../../../../geometries/_components/geometries-run-button'
import { GeometryOutputButton } from '../../../../geometries/_components/geometry-output-button'
import { ProductOutputButton } from '../../../_components/product-output-button'
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
import { IndicatorButton } from '../../../../indicator/_components/indicator-button'
import { IndicatorsSelect } from '../../../../indicator/_components/indicators-select'
import { ProductRunIndicatorsSelect } from '../../../_components/product-run-indicators-select'
import z from 'zod'
import { Value } from '../../../../../../components/value'
import { canManageConsoleChildResource } from '../../../../../../utils/access-control'

const columnHelper = createColumnHelper<ProductOutputListItem>()

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

  const baseColumns = useMemo(() => {
    return ['createdAt'] as const
  }, [])

  const columns = useMemo(
    () =>
      [
        columnHelper.accessor((row) => row.indicator?.name, {
          id: 'indicator',
          header: () => <span>Indicator</span>,
          cell: (info) => {
            return (
              info.row.original.indicator && (
                <IndicatorButton indicator={info.row.original.indicator} />
              )
            )
          },
          size: 20,
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
          cell: (info) => {
            return (
              <Value
                value={info.getValue()}
                indicator={info.row.original.indicator}
              />
            )
          },
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
          cell: (info) => {
            return formatDateTime(info.getValue())
          },
          size: 120,
        }),
        columnHelper.display({
          id: 'geometry',
          header: () => <span>Geometry</span>,
          cell: ({ row }) => {
            return (
              <div className="flex items-center gap-2 flex-wrap">
                {row.original.geometryOutput?.geometriesRun?.geometries && (
                  <GeometriesButton
                    geometries={
                      row.original.geometryOutput.geometriesRun.geometries
                    }
                  />
                )}
                {row.original.geometryOutput?.geometriesRun && (
                  <GeometriesRunButton
                    geometriesRun={row.original.geometryOutput.geometriesRun}
                  />
                )}
                {row.original.geometryOutput && (
                  <GeometryOutputButton
                    geometryOutput={row.original.geometryOutput}
                  />
                )}
              </div>
            )
          },
          size: 120,
        }),
        columnHelper.display({
          id: 'dataset',
          header: () => <span>Dataset</span>,
          cell: ({ row }) => {
            return (
              <div className="flex items-center gap-2 flex-wrap">
                {row.original.productRun?.datasetRun?.dataset && (
                  <DatasetButton
                    dataset={row.original.productRun.datasetRun.dataset}
                  />
                )}
                {row.original.productRun?.datasetRun && (
                  <DatasetRunButton
                    datasetRun={row.original.productRun.datasetRun}
                  />
                )}
              </div>
            )
          },
          size: 120,
        }),
      ] as ColumnDef<ProductOutputListItem>[],
    [],
  )

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
      <div>
        <div className="flex justify-between">
          <h1 className="text-3xl font-medium mb-2 flex gap-2 items-center align-middle ">
            Product Outputs
          </h1>
          <div className="flex items-center gap-3">
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
                      <Input {...field} />
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
          </div>
        </div>
        <div>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <SearchInput
              className="w-full md:max-w-md"
              placeholder="Search product outputs"
              value={query?.search ?? ''}
              onChange={(e) => setSearchParams({ search: e.target.value })}
            />
            <div className="flex flex-wrap justify-end gap-3">
              <div className="min-w-[220px] md:min-w-[260px]">
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
              <div className="min-w-[220px] md:min-w-[260px]">
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
            itemButton={(productOutput) => (
              <ProductOutputButton productOutput={productOutput} />
            )}
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
      </div>
    </ResourcePageState>
  )
}

export default ProductOutputFeature
