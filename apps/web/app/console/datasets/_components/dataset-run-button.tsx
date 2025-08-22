import { ArrowUpRightIcon } from 'lucide-react'
import { BadgeLink } from '../../../../components/badge-link'
import { MainRunBadge } from '../../_components/main-run-badge'
import { DatasetRunLinkParams, useDatasetRunLink } from '../_hooks'

export const DatasetRunButtons = ({
  datasetRuns,
}: {
  datasetRuns: DatasetRunLinkParams[]
}) => {
  return (
    <div className="flex flex-wrap gap-2">
      {datasetRuns?.map((datasetRun) => (
        <DatasetRunButton datasetRun={datasetRun} key={datasetRun.id} />
      ))}
    </div>
  )
}

export const DatasetRunButton = ({
  datasetRun,
  isMainRun,
}: {
  datasetRun: DatasetRunLinkParams
  isMainRun?: boolean
}) => {
  const datasetRunLink = useDatasetRunLink()

  return (
    <BadgeLink href={datasetRunLink(datasetRun)} variant="datasetRun">
      {datasetRun.id}
      {isMainRun && <MainRunBadge size="xs" variant="dataset" />}
      <ArrowUpRightIcon className="size-4" />
    </BadgeLink>
  )
}
