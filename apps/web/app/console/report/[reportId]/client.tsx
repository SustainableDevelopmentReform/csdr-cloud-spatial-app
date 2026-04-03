'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { SelectedDataPoint } from '@repo/plot/types'
import { updateReportSchema } from '@repo/schemas/crud'
import { SimpleEditor } from '@repo/ui/components/tip-tap/templates/simple/simple-editor'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  createResourceVisibilityAction,
  handleVisibilityImpactError,
  type VisibilityImpactDialogState,
  VisibilityImpactDialog,
} from '~/app/console/_components/resource-visibility-action'
import { ResourcePageState } from '../../_components/resource-page-state'
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
  usePreviewReportVisibility,
  useReport,
  useUpdateReport,
  useUpdateReportVisibility,
} from '../_hooks'

const ReportDetails = () => {
  const reportQuery = useReport()
  const report = reportQuery.data
  const updateReport = useUpdateReport()
  const updateReportVisibility = useUpdateReportVisibility()
  const previewReportVisibility = usePreviewReportVisibility()
  const deleteReport = useDeleteReport(undefined, REPORTS_BASE_PATH)
  const { access } = useAccessControl()

  const [selectedDataPoint, setSelectedDataPoint] =
    useState<SelectedDataPoint<ProductOutputExportListItem> | null>(null)
  const [updateErrorDialog, setUpdateErrorDialog] =
    useState<VisibilityImpactDialogState | null>(null)

  const form = useForm({
    resolver: zodResolver(updateReportSchema),
  })
  const isDirty = form.formState.isDirty

  useEffect(() => {
    if (!report || isDirty) {
      return
    }

    form.reset(report)
  }, [form, isDirty, report])

  const reportContent = form.watch('content') ?? { type: 'doc', content: [] }

  const formBuilder = useMemo(
    () => reportChartFormBuilder(setSelectedDataPoint),
    [setSelectedDataPoint],
  )
  const canEdit = canEditConsoleResource({
    access,
    resource: 'report',
    createdByUserId: getCreatedByUserId(report),
    resourceData: report,
  })

  const formActions = useMemo(() => {
    if (!report) {
      return []
    }

    const visibilityAction = createResourceVisibilityAction({
      access,
      mutation: updateReportVisibility,
      previewMutation: previewReportVisibility,
      resourceData: report,
      successMessage: 'Report visibility updated',
      visibility: report.visibility,
    })

    return visibilityAction ? [visibilityAction] : []
  }, [access, previewReportVisibility, report, updateReportVisibility])

  return (
    <ResourcePageState
      error={reportQuery.error}
      errorMessage="Failed to load report"
      isLoading={reportQuery.isLoading}
      loadingMessage="Loading report"
      notFoundMessage="Report not found"
    >
      <div className="w-[800px] max-w-full gap-8 flex flex-col relative">
        <CrudForm
          form={form}
          mutation={updateReport}
          deleteMutation={deleteReport}
          actions={formActions}
          entityName="Report"
          entityNamePlural="reports"
          onError={(error) => {
            handleVisibilityImpactError({
              error,
              fallbackMessage: 'Failed to update report',
              setDialogState: setUpdateErrorDialog,
            })
          }}
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
              content={reportContent}
              chartFormBuilder={canEdit ? formBuilder : undefined}
              editable={canEdit}
            />
          )}
        </CrudForm>
        <ChartSelectedItem
          selectedDataPoint={selectedDataPoint}
          onSelect={setSelectedDataPoint}
        />
        <VisibilityImpactDialog
          open={updateErrorDialog !== null}
          onOpenChange={(open) => {
            if (!open) {
              setUpdateErrorDialog(null)
            }
          }}
          title={updateErrorDialog?.title ?? 'Update blocked'}
          description={updateErrorDialog?.description ?? ''}
          impact={updateErrorDialog?.impact ?? null}
          closeLabel="Close"
        />
      </div>
    </ResourcePageState>
  )
}

export default ReportDetails
