'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { createProductOutputSchema } from '@repo/schemas/crud'
import { CalendarSelect } from '@repo/ui/components/ui/calendar-select'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/ui/form'
import { Input } from '@repo/ui/components/ui/input'
import { SelectWithSearch } from '@repo/ui/components/ui/select-with-search'
import { ColumnDef, createColumnHelper } from '@tanstack/react-table'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import Pagination from '~/components/pagination'
import CrudFormDialog from '../../../../../components/crud-form-dialog'
import BaseCrudTable from '../../../../../components/crud-table'
import { formatDateTime } from '../../../../../utils/date'
import { DatasetButton } from '../../../datasets/_components/dataset-button'
import { DatasetRunButton } from '../../../datasets/_components/dataset-run-button'
import { GeometriesButton } from '../../../geometries/_components/geometries-button'
import { GeometriesRunButton } from '../../../geometries/_components/geometries-run-button'
import { GeometryOutputButton } from '../../../geometries/_components/geometry-output-button'
import {
  useGeometriesLink,
  useGeometryOutputs,
} from '../../../geometries/_hooks'
import { ProductOutputButton } from '../../../products/_components/product-output-button'
import {
  ProductOutputListItem,
  useProductOutputs,
  useCreateProductRunOutput,
  useProductRun,
  useProductOutputLink,
} from '../../../products/_hooks'
import { VariableButton } from '../../../variables/_components/variable-button'
import { useVariables } from '../../../variables/_hooks'

const columnHelper = createColumnHelper<ProductOutputListItem>()

const ProductOutputFeature = () => {
  const { data, query, setSearchParams } = useProductOutputs()
  const createProductOutput = useCreateProductRunOutput()
  const { data: productRun } = useProductRun()
  const productLink = useProductOutputLink()
  const geometriesLink = useGeometriesLink()
  const { data: geometryOutputs } = useGeometryOutputs(
    productRun?.geometriesRun.id,
  )
  const { data: variables } = useVariables()
  const baseColumns = useMemo(() => {
    return ['createdAt'] as const
  }, [])

  const columns = useMemo(
    () =>
      [
        columnHelper.accessor((row) => row.variable.name, {
          id: 'variable',
          header: () => <span>Variable</span>,
          cell: (info) => {
            return <VariableButton variable={info.row.original.variable} />
          },
          size: 20,
        }),
        columnHelper.accessor((row) => row.value, {
          id: 'value',
          header: () => <span>Value</span>,
          cell: (info) => {
            return info.getValue()
          },
          size: 120,
        }),
        columnHelper.accessor((row) => row.timePoint, {
          id: 'timePoint',
          header: () => <span>Time Point</span>,
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
                <GeometriesButton
                  geometries={
                    row.original.geometryOutput.geometriesRun.geometries
                  }
                />
                <GeometriesRunButton
                  geometriesRun={row.original.geometryOutput.geometriesRun}
                />
                <GeometryOutputButton
                  geometryOutput={row.original.geometryOutput}
                />
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
                <DatasetButton
                  dataset={row.original.productRun.datasetRun.dataset}
                />
                <DatasetRunButton
                  datasetRun={row.original.productRun.datasetRun}
                />
              </div>
            )
          },
          size: 120,
        }),
      ] as ColumnDef<ProductOutputListItem>[],
    [geometriesLink],
  )

  const form = useForm({
    resolver: zodResolver(createProductOutputSchema),
  })

  useEffect(() => {
    if (productRun) {
      form.setValue('productRunId', productRun.id)
    }
  }, [productRun])

  return (
    <div>
      <div className="flex justify-between">
        <h1 className="text-3xl font-medium mb-2">Product Outputs</h1>
        <CrudFormDialog
          form={form}
          mutation={createProductOutput}
          buttonText="Add Product Output"
          entityName="Product Output"
          entityNamePlural="product outputs"
        >
          <FormField
            control={form.control}
            name="geometryOutputId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Geometry Output</FormLabel>
                <SelectWithSearch
                  options={geometryOutputs?.data}
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
            name="variableId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Variable</FormLabel>
                <SelectWithSearch
                  options={variables?.data}
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
                  onChange={(event) => field.onChange(event?.toISOString())}
                />
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
          title="ProductOutput"
          itemLink={productLink}
          itemButton={(productOutput) => (
            <ProductOutputButton productOutput={productOutput} />
          )}
        />
        <Pagination
          className="justify-end mt-4"
          totalPages={data?.pageCount ?? 1}
          currentPage={query.page ?? 1}
          onPageChange={(p) => setSearchParams({ page: p })}
        />
      </div>
    </div>
  )
}

export default ProductOutputFeature
