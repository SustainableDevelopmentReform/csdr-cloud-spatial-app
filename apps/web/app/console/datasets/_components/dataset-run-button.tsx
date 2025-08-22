import { ArrowUpRightIcon } from 'lucide-react'
import { BadgeLink } from '../../../../components/badge-link'
import { DatasetRun } from '../_hooks'
import { useDatasetRunLink } from '../../datasets/_hooks'
import { MainRunBadge } from '../../_components/main-run-badge'

export const DatasetRunButtons = ({
  datasetRuns,
}: {
  datasetRuns: DatasetRun[]
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
  datasetRun: DatasetRun
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
