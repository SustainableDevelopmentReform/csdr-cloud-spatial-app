'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { updateReportSchema } from '@repo/schemas/crud'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { CrudForm } from '../../../../components/form/crud-form'
import { useDeleteReport, useReport, useUpdateReport } from '../_hooks'

import { SimpleEditor } from '@repo/ui/components/tip-tap/templates/simple/simple-editor'
import { reportChartFormBuilder } from '../_components/report-chart-editor'

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
            chartFormBuilder={reportChartFormBuilder}
          />
        )}
      </CrudForm>
    </div>
  )
}

export default ReportDetails
