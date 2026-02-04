import { BadgeLink } from '../../../../components/badge-link'
import { DashboardLinkParams, useDashboardLink } from '../_hooks'

export const DashboardButtons = ({
  dashboards,
}: {
  dashboards: DashboardLinkParams[] | undefined
}) => {
  return (
    <div className="flex flex-wrap gap-2">
      {dashboards?.map((dashboard) => (
        <DashboardButton dashboard={dashboard} key={dashboard.id} />
      ))}
    </div>
  )
}

export const DashboardButton = ({
  dashboard,
}: {
  dashboard: DashboardLinkParams
}) => {
  const dashboardLink = useDashboardLink()

  return (
    <BadgeLink href={dashboardLink(dashboard)} variant="outline">
      {dashboard.name}
    </BadgeLink>
  )
}
