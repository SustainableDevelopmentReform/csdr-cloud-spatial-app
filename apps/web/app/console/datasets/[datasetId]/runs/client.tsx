'use client'

import { zodResolver } from '@hookform/resolvers/zod'
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
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import Pagination from '~/components/pagination'
import { baseFormSchema } from '../../../../../components/crud-form'
import CrudFormDialog from '../../../../../components/crud-form-dialog'
import BaseCrudTable from '../../../../../components/crud-table'
import { DatasetRunButton } from '../../_components/dataset-run-button'
import {
  DatasetRunListItem,
  useCreateDatasetRun,
  useDataset,
  useDatasetRunLink,
  useDatasetRuns,
} from '../../_hooks'

const columnHelper = createColumnHelper<DatasetRunListItem>()

const createDatasetRunSchema = baseFormSchema.extend({
  datasetId: z.string(),
})

const DatasetRunFeature = () => {
  const { data: dataset } = useDataset()
  const { data, page, setPage } = useDatasetRuns()
  const createDatasetRun = useCreateDatasetRun()
  const datasetLink = useDatasetRunLink()

  const baseColumns = useMemo(() => {
    return ['createdAt', 'updatedAt'] as const
  }, [])

  const columns = useMemo(() => {
    return [] satisfies ColumnDef<DatasetRunListItem>[]
  }, [])

  const form = useForm({
    resolver: zodResolver(createDatasetRunSchema),
  })

  useEffect(() => {
    if (!dataset) return
    form.setValue('datasetId', dataset.id)
  }, [dataset])

  return (
    <div>
      <div className="flex justify-between">
        <h1 className="text-3xl font-medium mb-2">Dataset Runs</h1>
        <CrudFormDialog
          form={form}
          mutation={createDatasetRun}
          buttonText="Add Dataset Run"
          entityName="Dataset Run"
          entityNamePlural="dataset runs"
        >
          <FormField
            control={form.control}
            name="dataType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data Type</FormLabel>
                <Select {...field} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parquet">Parquet</SelectItem>
                    <SelectItem value="geoparquet">Geoparquet</SelectItem>
                    <SelectItem value="stac-geoparquet">
                      Stac Geoparquet
                    </SelectItem>
                    <SelectItem value="zarr">Zarr</SelectItem>
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
          title="DatasetRun"
          itemLink={datasetLink}
          itemButton={(datasetRun) => (
            <DatasetRunButton datasetRun={datasetRun} />
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

export default DatasetRunFeature
