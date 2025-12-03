import { ArrowUpRightIcon } from 'lucide-react'
import { formatDateTime } from '@repo/ui/lib/date'
import { DetailCard } from '../../_components/detail-cards'
import { NoMainRunCard } from '../../_components/no-main-run-card'
import { GeometriesRunListItem, useGeometriesRunLink } from '../_hooks'

export const GeometriesRunSummaryCard = ({
  run,
  mainRun,
}: {
  run?: GeometriesRunListItem | undefined | null
  mainRun?: boolean
}) => {
  const geometriesRunLink = useGeometriesRunLink()

  if (!run && mainRun) {
    return <NoMainRunCard />
  }

  return (
    <DetailCard
      title={`Created at ${formatDateTime(run?.createdAt)}`}
      description={
        mainRun ? 'Geometries Main Run Summary' : 'Geometries Run Summary'
      }
      actionText="Open"
      actionLink={run && mainRun ? geometriesRunLink(run) : undefined}
      actionIcon={<ArrowUpRightIcon />}
      // footer={`Data range: ${formatDate(geometries?.mainRun?.outputSummary?.startTime)} to ${formatDate(geometries?.mainRun?.outputSummary?.endTime)}`}
      // subFooter={
      //   <div className="flex flex-col gap-2">
      //     {`${geometries?.mainRun?.outputSummary?.outputCount} outputs`}
      //     <div className="flex gap-2">
      //       {geometries.mainRun?.outputSummary?.variables?.map((variable) => (
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
