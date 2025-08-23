'use client'

import { Button } from '@repo/ui/components/ui/button'
import { ColumnDef, createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import Pagination from '~/components/pagination'
import BaseCrudTable from '../../../../../components/crud-table'
import { MainRunBadge } from '../../../_components/main-run-badge'
import { DatasetRunButton } from '../../_components/dataset-run-button'
import DatasetRunForm from '../../_components/form'
import {
  DatasetRunListItem,
  useDataset,
  useDatasetRunLink,
  useDatasetRuns,
} from '../../_hooks'

const columnHelper = createColumnHelper<DatasetRunListItem>()

const DatasetRunFeature = () => {
  const { data, isOpen, setOpen, page, setPage } = useDatasetRuns()
  const { data: dataset } = useDataset()

  const datasetLink = useDatasetRunLink()

  const baseColumns = useMemo(() => {
    return ['createdAt', 'updatedAt'] as const
  }, [])

  const columns = useMemo(() => {
    return [] satisfies ColumnDef<DatasetRunListItem>[]
  }, [])

  return (
    <div>
      <div className="flex justify-between">
        <h1 className="text-3xl font-medium mb-2">Dataset Runs</h1>
        <DatasetRunForm
          key={`add-dataset-form-${isOpen}`}
          isOpen={isOpen}
          onOpen={() => setOpen(true)}
          onClose={() => setOpen(false)}
        >
          <Button>Add Dataset Run</Button>
        </DatasetRunForm>
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
