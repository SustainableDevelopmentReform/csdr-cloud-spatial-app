'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { SelectedDataPoint } from '@repo/plot/types'
import { updateReportSchema } from '@repo/schemas/crud'
import { SimpleEditor } from '@repo/ui/components/tip-tap/templates/simple/simple-editor'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { createResourceVisibilityAction } from '~/app/console/_components/resource-visibility-action'
import { CrudForm } from '../../../../components/form/crud-form'
import { useAccessControl } from '../../../../hooks/useAccessControl'
import { REPORTS_BASE_PATH } from '../../../../lib/paths'
import {
  canEditConsoleResource,
  getCreatedByUserId,
} from '../../../../utils/access-control'
import { ProductOutputExportListItem } from '../../product/_hooks'
import { ChartSelectedItem } from '../_components/chart-selected-item'
import { reportChartFormBuilder } from '../_components/report-chart-editor'
import {
  useDeleteReport,
  useReport,
  useUpdateReport,
  useUpdateReportVisibility,
} from '../_hooks'

const ReportDetails = () => {
  const { data: report } = useReport()
  const updateReport = useUpdateReport()
  const updateReportVisibility = useUpdateReportVisibility()
  const deleteReport = useDeleteReport(undefined, REPORTS_BASE_PATH)
  const { access } = useAccessControl()

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
  const canEdit = canEditConsoleResource({
    access,
    resource: 'report',
    createdByUserId: getCreatedByUserId(report),
  })

  const formActions = useMemo(() => {
    if (!report) {
      return []
    }

    const visibilityAction = createResourceVisibilityAction({
      access,
      mutation: updateReportVisibility,
      successMessage: 'Report visibility updated',
      visibility: report.visibility,
    })

    return visibilityAction ? [visibilityAction] : []
  }, [access, report, updateReportVisibility])

  return (
    <div className="w-[800px] max-w-full gap-8 flex flex-col relative">
      <CrudForm
        form={form}
        mutation={updateReport}
        deleteMutation={deleteReport}
        actions={formActions}
        entityName="Report"
        entityNamePlural="reports"
        readOnly={!canEdit}
        successMessage="Updated Report"
      >
        {report && (
          <SimpleEditor
            onUpdate={(json) => {
              form.setValue('content', json, {
                shouldDirty: true,
                shouldTouch: true,
              })
            }}
            content={report.content ?? { type: 'doc', content: [] }}
            chartFormBuilder={canEdit ? formBuilder : undefined}
            editable={canEdit}
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
