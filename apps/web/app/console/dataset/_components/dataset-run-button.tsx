import { BadgeLink } from '../../../../components/badge-link'
import { getConsoleSideDrawerOpenSource } from '../../_components/console-side-drawer'
import { useRunVersionSidebar } from '../../_components/run-version-sidebar'
import { MainRunBadge } from '../../_components/main-run-badge'
import { DatasetRunLinkParams, useDatasetRunLink } from '../_hooks'
import { EarthIcon, SquareFunctionIcon } from 'lucide-react'
import type { MouseEventHandler } from 'react'
import { withDataLibrarySource } from '~/lib/paths'

export const DatasetRunButton = ({
  datasetRun,
}: {
  datasetRun: DatasetRunLinkParams
}) => {
  const datasetRunLink = useDatasetRunLink()
  const runVersionSidebar = useRunVersionSidebar()
  const href = withDataLibrarySource(datasetRunLink(datasetRun))
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
    runVersionSidebar.openRunVersion(
      { id: datasetRun.id, type: 'dataset' },
      { source: getConsoleSideDrawerOpenSource(event.currentTarget) },
    )
  }

  return (
    <BadgeLink href={href} icon={<EarthIcon />} onClick={handleClick}>
      {datasetRun.name}
      <SquareFunctionIcon />
      {datasetRun.dataset.mainRunId === datasetRun.id && (
        <MainRunBadge size="xs" />
      )}
    </BadgeLink>
  )
}
