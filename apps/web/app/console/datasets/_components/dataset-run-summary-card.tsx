import { ArrowUpRightIcon } from 'lucide-react'
import { formatDateTime } from '../../../../utils/date'
import { DetailCard } from '../../_components/detail-cards'
import { Dataset, DatasetRun, useDatasetRunLink } from '../_hooks'

export const DatasetRunSummaryCard = ({
  dataset,
  datasetRun,
}: {
  dataset: Dataset | undefined | null
  datasetRun?: DatasetRun | undefined | null
}) => {
  const datasetRunLink = useDatasetRunLink()

  const run = datasetRun ?? dataset?.mainRun

  if (!run) {
    return null
  }

  return (
    <DetailCard
      title={`Created at ${formatDateTime(run?.createdAt)}`}
      description={
        datasetRun ? 'Dataset Run Summary' : 'Dataset Main Run Summary'
      }
      actionText="Open"
      actionLink={!datasetRun ? datasetRunLink(run) : undefined}
      actionIcon={<ArrowUpRightIcon />}
      // footer={`Data range: ${formatDate(dataset?.mainRun?.outputSummary?.startTime)} to ${formatDate(dataset?.mainRun?.outputSummary?.endTime)}`}
      // subFooter={
      //   <div className="flex flex-col gap-2">
      //     {`${dataset?.mainRun?.outputSummary?.outputCount} outputs`}
      //     <div className="flex gap-2">
      //       {dataset.mainRun?.outputSummary?.variables?.map((variable) => (
      //         <VariableButton
      //           variable={variable.variable}
      //           key={variable.variable.id}
      //         />
      //       ))}
      //     </div>
      //   </div>
      // }
    />
  )
}
