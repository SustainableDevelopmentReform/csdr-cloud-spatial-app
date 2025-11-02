'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { SelectedDataPoint } from '@repo/plot/types'
import { updateReportSchema } from '@repo/schemas/crud'
import { SimpleEditor } from '@repo/ui/components/tip-tap/templates/simple/simple-editor'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { CrudForm } from '../../../../components/form/crud-form'
import { ProductOutputExportListItem } from '../../product/_hooks'
import { ChartSelectedItem } from '../_components/chart-selected-item'
import { reportChartFormBuilder } from '../_components/report-chart-editor'
import { useDeleteReport, useReport, useUpdateReport } from '../_hooks'

const ReportDetails = () => {
  const { data: report } = useReport()
  const updateReport = useUpdateReport()
  const deleteReport = useDeleteReport(undefined, '/console/reports')

  const [selectedDataPoint, setSelectedDataPoint] =
    useState<SelectedDataPoint<ProductOutputExportListItem> | null>(null)

  const form = useForm({
    resolver: zodResolver(updateReportSchema),
  })

  useEffect(() => {
    if (report) {
      form.reset(report)
    }
  }, [report, form])

  const formBuilder = useMemo(
    () => reportChartFormBuilder(setSelectedDataPoint),
    [setSelectedDataPoint],
  )

  return (
    <div className="w-[800px] max-w-full gap-8 flex flex-col relative">
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
            chartFormBuilder={formBuilder}
          />
        )}
      </CrudForm>
      <ChartSelectedItem
        selectedDataPoint={selectedDataPoint}
        onSelect={setSelectedDataPoint}
      />
    </div>
  )
}

export default ReportDetails
