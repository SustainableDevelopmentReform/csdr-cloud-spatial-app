import { BadgeLink } from '../../../../components/badge-link'
import { GeometriesRunLinkParams, useGeometriesRunLink } from '../_hooks'
import { MainRunBadge } from '../../_components/main-run-badge'
import { useRunVersionSidebar } from '../../_components/run-version-sidebar'
import { SquareFunctionIcon, SquareStackIcon } from 'lucide-react'
import type { MouseEventHandler } from 'react'
import { withDataLibrarySource } from '~/lib/paths'

export const GeometriesRunButton = ({
  geometriesRun,
}: {
  geometriesRun: GeometriesRunLinkParams
}) => {
  const geometriesRunLink = useGeometriesRunLink()
  const runVersionSidebar = useRunVersionSidebar()
  const href = withDataLibrarySource(geometriesRunLink(geometriesRun))
  const handleClick: MouseEventHandler<HTMLAnchorElement> = (event) => {
    if (!runVersionSidebar) {
      return
    }

    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return
    }

    event.preventDefault()
    runVersionSidebar.openRunVersion({
      id: geometriesRun.id,
      type: 'geometries',
    })
  }

  return (
    <BadgeLink href={href} icon={<SquareStackIcon />} onClick={handleClick}>
      {geometriesRun.name}
      <SquareFunctionIcon />
      {geometriesRun.geometries.mainRunId === geometriesRun.id && (
        <MainRunBadge size="xs" />
      )}
    </BadgeLink>
  )
}
