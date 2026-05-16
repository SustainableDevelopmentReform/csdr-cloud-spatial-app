'use client'

import { useSearchParams } from 'next/navigation'
import { ConsoleSimpleBreadcrumbs } from '../../_components/console-simple-breadcrumbs'
import {
  DATASETS_BASE_PATH,
  DATA_LIBRARY_BASE_PATH,
  DATA_LIBRARY_SOURCE_PARAM,
  isDataLibrarySource,
  withDataLibrarySource,
} from '../../../../lib/paths'
import { useDataset, useDatasetRun } from '../_hooks'

type BreadcrumbItem = {
  href?: string
  label: string
}

export const DatasetBreadcrumbs = () => {
  const { data: datasetFromUrl } = useDataset()
  const { data: datasetRunFromUrl } = useDatasetRun()
  const searchParams = useSearchParams()
  const fromLibrary = isDataLibrarySource(
    searchParams.get(DATA_LIBRARY_SOURCE_PARAM),
  )

  const dataset = datasetFromUrl ?? datasetRunFromUrl?.dataset

  const items: BreadcrumbItem[] = [
    fromLibrary
      ? { label: 'Data', href: DATA_LIBRARY_BASE_PATH }
      : { label: 'Admin' },
  ]

  if (dataset) {
    items.push({
      label: dataset.name,
      href: fromLibrary
        ? withDataLibrarySource(`${DATASETS_BASE_PATH}/${dataset.id}`)
        : `${DATASETS_BASE_PATH}/${dataset.id}`,
    })
  }

  if (datasetRunFromUrl) {
    items.push({ label: datasetRunFromUrl.name })
  }

  return <ConsoleSimpleBreadcrumbs items={items} />
}
