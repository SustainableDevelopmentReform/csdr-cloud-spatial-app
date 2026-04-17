import { BadgeLink } from '../../../../components/badge-link'
import { GlobalVisibilityIndicator } from '~/app/console/_components/global-visibility-indicator'
import { LockIcon } from 'lucide-react'
import { ReportLinkParams, useReportLink } from '../_hooks'

export const ReportButtons = ({
  reports,
}: {
  reports: ReportLinkParams[] | undefined
}) => {
  return (
    <div className="flex flex-wrap gap-2">
      {reports?.map((report) => (
        <ReportButton report={report} key={report.id} />
      ))}
    </div>
  )
}

export const ReportButton = ({ report }: { report: ReportLinkParams }) => {
  const reportLink = useReportLink()
  const isPublished =
    report.publishedAt !== null && report.publishedAt !== undefined

  return (
    <BadgeLink
      href={reportLink(report)}
      variant="outline"
      adornment={
        <span className="flex items-center gap-1">
          {isPublished ? (
            <LockIcon
              aria-label="Published report"
              className="size-3.5 text-amber-700"
            />
          ) : null}
          <GlobalVisibilityIndicator visibility={report.visibility} />
        </span>
      }
    >
      {report.name}
    </BadgeLink>
  )
}
