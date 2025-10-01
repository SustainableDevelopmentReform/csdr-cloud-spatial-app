'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ColumnDef, createColumnHelper } from '@tanstack/react-table'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import Pagination from '~/components/pagination'
import CrudFormDialog from '../../../../../components/crud-form-dialog'
import { CrudFormRunFields } from '../../../../../components/crud-form-run-fields'
import BaseCrudTable from '../../../../../components/crud-table'
import { DatasetRunButton } from '../../_components/dataset-run-button'
import {
  DatasetRunListItem,
  useCreateDatasetRun,
  useDataset,
  useDatasetRunLink,
  useDatasetRuns,
} from '../../_hooks'
import { createDatasetRunSchema } from '@repo/schemas/crud'

const columnHelper = createColumnHelper<DatasetRunListItem>()

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
          <CrudFormRunFields form={form} />
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
