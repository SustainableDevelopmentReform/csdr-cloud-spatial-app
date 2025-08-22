'use client'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@repo/ui/components/ui/breadcrumb'
import Link from '../../../../components/link'
import {
  useDataset,
  useDatasetLink,
  useDatasetRun,
  useDatasetRunLink,
  useDatasetRunsLink,
} from '../_hooks'
import { usePathname } from 'next/navigation'
import { DatasetButton } from './dataset-button'
import { DatasetRunButton } from './dataset-run-button'

export const DatasetBreadcrumbs = () => {
  const { data: dataset } = useDataset()
  const { data: datasetRun } = useDatasetRun()
  const datasetLink = useDatasetLink()
  const datasetRunsLink = useDatasetRunsLink()
  const datasetRunLink = useDatasetRunLink()
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
            <Link href="/console/datasets">Datasets</Link>
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

        {dataset && pathname?.includes('runs') && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={datasetRunsLink(dataset)}>Runs</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}

        {datasetRun && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <div className="flex items-center gap-1">
                  <DatasetRunButton
                    datasetRun={datasetRun}
                    isMainRun={
                      !!(
                        dataset?.mainRun &&
                        dataset?.mainRun?.id === datasetRun.id
                      )
                    }
                  />
                </div>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
