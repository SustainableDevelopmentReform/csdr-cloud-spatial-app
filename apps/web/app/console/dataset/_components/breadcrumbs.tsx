'use client'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@repo/ui/components/ui/breadcrumb'
import { usePathname } from 'next/navigation'
import Link from '../../../../components/link'
import { DATASETS_BASE_PATH } from '../../../../lib/paths'
import { useDataset, useDatasetRun, useDatasetRunsLink } from '../_hooks'
import { DatasetButton } from './dataset-button'
import { DatasetRunButton } from './dataset-run-button'

export const DatasetBreadcrumbs = () => {
  const { data: datasetFromUrl } = useDataset()
  const { data: datasetRunFromUrl } = useDatasetRun()
  const datasetRunsLink = useDatasetRunsLink()

  const dataset = datasetFromUrl ?? datasetRunFromUrl?.dataset

  const pathname = usePathname()
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/">Home</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href={DATASETS_BASE_PATH}>Datasets</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {dataset && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <DatasetButton dataset={dataset} />
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}

        {dataset && (pathname?.includes('runs') || datasetRunFromUrl) && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={datasetRunsLink(dataset)}>Runs</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}

        {datasetRunFromUrl && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <div className="flex items-center gap-1">
                  <DatasetRunButton datasetRun={datasetRunFromUrl} />
                </div>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
