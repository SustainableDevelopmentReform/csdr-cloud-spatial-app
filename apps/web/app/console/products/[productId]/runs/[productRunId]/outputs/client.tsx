'use client'

import { Button } from '@repo/ui/components/ui/button'
import { ColumnDef, createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import Pagination from '~/components/pagination'
import { baseFormSchema } from '../../../../../../../components/crud-form'
import CrudFormDialog from '../../../../../../../components/crud-form-dialog'
import BaseCrudTable from '../../../../../../../components/crud-table'
import { formatDateTime } from '../../../../../../../utils/date'
import { DatasetButton } from '../../../../../datasets/_components/dataset-button'
import { DatasetRunButton } from '../../../../../datasets/_components/dataset-run-button'
import { GeometriesButton } from '../../../../../geometries/_components/geometries-button'
import { GeometriesRunButton } from '../../../../../geometries/_components/geometries-run-button'
import { GeometryOutputButton } from '../../../../../geometries/_components/geometry-output-button'
import { useGeometriesLink } from '../../../../../geometries/_hooks'
import { VariableButton } from '../../../../../variables/_components/variable-button'
import { ProductOutputButton } from '../../../../_components/product-output-button'
import {
  ProductOutputListItem,
  useCreateProductRunOutput,
  useProductOutputLink,
  useProductOutputs,
} from '../../../../_hooks'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const columnHelper = createColumnHelper<ProductOutputListItem>()

const createProductRunOutputSchema = baseFormSchema.extend({
  productRunId: z.string(),
  value: z.string(),
  geometryOutputId: z.string(),
  variableId: z.string(),
  timePoint: z.date(),
})

const ProductOutputFeature = () => {
  const { data, page, setPage } = useProductOutputs()
  const createProductOutput = useCreateProductRunOutput()

  const productLink = useProductOutputLink()
  const geometriesLink = useGeometriesLink()

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
              <div className="flex items-center gap-2">
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
              <div className="flex items-center gap-2">
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
    resolver: zodResolver(createProductRunOutputSchema),
  })

  return (
    <div>
      <div className="flex justify-between">
        <h1 className="text-3xl font-medium mb-2">Product Outputs</h1>
        <CrudFormDialog
          form={form}
          mutation={createProductOutput}
          buttonText="Add Product Output"
        />
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
          currentPage={page}
          onPageChange={setPage}
        />
      </div>
    </div>
  )
}

export default ProductOutputFeature
