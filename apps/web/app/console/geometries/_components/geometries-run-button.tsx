import { BadgeLink } from '../../../../components/badge-link'
import { GeometriesRunLinkParams, useGeometriesRunLink } from '../_hooks'
import { MainRunBadge } from '../../_components/main-run-badge'
import { SquareFunctionIcon } from 'lucide-react'

export const GeometriesRunButton = ({
  geometriesRun,
}: {
  geometriesRun: GeometriesRunLinkParams
}) => {
  const geometriesRunLink = useGeometriesRunLink()

  return (
    <BadgeLink
      href={geometriesRunLink(geometriesRun)}
      icon={<SquareFunctionIcon />}
    >
      {geometriesRun.geometries.mainRunId === geometriesRun.id && (
        <MainRunBadge size="xs" />
      )}
      {geometriesRun.name}
    </BadgeLink>
  )
}
