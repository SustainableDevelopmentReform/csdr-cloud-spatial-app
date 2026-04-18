'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { createReportSchema } from '@repo/schemas/crud'
import { useForm } from 'react-hook-form'
import CrudFormDialog from '~/components/form/crud-form-dialog'
import { useAccessControl } from '~/hooks/useAccessControl'
import { useIsHydrated } from '~/hooks/useIsHydrated'
import { canCreateConsoleResource } from '~/utils/access-control'
import { useCreateReport } from '../_hooks'

export const ReportCreateAction = () => {
  const createReport = useCreateReport()
  const { access } = useAccessControl()
  const isHydrated = useIsHydrated()
  const form = useForm({
    resolver: zodResolver(createReportSchema),
  })

  return (
    <CrudFormDialog
      form={form}
      mutation={createReport}
      buttonText="Add Report"
      entityName="Report"
      entityNamePlural="reports"
      hideTrigger={!isHydrated || !canCreateConsoleResource(access, 'report')}
    />
  )
}
