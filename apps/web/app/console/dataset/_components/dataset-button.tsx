import { BadgeLink } from '../../../../components/badge-link'
import { GlobalVisibilityIndicator } from '~/app/console/_components/global-visibility-indicator'
import { DatasetLinkParams, useDatasetLink } from '../_hooks'

export const DatasetButtons = ({
  datasets,
}: {
  datasets: DatasetLinkParams[] | undefined
}) => {
  return (
    <div className="flex flex-wrap gap-2">
      {datasets?.map((dataset) => (
        <DatasetButton dataset={dataset} key={dataset.id} />
      ))}
    </div>
  )
}

export const DatasetButton = ({ dataset }: { dataset: DatasetLinkParams }) => {
  const datasetLink = useDatasetLink()

  return (
    <BadgeLink
      href={datasetLink(dataset)}
      variant="dataset"
      adornment={<GlobalVisibilityIndicator visibility={dataset.visibility} />}
    >
      {dataset.name}
    </BadgeLink>
  )
}
