import { ArrowUpRightIcon } from 'lucide-react'
import { BadgeLink } from '../../../../components/badge-link'
import { GeometryOutput, useGeometryOutputLink } from '../_hooks'

export const GeometryOutputButtons = ({
  geometryOutputs,
}: {
  geometryOutputs: GeometryOutput[]
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
  geometryOutput: GeometryOutput
}) => {
  const geometriesRunLink = useGeometryOutputLink()

  return (
    <BadgeLink href={geometriesRunLink(geometryOutput)} variant="outline">
      {geometryOutput.name}
      <ArrowUpRightIcon className="size-4" />
    </BadgeLink>
  )
}
