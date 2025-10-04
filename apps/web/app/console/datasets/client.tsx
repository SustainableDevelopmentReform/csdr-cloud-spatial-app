'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { createDatasetSchema } from '@repo/schemas/crud'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/ui/form'
import { Input } from '@repo/ui/components/ui/input'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import Pagination from '~/components/pagination'
import CrudFormDialog from '../../../components/crud-form-dialog'
import BaseCrudTable from '../../../components/crud-table'
import { DatasetButton } from './_components/dataset-button'
import { useCreateDataset, useDatasetLink, useDatasets } from './_hooks'

const DatasetFeature = () => {
  const { data, query, setSearchParams } = useDatasets()
  const createDataset = useCreateDataset()

  const datasetLink = useDatasetLink()

  const baseColumns = useMemo(() => {
    return ['description', 'createdAt', 'updatedAt'] as const
  }, [])

  const form = useForm({
    resolver: zodResolver(createDatasetSchema),
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
            name={'sourceUrl'}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Source URL</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={'sourceMetadataUrl'}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Source Metadata URL</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
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
          currentPage={query.page ?? 1}
          onPageChange={(page) => setSearchParams({ page })}
        />
      </div>
    </div>
  )
}

export default DatasetFeature
