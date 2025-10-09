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
import { SelectWithSearch } from '@repo/ui/components/ui/select-with-search'
import { ColumnDef, createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import Pagination from '~/components/pagination'
import CrudFormDialog from '../../../components/crud-form-dialog'
import BaseCrudTable from '../../../components/crud-table'
import { DatasetButton } from '../datasets/_components/dataset-button'
import { useDatasets } from '../datasets/_hooks'
import { GeometriesButton } from '../geometries/_components/geometries-button'
import { useAllGeometries } from '../geometries/_hooks'
import { VariableButtons } from '../variables/_components/variable-button'
import { ProductButton } from './_components/product-button'
import {
  ProductListItem,
  useCreateProduct,
  useProductLink,
  useProducts,
} from './_hooks'

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
    id: 'variables',
    header: () => <span>Variables</span>,
    cell: ({ row }) => {
      return (
        <VariableButtons
          variables={row.original.mainRun?.outputSummary?.variables.map(
            (v) => v.variable,
          )}
        />
      )
    },
    size: 120,
  }),
  columnHelper.display({
    id: 'dataset',
    header: () => <span>Dataset</span>,
    cell: ({ row }) => {
      return <DatasetButton dataset={row.original?.dataset} />
    },
    size: 120,
  }),
  columnHelper.display({
    id: 'geometries',
    header: () => <span>Geometries</span>,
    cell: ({ row }) => {
      return <GeometriesButton geometries={row.original?.geometries} />
    },
    size: 120,
  }),
] as ColumnDef<ProductListItem>[]

const ProductFeature = () => {
  const { data, query, setSearchParams, filters } = useProducts()
  const { data: datasets } = useDatasets()
  const { data: geometries } = useAllGeometries()
  const productLink = useProductLink()
  const createProduct = useCreateProduct()
  const baseColumns = useMemo(() => {
    return ['createdAt', 'updatedAt'] as const
  }, [])

  const form = useForm({
    resolver: zodResolver(createProductSchema),
  })

  return (
    <div>
      <div className="flex justify-between">
        <h1 className="text-3xl font-medium mb-2 flex gap-2 items-center align-middle ">
          Products
          <div className="flex gap-2 items-center justify-center align-middle">
            {filters}
          </div>
        </h1>
        <CrudFormDialog
          form={form}
          mutation={createProduct}
          entityName="Product"
          entityNamePlural="Products"
          buttonText="Add Product"
        >
          <FormField
            control={form.control}
            name="datasetId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dataset</FormLabel>
                <SelectWithSearch
                  options={datasets?.data}
                  value={field.value}
                  onSelect={field.onChange}
                  onSearch={() => {}}
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
                <FormLabel>Geometries</FormLabel>
                <SelectWithSearch
                  options={geometries?.data}
                  value={field.value}
                  onSelect={field.onChange}
                  onSearch={() => {}}
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
      <div className="mt-8">
        <BaseCrudTable
          data={data?.data || []}
          baseColumns={baseColumns}
          extraColumns={columns}
          title="Product"
          itemLink={productLink}
          itemButton={(product) => <ProductButton product={product} />}
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

export default ProductFeature
