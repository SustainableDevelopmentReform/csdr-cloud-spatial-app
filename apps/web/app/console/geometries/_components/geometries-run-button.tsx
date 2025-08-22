import { ArrowUpRightIcon } from 'lucide-react'
import { BadgeLink } from '../../../../components/badge-link'
import { GeometriesRun, useGeometriesRunLink } from '../_hooks'
import { MainRunBadge } from '../../_components/main-run-badge'

export const GeometriesRunButtons = ({
  geometriesRuns,
}: {
  geometriesRuns: GeometriesRun[]
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
  isMainRun,
}: {
  geometriesRun: GeometriesRun
  isMainRun?: boolean
}) => {
  const geometriesRunLink = useGeometriesRunLink()

  return (
    <BadgeLink href={geometriesRunLink(geometriesRun)} variant="geometriesRun">
      {geometriesRun.id}
      {isMainRun && <MainRunBadge size="xs" variant="geometries" />}
      <ArrowUpRightIcon className="size-4" />
    </BadgeLink>
  )
}
