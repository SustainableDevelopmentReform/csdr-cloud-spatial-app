'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { updateDatasetRunSchema } from '@repo/schemas/crud'
import { pluralize } from '@repo/ui/lib/utils'
import { ArrowUpRightIcon } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { CrudForm } from '../../../../components/crud-form'
import { CrudFormAction } from '../../../../components/crud-form-action'
import { CrudFormRunFields } from '../../../../components/crud-form-run-fields'
import { DetailCard } from '../../_components/detail-cards'
import { DatasetRunSummaryCard } from '../../datasets/_components/dataset-run-summary-card'
import {
  useDatasetRun,
  useUpdateDatasetRun,
  useDeleteDatasetRun,
  useDataset,
  useSetDatasetMainRun,
} from '../../datasets/_hooks'
import { useProductRunsLink } from '../../products/_hooks'

const DatasetRunDetails = () => {
  const { data: datasetRun } = useDatasetRun()
  const updateDatasetRun = useUpdateDatasetRun()
  const deleteDatasetRun = useDeleteDatasetRun(
    undefined,
    '/console/datasetRuns',
  )

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
        disabled: datasetRun?.id === datasetRun?.dataset.mainRunId,
      },
    ],
    [setDatasetMainRun],
  )

  const form = useForm({
    resolver: zodResolver(updateDatasetRunSchema),
  })

  useEffect(() => {
    if (datasetRun) {
      form.reset(datasetRun)
    }
  }, [datasetRun, form])

  return (
    <div className="w-[800px] max-w-full gap-8 flex flex-col">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DatasetRunSummaryCard run={datasetRun} />
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
        successMessage="Updated Dataset Run"
      >
        <CrudFormRunFields form={form} readOnlyFields={'all'} />
      </CrudForm>
    </div>
  )
}

export default DatasetRunDetails
