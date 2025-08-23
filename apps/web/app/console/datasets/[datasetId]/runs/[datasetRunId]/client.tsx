'use client'

import { pluralize } from '@repo/ui/lib/utils'
import { ArrowUpRightIcon } from 'lucide-react'
import {
  baseFormSchema,
  CrudForm,
} from '../../../../../../components/crud-form'
import { DetailCard } from '../../../../_components/detail-cards'
import { MainRunBadge } from '../../../../_components/main-run-badge'
import { useProductRunsLink } from '../../../../products/_hooks'
import { DatasetRunSummaryCard } from '../../../_components/dataset-run-summary-card'
import {
  useDataset,
  useDatasetRun,
  useDeleteDatasetRun,
  useUpdateDatasetRun,
} from '../../../_hooks'

const DatasetRunDetails = () => {
  const { data: datasetRun } = useDatasetRun()
  const updateDatasetRun = useUpdateDatasetRun()
  const deleteDatasetRun = useDeleteDatasetRun('/console/datasetRuns')
  const { data: dataset } = useDataset()
  const productRunsLink = useProductRunsLink()

  return (
    <div className="max-w-2xl gap-8 flex flex-col">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DatasetRunSummaryCard dataset={dataset} datasetRun={datasetRun} />
        <div className="grid grid-cols-1 grid-rows-3 gap-4">
          {datasetRun && (
            <DetailCard
              title={`${datasetRun?.productRunCount} ${pluralize(datasetRun?.productRunCount, 'product run', 'product runs')}`}
              description="Used by Products Runs"
              actionText="Open"
              actionLink={productRunsLink(null, {
                datasetRunId: datasetRun?.id,
              })}
              actionIcon={<ArrowUpRightIcon />}
            />
          )}
        </div>
      </div>

      {datasetRun && (
        <CrudForm
          data={datasetRun}
          defaultValues={{
            name: datasetRun?.name,
            description: datasetRun?.description ?? undefined,
            metadata: datasetRun?.metadata ?? undefined,
          }}
          formSchema={baseFormSchema}
          updateMutation={updateDatasetRun}
          deleteMutation={deleteDatasetRun}
        />
      )}
    </div>
  )
}

export default DatasetRunDetails
