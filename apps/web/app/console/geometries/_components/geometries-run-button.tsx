import { ArrowUpRightIcon } from 'lucide-react'
import { BadgeLink } from '../../../../components/badge-link'
import { GeometriesRunLinkParams, useGeometriesRunLink } from '../_hooks'
import { MainRunBadge } from '../../_components/main-run-badge'

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
    <BadgeLink href={geometriesRunLink(geometriesRun)} variant="geometriesRun">
      {geometriesRun.name}
      {geometriesRun.geometries.mainRunId === geometriesRun.id && (
        <MainRunBadge size="xs" variant="geometries" />
      )}
      <ArrowUpRightIcon className="size-4" />
    </BadgeLink>
  )
}
