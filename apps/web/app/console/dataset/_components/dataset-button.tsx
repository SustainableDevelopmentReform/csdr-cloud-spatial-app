import { BadgeLink } from '../../../../components/badge-link'
import { withDataLibrarySource } from '~/lib/paths'
import { GlobalVisibilityIndicator } from '~/app/console/_components/global-visibility-indicator'
import { DatasetLinkParams, useDatasetLink } from '../_hooks'
import { EarthIcon } from 'lucide-react'

export const DatasetButton = ({
  dataset,
  fromLibrary = false,
}: {
  dataset: DatasetLinkParams
  fromLibrary?: boolean
}) => {
  const datasetLink = useDatasetLink()
  const href = datasetLink(dataset)

  return (
    <BadgeLink
      href={fromLibrary ? withDataLibrarySource(href) : href}
      icon={<EarthIcon />}
      adornment={<GlobalVisibilityIndicator visibility={dataset.visibility} />}
    >
      {dataset.name}
    </BadgeLink>
  )
}
