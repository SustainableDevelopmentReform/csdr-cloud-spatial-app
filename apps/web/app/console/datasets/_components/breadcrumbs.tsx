'use client'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@repo/ui/components/ui/breadcrumb'
import Link from '../../../../components/link'
import { useDataset, useDatasetLink } from '../_hooks'

export const DatasetBreadcrumbs = () => {
  const { data } = useDataset()
  const datasetLink = useDatasetLink()

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

        {data && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={datasetLink(data)}>{data.name}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
