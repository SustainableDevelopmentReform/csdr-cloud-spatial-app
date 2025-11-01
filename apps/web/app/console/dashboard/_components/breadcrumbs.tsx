'use client'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@repo/ui/components/ui/breadcrumb'
import Link from '../../../../components/link'
import { DASHBOARDS_BASE_PATH } from '../../../../lib/paths'
import { useDashboard, useDashboardLink } from '../_hooks'

export const DashboardBreadcrumbs = () => {
  const { data: dashboard } = useDashboard()
  const dashboardLink = useDashboardLink()

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
            <Link href={DASHBOARDS_BASE_PATH}>Dashboards</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {dashboard && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={dashboardLink(dashboard)}>
                  {dashboard.name ?? dashboard.id}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
