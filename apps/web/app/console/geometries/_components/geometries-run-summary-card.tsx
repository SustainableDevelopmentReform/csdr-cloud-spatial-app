import { ArrowUpRightIcon } from 'lucide-react'
import { formatDateTime } from '../../../../utils/date'
import { DetailCard } from '../../_components/detail-cards'
import { Geometries, GeometriesRun, useGeometriesRunLink } from '../_hooks'

export const GeometriesRunSummaryCard = ({
  geometries,
  geometriesRun,
}: {
  geometries: Geometries | undefined | null
  geometriesRun?: GeometriesRun | undefined | null
}) => {
  const geometriesRunLink = useGeometriesRunLink()

  const run = geometriesRun ?? geometries?.mainRun

  if (!run) {
    return null
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
