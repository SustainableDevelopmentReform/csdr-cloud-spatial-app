'use client'

import { ConsoleSimpleBreadcrumbs } from '../../_components/console-simple-breadcrumbs'
import { REPORTS_BASE_PATH } from '../../../../lib/paths'
import { useReport } from '../_hooks'

export const ReportBreadcrumbs = () => {
  const { data: report } = useReport()

  return (
    <ConsoleSimpleBreadcrumbs
      items={[
        { label: 'Reports', href: REPORTS_BASE_PATH },
        ...(report ? [{ label: report.name ?? report.id }] : []),
      ]}
    />
  )
}
