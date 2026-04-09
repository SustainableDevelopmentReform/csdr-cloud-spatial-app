'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { SelectedDataPoint } from '@repo/plot/types'
import { updateReportSchema } from '@repo/schemas/crud'
import { SimpleEditor } from '@repo/ui/components/tip-tap/templates/simple/simple-editor'
import { Button } from '@repo/ui/components/ui/button'
import { formatDateTime } from '@repo/ui/lib/date'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { ActiveOrganizationWriteWarning } from '~/app/console/_components/active-organization-write-warning'
import {
  createResourceVisibilityAction,
  handleVisibilityImpactError,
  type VisibilityImpactDialogState,
  VisibilityImpactDialog,
} from '~/app/console/_components/resource-visibility-action'
import { ResourcePageState } from '../../_components/resource-page-state'
import { CrudForm } from '../../../../components/form/crud-form'
import { useConfig } from '../../../../components/providers'
import {
  useAccessControl,
  useRequiresActiveOrganizationSwitchForWrite,
} from '../../../../hooks/useAccessControl'
import { REPORTS_BASE_PATH } from '../../../../lib/paths'
import {
  canCreateConsoleResource,
  canEditConsoleResource,
  getCreatedByUserId,
} from '../../../../utils/access-control'
import { ProductOutputExportListItem } from '../../product/_hooks'
import { ChartSelectedItem } from '../_components/chart-selected-item'
import { reportChartFormBuilder } from '../_components/report-chart-editor'
import { ReportSources } from '../_components/report-sources'
import {
  useDeleteReport,
  useDuplicateReport,
  usePreviewReportVisibility,
  usePublishReport,
  useReport,
  useUpdateReport,
  useUpdateReportVisibility,
} from '../_hooks'

