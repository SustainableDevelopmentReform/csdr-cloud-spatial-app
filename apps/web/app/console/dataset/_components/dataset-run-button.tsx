import { BadgeLink } from '../../../../components/badge-link'
import { MainRunBadge } from '../../_components/main-run-badge'
import { DatasetRunLinkParams, useDatasetRunLink } from '../_hooks'
import { SquareFunctionIcon } from 'lucide-react'

export const DatasetRunButton = ({
  datasetRun,
}: {
  datasetRun: DatasetRunLinkParams
}) => {
  const datasetRunLink = useDatasetRunLink()

  return (
    <BadgeLink href={datasetRunLink(datasetRun)} icon={<SquareFunctionIcon />}>
      {datasetRun.dataset.mainRunId === datasetRun.id && (
        <MainRunBadge size="xs" />
      )}
      {datasetRun.name}
    </BadgeLink>
  )
}
