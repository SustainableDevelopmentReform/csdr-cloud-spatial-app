'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { ConsoleSimpleBreadcrumbs } from '../../_components/console-simple-breadcrumbs'
import {
  DATASETS_BASE_PATH,
  DATA_LIBRARY_BASE_PATH,
  DATA_LIBRARY_SOURCE_PARAM,
  isDataLibrarySource,
  withDataLibrarySource,
} from '../../../../lib/paths'
import { useDataset, useDatasetRun, useDatasetRunsLink } from '../_hooks'

type BreadcrumbItem = {
  href?: string
  label: string
}

export const DatasetBreadcrumbs = () => {
  const { data: datasetFromUrl } = useDataset()
  const { data: datasetRunFromUrl } = useDatasetRun()
  const datasetRunsLink = useDatasetRunsLink()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const fromLibrary = isDataLibrarySource(
    searchParams.get(DATA_LIBRARY_SOURCE_PARAM),
  )

  const dataset = datasetFromUrl ?? datasetRunFromUrl?.dataset
  const sectionHref = fromLibrary
    ? `${DATA_LIBRARY_BASE_PATH}?resourceType=dataset`
    : DATASETS_BASE_PATH

  const items: BreadcrumbItem[] = [
    fromLibrary
      ? { label: 'Data', href: DATA_LIBRARY_BASE_PATH }
      : { label: 'Admin' },
    { label: 'Datasets', href: sectionHref },
  ]

  if (dataset) {
    items.push({
      label: dataset.name,
      href: fromLibrary
        ? withDataLibrarySource(`${DATASETS_BASE_PATH}/${dataset.id}`)
        : `${DATASETS_BASE_PATH}/${dataset.id}`,
    })
  }

  if (dataset && (pathname?.includes('runs') || datasetRunFromUrl)) {
    items.push({
      label: 'Dataset Runs',
      href: datasetRunsLink(dataset),
    })
  }

  if (datasetRunFromUrl) {
    items.push({ label: datasetRunFromUrl.name })
  }

  return <ConsoleSimpleBreadcrumbs items={items} />
}
