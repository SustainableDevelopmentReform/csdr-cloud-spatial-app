import { BadgeLink } from '../../../../components/badge-link'
import { GeometriesRunLinkParams, useGeometriesRunLink } from '../_hooks'
import { MainRunBadge } from '../../_components/main-run-badge'
import { SquareStackIcon } from 'lucide-react'

export const GeometriesRunButtons = ({
  geometriesRuns,
}: {
  geometriesRuns: GeometriesRunLinkParams[]
}) => {
  return (
    <div className="flex flex-wrap gap-2">
      {geometriesRuns?.map((geometriesRun) => (
        <GeometriesRunButton
          geometriesRun={geometriesRun}
          key={geometriesRun.id}
        />
      ))}
    </div>
  )
}

export const GeometriesRunButton = ({
  geometriesRun,
}: {
  geometriesRun: GeometriesRunLinkParams
}) => {
  const geometriesRunLink = useGeometriesRunLink()

  return (
    <BadgeLink
      href={geometriesRunLink(geometriesRun)}
      variant="geometriesRun"
      icon={<SquareStackIcon />}
    >
      {geometriesRun.geometries.mainRunId === geometriesRun.id && (
        <MainRunBadge size="xs" variant="geometries" />
      )}
      {geometriesRun.name}
    </BadgeLink>
  )
}
