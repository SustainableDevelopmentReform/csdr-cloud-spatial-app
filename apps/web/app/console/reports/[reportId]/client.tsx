'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { updateReportSchema } from '@repo/schemas/crud'
import { useEffect } from 'react'
import { Path, useForm } from 'react-hook-form'
import { CrudForm } from '../../../../components/crud-form'
import { useDeleteReport, useReport, useUpdateReport } from '../_hooks'

import { SimpleEditor } from '@repo/ui/components/tip-tap/templates/simple/simple-editor'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@repo/ui/components/ui/form'
import { Input } from '@repo/ui/components/ui/input'

const ReportDetails = () => {
  const { data: report } = useReport()
  const updateReport = useUpdateReport()
  const deleteReport = useDeleteReport(undefined, '/console/reports')

  const form = useForm({
    resolver: zodResolver(updateReportSchema),
  })

  useEffect(() => {
    if (report) {
      form.reset(report)
    }
  }, [report, form])

  return (
    <div className="w-[800px] max-w-full gap-8 flex flex-col">
      <CrudForm
        form={form}
        mutation={updateReport}
        deleteMutation={deleteReport}
        entityName="Report"
        entityNamePlural="reports"
        successMessage="Updated Report"
      >
        {report && (
          <SimpleEditor
            onUpdate={(json) => {
              form.setValue('content', json)
            }}
            content={report.content}
          />
        )}
      </CrudForm>
    </div>
  )
}

export default ReportDetails
