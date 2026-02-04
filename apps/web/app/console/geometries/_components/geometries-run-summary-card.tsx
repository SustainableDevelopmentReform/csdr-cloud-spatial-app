import { formatDateTime } from '@repo/ui/lib/date'
import { DetailCard } from '../../_components/detail-cards'
import { NoMainRunCard } from '../../_components/no-main-run-card'
import { GeometriesRunListItem } from '../_hooks'
import { GeometriesRunButton } from './geometries-run-button'

export const GeometriesRunSummaryCard = ({
  run,
  mainRun,
}: {
  run?: GeometriesRunListItem | undefined | null
  mainRun?: boolean
}) => {
  if (!run && mainRun) {
    return <NoMainRunCard />
  }

  return (
    <DetailCard
      title={`Created at ${formatDateTime(run?.createdAt)}`}
      description={
        mainRun ? 'Geometries Main Run Summary' : 'Geometries Run Summary'
      }
      actionButton={
        run && mainRun ? <GeometriesRunButton geometriesRun={run} /> : undefined
      }
      // footer={`Data range: ${formatDate(geometries?.mainRun?.outputSummary?.startTime)} to ${formatDate(geometries?.mainRun?.outputSummary?.endTime)}`}
      // subFooter={
      //   <div className="flex flex-col gap-2">
      //     {`${geometries?.mainRun?.outputSummary?.outputCount} outputs`}
      //     <div className="flex gap-2">
      //       {geometries.mainRun?.outputSummary?.indicators?.map((indicator) => (
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
