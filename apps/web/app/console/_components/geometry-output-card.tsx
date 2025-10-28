import { GeometryOutputListItem } from '../geometries/_hooks'
import { DetailCard } from './detail-cards'
import { GeometriesRunButton } from '../geometries/_components/geometries-run-button'
import { DetailCardProps } from './detail-cards'
import { GeometriesButton } from '../geometries/_components/geometries-button'
import { formatDateTime } from '../../../utils/date'

export const GeometryOutputCard = ({
  geometryOutput,
  ...cardProps
}: {
  geometryOutput: GeometryOutputListItem
} & Omit<DetailCardProps, 'title' | 'description' | 'subFooter'>) => {
  return (
    <DetailCard
      title={`Created at ${formatDateTime(geometryOutput.createdAt)}`}
      description="Geometry"
      subFooter={
        <div className="flex flex-col gap-2">
          <GeometriesButton
            geometries={geometryOutput.geometriesRun.geometries}
          />
          <GeometriesRunButton geometriesRun={geometryOutput.geometriesRun} />
        </div>
      }
      footer={`Updated at ${formatDateTime(geometryOutput.updatedAt)}`}
      {...cardProps}
    />
  )
}
