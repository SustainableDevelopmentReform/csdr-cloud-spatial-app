'use client'

import { useMemo } from 'react'
import Pagination from '~/components/pagination'
import { baseFormSchema } from '../../../components/crud-form'
import CrudFormDialog from '../../../components/crud-form-dialog'
import BaseCrudTable from '../../../components/crud-table'
import { DatasetButton } from './_components/dataset-button'
import { useCreateDataset, useDatasetLink, useDatasets } from './_hooks'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/ui/form'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@repo/ui/components/ui/select'

const DatasetFeature = () => {
  const { data, page, setPage } = useDatasets()
  const createDataset = useCreateDataset()

  const datasetLink = useDatasetLink()

  const baseColumns = useMemo(() => {
    return ['description', 'createdAt', 'updatedAt'] as const
  }, [])

  const form = useForm({
    resolver: zodResolver(baseFormSchema),
  })

  return (
    <div>
      <div className="flex justify-between">
        <h1 className="text-3xl font-medium mb-2">Datasets</h1>
        <CrudFormDialog
          form={form}
          mutation={createDataset}
          buttonText="Add Dataset"
          entityName="Dataset"
          entityNamePlural="datasets"
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
                      STAC Geoparquet
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
          title="Dataset"
          itemLink={datasetLink}
          itemButton={(dataset) => <DatasetButton dataset={dataset} />}
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

export default DatasetFeature
