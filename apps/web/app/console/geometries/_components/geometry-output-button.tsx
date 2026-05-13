import { BadgeLink } from '../../../../components/badge-link'
import { GeometryOutputLinkParams, useGeometryOutputLink } from '../_hooks'
import { SquareStackIcon } from 'lucide-react'

export const GeometryOutputButton = ({
  geometryOutput,
}: {
  geometryOutput: GeometryOutputLinkParams
}) => {
  const geometriesRunLink = useGeometryOutputLink()

  return (
    <BadgeLink
      href={geometriesRunLink(geometryOutput)}
      icon={<SquareStackIcon />}
    >
      {geometryOutput.name}
    </BadgeLink>
  )
}