const ReportDetails = () => {
  const { reportId } = useParams<{ reportId: string }>()
  const reportQuery = useReport()
  const report = reportQuery.data
  const updateReport = useUpdateReport()
  const updateReportVisibility = useUpdateReportVisibility()
  const previewReportVisibility = usePreviewReportVisibility()
  const publishReport = usePublishReport()
  const duplicateReport = useDuplicateReport()
  const deleteReport = useDeleteReport(undefined, REPORTS_BASE_PATH)
  const { access, activeOrganization, session } = useAccessControl()
  const { apiBaseUrl } = useConfig()
  const router = useRouter()

  const [selectedDataPoint, setSelectedDataPoint] =
    useState<SelectedDataPoint<ProductOutputExportListItem> | null>(null)
  const [updateErrorDialog, setUpdateErrorDialog] =
    useState<VisibilityImpactDialogState | null>(null)
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)

  const form = useForm({
    resolver: zodResolver(updateReportSchema),
  })
  const isDirty = form.formState.isDirty
  const reportName = form.watch('name')
  const reportDescription = form.watch('description')

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
  const isPublished =
    report?.publishedAt !== null && report?.publishedAt !== undefined
  const canEditDraft =
    canEditConsoleResource({
      access,
      resource: 'report',
      createdByUserId: getCreatedByUserId(report),
      resourceData: report,
    }) && !isPublished
  const requiresOrganizationSwitch =
    useRequiresActiveOrganizationSwitchForWrite({
      access,
      createdByUserId: getCreatedByUserId(report),
      resource: 'report',
      resourceData: report,
    })
  const canDuplicate = canCreateConsoleResource(access, 'report')
  const canPublish = Boolean(
    report &&
      canEditDraft &&
      !requiresOrganizationSwitch &&
      !publishReport.isPending,
  )
  const isEditorHydrating = Boolean(
    report &&
      !isDirty &&
      (reportName !== report.name ||
        (reportDescription ?? null) !== (report.description ?? null) ||
        JSON.stringify(reportContent) !== JSON.stringify(report.content)),
  )
  const isAccessLoading =
    session.data === undefined || activeOrganization.isLoading
  const isPageLoading =
    reportQuery.isLoading ||
    (reportQuery.isFetching && report?.id !== reportId) ||
    isAccessLoading ||
    isEditorHydrating

  const downloadPublishedPdf = useCallback(async () => {
    if (!report) {
      return
    }

    setIsDownloadingPdf(true)

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/v0/report/${report.id}/pdf`,
        {
          credentials: 'include',
        },
      )

      if (!response.ok) {
        throw new Error('Failed to download report PDF')
      }

      const pdfBlob = await response.blob()
      const objectUrl = window.URL.createObjectURL(pdfBlob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = `${report.name}.pdf`
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      window.URL.revokeObjectURL(objectUrl)
    } finally {
      setIsDownloadingPdf(false)
    }
  }, [apiBaseUrl, report])

  const formActions = useMemo(() => {
    if (!report) {
      return []
    }

    const actions = []

    if (!isPublished) {
      const visibilityAction = createResourceVisibilityAction({
        access,
        mutation: updateReportVisibility,
        previewMutation: previewReportVisibility,
        resourceData: report,
        successMessage: 'Report visibility updated',
        visibility: report.visibility,
      })

      if (visibilityAction) {
        actions.push(visibilityAction)
      }

      if (canPublish) {
        actions.push({
          title: 'Publish report',
          description:
            'Generate the published PDF and lock this report permanently. Save any pending changes first.',
          buttonVariant: 'default' as const,
          buttonTitle: 'Publish report',
          mutation: publishReport,
          disabled: isDirty,
          confirmDialog: {
            title: 'Publish this report?',
            description:
              'Publishing is irreversible. This will lock the report and generate the published PDF from the saved report content.',
            buttonCancelTitle: 'Cancel',
            buttonConfirmTitle: 'Publish report',
          },
        })
      }
    }

    if (report.publishedPdfAvailable) {
      actions.push({
        title: 'Published PDF',
        description: 'Download the published PDF for this report.',
        component: (
          <Button
            variant="outline"
            onClick={() => {
              void downloadPublishedPdf()
            }}
            disabled={isDownloadingPdf}
            className="w-fit"
          >
            {isDownloadingPdf ? 'Downloading...' : 'Download PDF'}
          </Button>
        ),
      })
    }

    if (canDuplicate) {
      actions.push({
        title: 'Duplicate report',
        description:
          'Create a new private editable copy in your active organization.',
        component: (
          <Button
            variant="outline"
            onClick={() => {
              void duplicateReport.mutateAsync().then((duplicatedReport) => {
                if (duplicatedReport?.id) {
                  router.push(`${REPORTS_BASE_PATH}/${duplicatedReport.id}`)
                }
              })
            }}
            disabled={duplicateReport.isPending}
            className="w-fit"
          >
            {duplicateReport.isPending ? 'Duplicating...' : 'Duplicate'}
          </Button>
        ),
      })
    }

    return actions
  }, [
    access,
    canDuplicate,
    canPublish,
    downloadPublishedPdf,
    duplicateReport,
    isDirty,
    isDownloadingPdf,
    isPublished,
    previewReportVisibility,
    publishReport,
    report,
    router,
    updateReportVisibility,
  ])

  return (
    <ResourcePageState
      error={reportQuery.error}
      errorMessage="Failed to load report"
      isLoading={isPageLoading}
      loadingMessage="Loading report"
      notFoundMessage="Report not found"
    >
      <div className="relative flex w-[800px] max-w-full flex-col gap-8">
        {requiresOrganizationSwitch && !isPublished ? (
          <ActiveOrganizationWriteWarning visibility={report?.visibility} />
        ) : null}
        {isPublished ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-semibold">Published report</p>
            <p className="mt-1">
              Published {formatDateTime(report?.publishedAt ?? null)}. This
              report is locked and can no longer be changed.
            </p>
          </div>
        ) : null}
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
          readOnly={!canEditDraft}
          successMessage="Updated Report"
        >
          {report ? (
            <SimpleEditor
              key={`${report.id}:${report.updatedAt ?? 'unknown'}:${canEditDraft ? 'editable' : 'readonly'}`}
              onUpdate={(json) => {
                form.setValue('content', json, {
                  shouldDirty: true,
                  shouldTouch: true,
                })
              }}
              content={reportContent}
              chartFormBuilder={formBuilder}
              editable={canEditDraft}
            />
          ) : null}
        </CrudForm>
        {report ? <ReportSources sources={report.sources} /> : null}
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
