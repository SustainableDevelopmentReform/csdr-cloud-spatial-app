import { GeometryOutputLinkParams } from '../geometries/_hooks'
import { DetailCard } from './detail-cards'
import { GeometriesRunButton } from '../geometries/_components/geometries-run-button'
import { DetailCardProps } from './detail-cards'
import { GeometriesButton } from '../geometries/_components/geometries-button'

export const GeometryOutputCard = ({
  geometryOutput,
  ...cardProps
}: {
  geometryOutput: GeometryOutputLinkParams
} & Omit<DetailCardProps, 'title' | 'description' | 'subFooter'>) => {
  return (
    <DetailCard
      title={`${geometryOutput.geometriesRun.geometries.name} : ${geometryOutput?.name}`}
      description="Geometry"
      subFooter={
        <div className="flex flex-col gap-2">
          <GeometriesButton
            geometries={geometryOutput.geometriesRun.geometries}
          />
          <GeometriesRunButton geometriesRun={geometryOutput.geometriesRun} />
        </div>
      }
      {...cardProps}
    />
  )
}
