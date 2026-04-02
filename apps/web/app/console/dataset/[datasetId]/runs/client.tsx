'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ColumnDef, createColumnHelper } from '@tanstack/react-table'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import Pagination from '~/components/table/pagination'
import CrudFormDialog from '../../../../../components/form/crud-form-dialog'
import { CrudFormRunFields } from '../../../../../components/form/crud-form-run-fields'
import BaseCrudTable from '../../../../../components/table/crud-table'
import { DatasetRunButton } from '../../_components/dataset-run-button'
import {
  DatasetRunListItem,
  useCreateDatasetRun,
  useDataset,
  useDatasetRunLink,
  useDatasetRuns,
} from '../../_hooks'
import { createDatasetRunSchema } from '@repo/schemas/crud'
import { SearchInput } from '../../../../../components/table/search-input'

const columnHelper = createColumnHelper<DatasetRunListItem>()

const DatasetRunFeature = () => {
  const { data: dataset } = useDataset()
  const {
    data,
    query,
    setSearchParams,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
  } = useDatasetRuns(undefined, undefined, true)
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
  }, [dataset, form])

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
          hiddenFields={['visibility']}
        >
          <CrudFormRunFields form={form} />
        </CrudFormDialog>
      </div>
      <div>
        <SearchInput
          placeholder="Search dataset runs"
          value={query?.search ?? ''}
          onChange={(e) => setSearchParams({ search: e.target.value })}
        />
        <BaseCrudTable
          data={data?.data || []}
          isLoading={isLoading}
          baseColumns={baseColumns}
          extraColumns={columns}
          title="DatasetRun"
          itemLink={datasetLink}
          itemButton={(datasetRun) => (
            <DatasetRunButton datasetRun={datasetRun} />
          )}
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

export default DatasetRunFeature
