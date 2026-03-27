import { dashboardQuerySchema, reportQuerySchema } from '@repo/schemas/crud'
import { pluralize } from '@repo/ui/lib/utils'
import { ArrowUpRightIcon } from 'lucide-react'
import { z } from 'zod'
import { DetailCard } from './detail-cards'
import { useDashboardsLink } from '../dashboard/_hooks'
import { useReportsLink } from '../report/_hooks'

type ResourceUsageDetailCardsProps = {
  reportCount: number
  dashboardCount: number
  reportQuery: z.infer<typeof reportQuerySchema>
  dashboardQuery: z.infer<typeof dashboardQuerySchema>
}

export const ResourceUsageDetailCards = ({
  reportCount,
  dashboardCount,
  reportQuery,
  dashboardQuery,
}: ResourceUsageDetailCardsProps) => {
  const reportsLink = useReportsLink()
  const dashboardsLink = useDashboardsLink()

  return (
    <div className="grid grid-cols-1 gap-4">
      <DetailCard
        title={`${reportCount} ${pluralize(reportCount, 'report', 'reports')}`}
        description="Used by Reports"
        actionText="Open"
        actionLink={reportsLink(reportQuery)}
        actionIcon={<ArrowUpRightIcon />}
      />
      <DetailCard
        title={`${dashboardCount} ${pluralize(dashboardCount, 'dashboard', 'dashboards')}`}
        description="Used by Dashboards"
        actionText="Open"
        actionLink={dashboardsLink(dashboardQuery)}
        actionIcon={<ArrowUpRightIcon />}
      />
    </div>
  )
}
