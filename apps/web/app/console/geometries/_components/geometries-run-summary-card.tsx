import { ArrowUpRightIcon } from 'lucide-react'
import { formatDateTime } from '../../../../utils/date'
import { DetailCard } from '../../_components/detail-cards'
import {
  GeometriesListItem,
  GeometriesRunDetail,
  useGeometriesRunLink,
} from '../_hooks'
import { NoMainRunCard } from '../../_components/no-main-run-card'

export const GeometriesRunSummaryCard = ({
  geometries,
  geometriesRun,
}: {
  geometries: GeometriesListItem | undefined | null
  geometriesRun?: GeometriesRunDetail | undefined | null
}) => {
  const geometriesRunLink = useGeometriesRunLink()

  const run = geometriesRun ?? geometries?.mainRun

  if (!run) {
    return <NoMainRunCard />
  }

  return (
    <DetailCard
      title={`Created at ${formatDateTime(run?.createdAt)}`}
      description={
        geometriesRun ? 'Geometries Run Summary' : 'Geometries Main Run Summary'
      }
      actionText="Open"
      actionLink={!geometriesRun ? geometriesRunLink(run) : undefined}
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
