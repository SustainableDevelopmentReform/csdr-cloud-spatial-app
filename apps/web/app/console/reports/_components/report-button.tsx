import { ArrowUpRightIcon } from 'lucide-react'
import { BadgeLink } from '../../../../components/badge-link'
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

  return (
    <BadgeLink href={reportLink(report)} variant="outline">
      {report.name}
      <ArrowUpRightIcon className="size-4" />
    </BadgeLink>
  )
}
