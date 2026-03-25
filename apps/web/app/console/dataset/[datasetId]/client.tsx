'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { updateDatasetSchema } from '@repo/schemas/crud'
import { pluralize } from '@repo/ui/lib/utils'
import { ArrowUpRightIcon } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { CrudForm } from '../../../../components/form/crud-form'
import { DATASETS_BASE_PATH } from '../../../../lib/paths'
import { DetailCard } from '../../_components/detail-cards'
import { ResourceUsageDetailCards } from '../../_components/resource-usage-detail-cards'
import { SourcesCard } from '../../_components/sources-card'
import { useProductsLink } from '../../product/_hooks'
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
  const deleteDataset = useDeleteDataset(undefined, DATASETS_BASE_PATH)
  const datasetRunsLink = useDatasetRunsLink()

  const form = useForm({
    resolver: zodResolver(updateDatasetSchema),
  })

  useEffect(() => {
    if (dataset) {
      form.reset(dataset)
    }
  }, [dataset, form])

  return (
    <div className="w-[800px] max-w-full gap-8 flex flex-col">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DatasetRunSummaryCard run={dataset?.mainRun} mainRun />
        <div className="grid grid-cols-1 gap-4">
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
          {dataset && <SourcesCard resource={dataset} />}
          {dataset && (
            <ResourceUsageDetailCards
              reportCount={dataset.reportCount}
              dashboardCount={dataset.dashboardCount}
              reportQuery={{ datasetId: dataset.id }}
              dashboardQuery={{ datasetId: dataset.id }}
            />
          )}
        </div>
      </div>

      <CrudForm
        form={form}
        mutation={updateDataset}
        deleteMutation={deleteDataset}
        entityName="Dataset"
        entityNamePlural="datasets"
        successMessage="Updated Dataset"
      />
    </div>
  )
}

export default DatasetDetails
