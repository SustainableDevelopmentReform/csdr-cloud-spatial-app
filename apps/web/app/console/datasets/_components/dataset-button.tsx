import { ArrowUpRightIcon } from 'lucide-react'
import { BadgeLink } from '../../../../components/badge-link'
import { useDatasetLink } from '../_hooks'

export const DatasetButtons = ({
  datasets,
}: {
  datasets: { id: string; name: string }[] | undefined
}) => {
  return (
    <div className="flex flex-wrap gap-2">
      {datasets?.map((dataset) => (
        <DatasetButton dataset={dataset} key={dataset.id} />
      ))}
    </div>
  )
}

export const DatasetButton = ({
  dataset,
}: {
  dataset: { id: string; name: string }
}) => {
  const datasetLink = useDatasetLink()

  return (
    <BadgeLink href={datasetLink(dataset)} variant="dataset">
      {dataset.name}
      <ArrowUpRightIcon className="size-4" />
    </BadgeLink>
  )
}
