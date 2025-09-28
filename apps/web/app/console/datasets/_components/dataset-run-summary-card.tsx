import { ArrowUpRightIcon } from 'lucide-react'
import { formatDateTime } from '../../../../utils/date'
import { DetailCard } from '../../_components/detail-cards'
import { NoMainRunCard } from '../../_components/no-main-run-card'
import { DatasetRunListItem, useDatasetRunLink } from '../_hooks'

export const DatasetRunSummaryCard = ({
  run,
  mainRun = false,
}: {
  run?: DatasetRunListItem | undefined | null
  mainRun?: boolean
}) => {
  const datasetRunLink = useDatasetRunLink()

  if (!run) {
    return <NoMainRunCard />
  }

  return (
    <DetailCard
      title={`Created at ${formatDateTime(run?.createdAt)}`}
      description={mainRun ? 'Dataset Main Run Summary' : 'Dataset Run Summary'}
      actionText="Open"
      actionLink={run && mainRun ? datasetRunLink(run) : undefined}
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
