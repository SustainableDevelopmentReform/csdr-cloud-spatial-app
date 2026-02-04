import { BadgeLink } from '../../../../components/badge-link'
import { GeometryOutputLinkParams, useGeometryOutputLink } from '../_hooks'

export const GeometryOutputButtons = ({
  geometryOutputs,
}: {
  geometryOutputs: GeometryOutputLinkParams[]
}) => {
  return (
    <div className="flex flex-wrap gap-2">
      {geometryOutputs?.map((geometryOutput) => (
        <GeometryOutputButton
          geometryOutput={geometryOutput}
          key={geometryOutput.id}
        />
      ))}
    </div>
  )
}

export const GeometryOutputButton = ({
  geometryOutput,
}: {
  geometryOutput: GeometryOutputLinkParams
}) => {
  const geometriesRunLink = useGeometryOutputLink()

  return (
    <BadgeLink
      href={geometriesRunLink(geometryOutput)}
      variant="outline"
      className="border-geometriesRun"
    >
      {geometryOutput.name}
    </BadgeLink>
  )
}
