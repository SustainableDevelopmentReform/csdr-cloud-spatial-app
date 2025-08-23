'use client'

import { pluralize } from '@repo/ui/lib/utils'
import { ArrowUpRightIcon } from 'lucide-react'
import { z } from 'zod'
import { baseFormSchema, CrudForm } from '../../../../components/crud-form'
import { DetailCard } from '../../_components/detail-cards'
import { useProductsLink } from '../../products/_hooks'
import { DatasetRunSummaryCard } from '../_components/dataset-run-summary-card'
import {
  useDataset,
  useDatasetRunsLink,
  useDeleteDataset,
  useUpdateDataset,
} from '../_hooks'

const DatasetDetails = () => {
  const { data: dataset } = useDataset()
  const productsLink = useProductsLink()
  const updateDataset = useUpdateDataset()
  const deleteDataset = useDeleteDataset('/console/datasets')
  const datasetRunsLink = useDatasetRunsLink()

  return (
    <div className="max-w-2xl gap-8 flex flex-col">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DatasetRunSummaryCard dataset={dataset} />
        <div className="grid grid-cols-1 grid-rows-3 gap-4">
          {dataset && (
            <DetailCard
              title={`${dataset?.runCount} ${pluralize(dataset?.runCount, 'run', 'runs')}`}
              description="Dataset Runs"
              actionText="Open"
              actionLink={datasetRunsLink(dataset)}
              actionIcon={<ArrowUpRightIcon />}
            />
          )}
          {dataset && (
            <DetailCard
              title={`${dataset?.productCount} ${pluralize(dataset?.productCount, 'product', 'products')}`}
              description="Products"
              actionText="Open"
              actionLink={productsLink({ datasetId: dataset.id })}
              actionIcon={<ArrowUpRightIcon />}
            />
          )}
        </div>
      </div>
      {dataset && (
        <CrudForm
          data={dataset}
          defaultValues={{
            name: dataset?.name,
            description: dataset?.description ?? undefined,
            metadata: dataset?.metadata,
          }}
          formSchema={baseFormSchema}
          updateMutation={updateDataset}
          deleteMutation={deleteDataset}
        />
      )}
    </div>
  )
}

export default DatasetDetails
