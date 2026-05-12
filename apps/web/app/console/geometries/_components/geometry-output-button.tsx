import { BadgeLink } from '../../../../components/badge-link'
import { GeometryOutputLinkParams, useGeometryOutputLink } from '../_hooks'
import { SquareStackIcon } from 'lucide-react'

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
      className="border-geometry"
      icon={<SquareStackIcon />}
    >
      {geometryOutput.name}
    </BadgeLink>
  )
}
