'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { pluralize } from '@repo/ui/lib/utils'
import { ArrowUpRightIcon } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import {
  baseFormSchema,
  CrudForm,
} from '../../../../../../components/crud-form'
import { CrudFormAction } from '../../../../../../components/crud-form-action'
import { DetailCard } from '../../../../_components/detail-cards'
import { useProductRunsLink } from '../../../../products/_hooks'
import { DatasetRunSummaryCard } from '../../../_components/dataset-run-summary-card'
import {
  useDataset,
  useDatasetRun,
  useDeleteDatasetRun,
  useSetDatasetMainRun,
  useUpdateDatasetRun,
} from '../../../_hooks'

const DatasetRunDetails = () => {
  const { data: datasetRun } = useDatasetRun()
  const updateDatasetRun = useUpdateDatasetRun()
  const deleteDatasetRun = useDeleteDatasetRun(
    undefined,
    '/console/datasetRuns',
  )
  const { data: dataset } = useDataset()
  const productRunsLink = useProductRunsLink()

  const setDatasetMainRun = useSetDatasetMainRun(datasetRun)

  const formActions: CrudFormAction[] = useMemo(
    () => [
      {
        title: 'Set as Main Run',
        description: 'Set this as the main run for the dataset',
        buttonVariant: 'default',
        buttonTitle: 'Set as Main Run',
        mutation: setDatasetMainRun,
      },
    ],
    [setDatasetMainRun],
  )

  const form = useForm({
    resolver: zodResolver(baseFormSchema),
  })

  useEffect(() => {
    if (datasetRun) {
      form.reset(datasetRun)
    }
  }, [datasetRun, form])

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

      <CrudForm
        form={form}
        mutation={updateDatasetRun}
        deleteMutation={deleteDatasetRun}
        entityName="Dataset Run"
        entityNamePlural="dataset runs"
        actions={formActions}
      />
    </div>
  )
}

export default DatasetRunDetails
