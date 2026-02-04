import { formatDateTime } from '@repo/ui/lib/date'
import { DetailCard } from '../../_components/detail-cards'
import { NoMainRunCard } from '../../_components/no-main-run-card'
import { DatasetRunListItem } from '../_hooks'
import { DatasetRunButton } from './dataset-run-button'

export const DatasetRunSummaryCard = ({
  run,
  mainRun = false,
}: {
  run?: DatasetRunListItem | undefined | null
  mainRun?: boolean
}) => {
  if (!run) {
    return <NoMainRunCard />
  }

  return (
    <DetailCard
      title={`Created at ${formatDateTime(run?.createdAt)}`}
      description={mainRun ? 'Dataset Main Run Summary' : 'Dataset Run Summary'}
      actionButton={
        run && mainRun ? <DatasetRunButton datasetRun={run} /> : undefined
      }
      // footer={`Data range: ${formatDate(dataset?.mainRun?.outputSummary?.startTime)} to ${formatDate(dataset?.mainRun?.outputSummary?.endTime)}`}
      // subFooter={
      //   <div className="flex flex-col gap-2">
      //     {`${dataset?.mainRun?.outputSummary?.outputCount} outputs`}
      //     <div className="flex gap-2">
      //       {dataset.mainRun?.outputSummary?.indicators?.map((indicator) => (
      //         <IndicatorButton
      //           indicator={indicator.indicator}
      //           key={indicator.indicator.id}
      //         />
      //       ))}
      //     </div>
      //   </div>
      // }
    />
  )
}
