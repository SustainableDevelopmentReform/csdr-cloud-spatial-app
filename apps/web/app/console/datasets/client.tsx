'use client'

import { Button } from '@repo/ui/components/ui/button'
import { useMemo } from 'react'
import Pagination from '~/components/pagination'
import BaseCrudTable from '../../../components/crud-table'
import DatasetForm from './_components/form'
import { useDatasetLink, useDatasets } from './_hooks'
import { DatasetButton } from './_components/dataset-button'

const DatasetFeature = () => {
  const { data, isOpen, setOpen, page, setPage } = useDatasets()

  const datasetLink = useDatasetLink()

  const baseColumns = useMemo(() => {
    return ['description', 'createdAt', 'updatedAt'] as const
  }, [])

  return (
    <div>
      <div className="flex justify-between">
        <h1 className="text-3xl font-medium mb-2">Datasets</h1>
        <DatasetForm
          key={`add-dataset-form-${isOpen}`}
          isOpen={isOpen}
          onOpen={() => setOpen(true)}
          onClose={() => setOpen(false)}
        >
          <Button>Add Dataset</Button>
        </DatasetForm>
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
