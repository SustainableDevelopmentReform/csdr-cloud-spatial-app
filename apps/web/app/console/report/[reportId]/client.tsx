'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { SelectedDataPoint } from '@repo/plot/types'
import { updateReportSchema, visibilitySchema } from '@repo/schemas/crud'
import {
  reportTiptapDocumentSchema,
  type ReportTiptapDocument,
} from '@repo/schemas/report-content'
import { SimpleEditor } from '@repo/ui/components/tip-tap/templates/simple/simple-editor'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@repo/ui/components/ui/alert-dialog'
import { Button } from '@repo/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/components/ui/dropdown-menu'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@repo/ui/components/ui/form'
import { Input } from '@repo/ui/components/ui/input'
import { LoadingIcon } from '@repo/ui/components/ui/loading-icon'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@repo/ui/components/ui/select'
import { toast } from '@repo/ui/components/ui/sonner'
import { Tabs, TabsList, TabsTrigger } from '@repo/ui/components/ui/tabs'
import { Textarea } from '@repo/ui/components/ui/textarea'
import { formatDateTime } from '@repo/ui/lib/date'
import {
  Copy,
  Download,
  FileText,
  Loader2,
  MoreHorizontal,
  Pencil,
  Save,
  Share2,
  Trash2,
  Undo2,
  Upload,
} from 'lucide-react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { ActiveOrganizationWriteWarning } from '~/app/console/_components/active-organization-write-warning'
import { ConsolePageHeader } from '~/app/console/_components/console-page-header'
import {
  handleVisibilityImpactError,
  type VisibilityImpactDialogState,
  VisibilityImpactDialog,
} from '~/app/console/_components/resource-visibility-action'
import { ResourceVisibilityIcon } from '~/app/console/_components/resource-visibility-icon'
import { ResourcePageState } from '../../_components/resource-page-state'
import { DeleteAlertDialog } from '../../../../components/form/delete-alert-dialog'
import { useConfig } from '../../../../components/providers'
import {
  useAccessControl,
  useRequiresActiveOrganizationSwitchForWrite,
} from '../../../../hooks/useAccessControl'
import { useUnsavedChangesWarning } from '../../../../hooks/useUnsavedChangesWarning'
import { REPORTS_BASE_PATH } from '../../../../lib/paths'
import {
  canChangeConsoleResourceVisibility,
  canCreateConsoleResource,
  canEditConsoleResource,
  formatVisibility,
  getConsoleResourceVisibilityOptions,
  getCreatedByUserId,
  type ResourceVisibility,
} from '../../../../utils/access-control'
import { toastError } from '../../../../utils/error-handling'
import { ProductOutputExportListItem } from '../../product/_hooks'
import { ChartSelectedItem } from '../_components/chart-selected-item'
import { ReportBreadcrumbs } from '../_components/breadcrumbs'
import { reportChartFormBuilder } from '../_components/report-chart-editor'
import { ReportSources } from '../_components/report-sources'
import {
  type ReportDetail,
  type UpdateReportPayload,
  useDeleteReport,
  useDuplicateReport,
  usePreviewReportVisibility,
  usePublishReport,
  useReport,
  useUpdateReport,
  useUpdateReportVisibility,
} from '../_hooks'

type ReportTab = 'overview' | 'sources'

type ReportVisibilityDialogState = VisibilityImpactDialogState & {
  nextVisibility: ResourceVisibility
}

const formId = 'report-detail-form'

const emptyReportContent: ReportTiptapDocument = {
  type: 'doc',
  content: [],
}

const getReportPath = (reportId: string) => `${REPORTS_BASE_PATH}/${reportId}`

const getReportFormValues = (report: ReportDetail): UpdateReportPayload => ({
  name: report.name,
  description: report.description,
  content: report.content ?? emptyReportContent,
})

const toReportTab = (value: string): ReportTab =>
  value === 'sources' ? 'sources' : 'overview'

const getVisibilityChangeSummary = (visibility: ResourceVisibility): string => {
  switch (visibility) {
    case 'private':
      return 'This will keep the report inside its organization and may break externally visible dependents.'
    case 'public':
      return 'This will make the report readable to anyone with the link.'
    case 'global':
      return 'This will make the report readable to anyone and list it across organizations and in the public explorer.'
    default:
      return visibility
  }
}

const getReportEditorContent = (
  content: UpdateReportPayload['content'],
): ReportTiptapDocument => {
  const parsedContent = reportTiptapDocumentSchema.safeParse(content)

  if (parsedContent.success) {
    return parsedContent.data
  }

  return emptyReportContent
}

const areReportContentsEqual = (
  first: ReportTiptapDocument,
  second: ReportTiptapDocument,
) => JSON.stringify(first) === JSON.stringify(second)

const isReportEditorInteraction = () => {
  const activeElement = document.activeElement

  return (
    activeElement instanceof HTMLElement &&
    activeElement.closest('.simple-editor-wrapper') !== null
  )
}

const ReportTabs = ({
  onValueChange,
  value,
}: {
  onValueChange: (value: ReportTab) => void
  value: ReportTab
}) => (
  <Tabs
    value={value}
    onValueChange={(next) => onValueChange(toReportTab(next))}
  >
    <TabsList className="h-9 rounded-[10px] bg-stone-300 p-[3px]">
      <TabsTrigger
        className="h-[30px] rounded-lg px-2 py-1 text-sm font-medium leading-5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
        value="overview"
      >
        Overview
      </TabsTrigger>
      <TabsTrigger
        className="h-[30px] rounded-lg px-2 py-1 text-sm font-medium leading-5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
        value="sources"
      >
        Sources &amp; Methods
      </TabsTrigger>
    </TabsList>
  </Tabs>
)

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
  const searchParams = useSearchParams()

  const [activeTab, setActiveTab] = useState<ReportTab>('overview')
  const [shareCopied, setShareCopied] = useState(false)
  const [selectedDataPoint, setSelectedDataPoint] =
    useState<SelectedDataPoint<ProductOutputExportListItem> | null>(null)
  const [visibilityDialog, setVisibilityDialog] =
    useState<ReportVisibilityDialogState | null>(null)
  const [updateErrorDialog, setUpdateErrorDialog] =
    useState<VisibilityImpactDialogState | null>(null)
  const [activePdfAction, setActivePdfAction] = useState<
    'preview' | 'published' | null
  >(null)
  const [hydratedReportVersion, setHydratedReportVersion] = useState<
    string | null
  >(null)

  const form = useForm<UpdateReportPayload>({
    resolver: zodResolver(updateReportSchema),
    defaultValues: {
      name: '',
      description: null,
      content: emptyReportContent,
    },
  })
  const isDirty = form.formState.isDirty
  const reportVersion = report ? `${report.id}:${report.updatedAt}` : null

  useUnsavedChangesWarning(isDirty)

  useEffect(() => {
    if (!report) {
      const timeoutId = window.setTimeout(() => {
        setHydratedReportVersion(null)
      }, 0)

      return () => window.clearTimeout(timeoutId)
    }

    if (isDirty) {
      return
    }

    form.reset(getReportFormValues(report))

    const timeoutId = window.setTimeout(() => {
      setHydratedReportVersion(reportVersion)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [form, isDirty, report, reportVersion])

  useEffect(() => {
    if (!shareCopied) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setShareCopied(false)
    }, 2000)

    return () => window.clearTimeout(timeoutId)
  }, [shareCopied])

  const isPublished =
    report?.publishedAt !== null && report?.publishedAt !== undefined
  const requiresOrganizationSwitch =
    useRequiresActiveOrganizationSwitchForWrite({
      access,
      createdByUserId: getCreatedByUserId(report),
      resource: 'report',
      resourceData: report,
    })
  const canEditDraft =
    !!report &&
    canEditConsoleResource({
      access,
      resource: 'report',
      createdByUserId: getCreatedByUserId(report),
      resourceData: report,
    }) &&
    !isPublished
  const canEdit = canEditDraft && !requiresOrganizationSwitch
  const canDuplicate = canCreateConsoleResource(access, 'report')
  const canDelete = canEdit
  const canPublish = canEdit
  const canPreviewPdf = canEdit
  const isEditMode = searchParams.get('mode') === 'edit' && canEdit
  const isPdfBusy = activePdfAction !== null || publishReport.isPending
  const watchedContent = useWatch({ control: form.control, name: 'content' })
  const reportContent = useMemo(
    () => getReportEditorContent(watchedContent),
    [watchedContent],
  )
  const formBuilder = useMemo(
    () =>
      reportChartFormBuilder(setSelectedDataPoint, {
        readOnly: !isEditMode,
      }),
    [isEditMode, setSelectedDataPoint],
  )
  const isEditorHydrating = Boolean(
    report && !isDirty && hydratedReportVersion !== reportVersion,
  )
  const isAccessLoading =
    session.data === undefined || activeOrganization.isLoading
  const isPageLoading =
    reportQuery.isLoading ||
    (reportQuery.isFetching && report?.id !== reportId) ||
    isAccessLoading ||
    isEditorHydrating
  const activePdfStatus =
    activePdfAction === 'preview'
      ? {
          title: 'Generating PDF preview',
          description:
            'Rendering the current saved report into a temporary PDF preview.',
        }
      : publishReport.isPending
        ? {
            title: 'Publishing report',
            description:
              'Generating the published PDF and locking the report. This can take a little while.',
          }
        : null
  const visibilityOptions =
    report && canEdit
      ? getConsoleResourceVisibilityOptions({
          access,
          currentVisibility: report.visibility,
          resourceData: report,
        })
      : []
  const canChangeVisibility =
    report && canEdit
      ? canChangeConsoleResourceVisibility({
          access,
          currentVisibility: report.visibility,
          resourceData: report,
        })
      : false

  const downloadPdf = useCallback(
    async (options: {
      endpoint: string
      filename: string
      method?: 'GET' | 'POST'
      action: 'preview' | 'published'
      fallbackMessage: string
    }) => {
      setActivePdfAction(options.action)

      try {
        const response = await fetch(`${apiBaseUrl}${options.endpoint}`, {
          credentials: 'include',
          method: options.method ?? 'GET',
        })

        if (!response.ok) {
          let errorPayload: unknown = null

          try {
            errorPayload = await response.json()
          } catch {
            // Ignore non-JSON error responses and fall back to the generic message.
          }

          throw errorPayload ?? new Error(options.fallbackMessage)
        }

        const pdfBlob = await response.blob()
        const objectUrl = window.URL.createObjectURL(pdfBlob)
        const anchor = document.createElement('a')
        anchor.href = objectUrl
        anchor.download = options.filename
        document.body.append(anchor)
        anchor.click()
        anchor.remove()
        window.URL.revokeObjectURL(objectUrl)
      } catch (error) {
        toastError(error, options.fallbackMessage)
      } finally {
        setActivePdfAction((currentAction) =>
          currentAction === options.action ? null : currentAction,
        )
      }
    },
    [apiBaseUrl],
  )

  const previewReportPdf = useCallback(async () => {
    if (!report || isDirty || isPdfBusy) {
      return
    }

    await downloadPdf({
      endpoint: `/api/v0/report/${report.id}/preview-pdf`,
      filename: `${report.name}-preview.pdf`,
      method: 'POST',
      action: 'preview',
      fallbackMessage: 'Failed to preview report PDF',
    })
  }, [downloadPdf, isDirty, isPdfBusy, report])

  const downloadPublishedPdf = useCallback(async () => {
    if (!report || isPdfBusy) {
      return
    }

    await downloadPdf({
      endpoint: `/api/v0/report/${report.id}/pdf`,
      filename: `${report.name}.pdf`,
      action: 'published',
      fallbackMessage: 'Failed to download report PDF',
    })
  }, [downloadPdf, isPdfBusy, report])

  const publishCurrentReport = useCallback(() => {
    if (!canPublish || isDirty || isPdfBusy) {
      return
    }

    publishReport.mutate(undefined, {
      onError: (error) => {
        toastError(error, 'Failed to publish report')
      },
      onSuccess: () => {
        toast.success('Report published')
      },
    })
  }, [canPublish, isDirty, isPdfBusy, publishReport])

  const copyShareLink = useCallback(async () => {
    if (!report) {
      return
    }

    const canonicalUrl = `${window.location.origin}${getReportPath(report.id)}`

    try {
      await navigator.clipboard.writeText(canonicalUrl)
      setShareCopied(true)
      toast.success('Report link copied')
    } catch (error) {
      toastError(error, 'Failed to copy report link')
    }
  }, [report])

  const createCopy = useCallback(() => {
    void duplicateReport
      .mutateAsync()
      .then((duplicatedReport) => {
        if (duplicatedReport?.id) {
          router.push(`${getReportPath(duplicatedReport.id)}?mode=edit`)
        }
      })
      .catch((error) => {
        toastError(error, 'Failed to create report copy')
      })
  }, [duplicateReport, router])

  const discardEdits = useCallback(() => {
    if (!report) {
      return
    }

    if (
      isDirty &&
      !window.confirm(
        'You have unsaved changes. Are you sure you want to discard your edits?',
      )
    ) {
      return
    }

    form.reset(getReportFormValues(report))
    router.replace(getReportPath(report.id))
  }, [form, isDirty, report, router])

  const openEditMode = useCallback(() => {
    if (!report) {
      return
    }

    router.push(`${getReportPath(report.id)}?mode=edit`)
  }, [report, router])

  const previewVisibilityChange = useCallback(
    async (nextVisibility: ResourceVisibility) => {
      if (!report || nextVisibility === report.visibility) {
        return
      }

      const preview = await previewReportVisibility
        .mutateAsync({ visibility: nextVisibility })
        .catch((error) => {
          toastError(error, 'Failed to preview visibility change')
          return null
        })

      if (!preview) {
        return
      }

      setVisibilityDialog({
        title: `Change visibility to ${formatVisibility(nextVisibility)}`,
        description: getVisibilityChangeSummary(nextVisibility),
        impact: preview,
        nextVisibility,
      })
    },
    [previewReportVisibility, report],
  )

  const confirmVisibilityChange = useCallback(() => {
    if (!visibilityDialog || !report) {
      return
    }

    updateReportVisibility.mutate(
      { visibility: visibilityDialog.nextVisibility },
      {
        onError: (error) => {
          toastError(error, 'Failed to update report visibility')
        },
        onSuccess: () => {
          setVisibilityDialog(null)
          toast.success('Report visibility updated')
        },
      },
    )
  }, [report, updateReportVisibility, visibilityDialog])

  const submitReport = useCallback(
    (formData: UpdateReportPayload) => {
      if (!canEdit) {
        return
      }

      updateReport.mutate(formData, {
        onError: (error) => {
          handleVisibilityImpactError({
            error,
            fallbackMessage: 'Failed to update report',
            setDialogState: setUpdateErrorDialog,
          })
        },
        onSuccess: () => {
          form.reset(formData)
          toast.success('Report saved')
        },
      })
    },
    [canEdit, form, updateReport],
  )

  const reportSurfaceClassName = 'w-[864px] max-w-full'
  const reportEditorClassName = isEditMode
    ? 'min-w-0 overflow-hidden rounded-2xl bg-card [&_.simple-editor-content]:!max-w-none [&_.simple-editor-wrapper]:!overflow-visible [&_.simple-editor-wrapper]:!rounded-2xl [&_.tiptap-toolbar-group]:!flex-wrap [&_.tiptap-toolbar]:!bottom-auto [&_.tiptap-toolbar]:!h-auto [&_.tiptap-toolbar]:!min-h-11 [&_.tiptap-toolbar]:!rounded-t-2xl [&_.tiptap-toolbar]:!flex-wrap [&_.tiptap-toolbar]:!items-start [&_.tiptap-toolbar]:!overflow-visible [&_.tiptap-toolbar]:!px-2 [&_.tiptap-toolbar]:!py-1 [&_.tiptap-toolbar]:!sticky [&_.tiptap-toolbar]:!top-0'
    : 'min-w-0 overflow-hidden rounded-2xl bg-card [&_.simple-editor-content]:!max-w-none [&_.simple-editor-wrapper]:!overflow-hidden [&_.simple-editor-wrapper]:!rounded-2xl'

  const reportActions = report ? (
    <div className="flex w-full max-w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
      {!isEditMode && canEdit ? (
        <Button onClick={openEditMode} type="button" variant="outline">
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
      ) : null}
      {canPublish && !isEditMode ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={isDirty || isPdfBusy} type="button">
              {publishReport.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {publishReport.isPending ? 'Publishing' : 'Publish Report'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Publish this report?</AlertDialogTitle>
              <AlertDialogDescription>
                Publishing is irreversible. This will lock the report and
                generate the published PDF from the saved report content.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={isDirty || isPdfBusy}
                onClick={(event) => {
                  if (isDirty || isPdfBusy) {
                    event.preventDefault()
                    return
                  }

                  publishCurrentReport()
                }}
              >
                Publish report
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
      {isEditMode ? (
        <>
          <Button onClick={discardEdits} type="button" variant="ghost">
            <Undo2 className="h-4 w-4" />
            Discard Edits
          </Button>
          <Button disabled={updateReport.isPending} form={formId} type="submit">
            {updateReport.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save
          </Button>
        </>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label="More report actions"
            size="icon"
            variant="outline"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          {canPreviewPdf ? (
            <DropdownMenuItem
              disabled={isDirty || isPdfBusy}
              onSelect={() => {
                void previewReportPdf()
              }}
            >
              {activePdfAction === 'preview' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              {activePdfAction === 'preview' ? 'Preparing PDF' : 'Preview PDF'}
            </DropdownMenuItem>
          ) : null}
          {report.publishedPdfAvailable ? (
            <DropdownMenuItem
              disabled={isPdfBusy}
              onSelect={() => {
                void downloadPublishedPdf()
              }}
            >
              {activePdfAction === 'published' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {activePdfAction === 'published'
                ? 'Downloading PDF'
                : 'Download PDF'}
            </DropdownMenuItem>
          ) : null}
          {canDuplicate ? (
            <DropdownMenuItem
              disabled={duplicateReport.isPending}
              onSelect={createCopy}
            >
              {duplicateReport.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {duplicateReport.isPending ? 'Creating copy' : 'Create Copy'}
            </DropdownMenuItem>
          ) : null}
          {canPreviewPdf || report.publishedPdfAvailable || canDuplicate ? (
            <DropdownMenuSeparator />
          ) : null}
          <DropdownMenuItem
            onSelect={() => {
              void copyShareLink()
            }}
          >
            <Share2 className="h-4 w-4" />
            {shareCopied ? 'Copied' : 'Share'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  ) : null

  return (
    <div className="flex flex-col bg-neutral-100 text-foreground">
      <ConsolePageHeader
        actions={reportActions}
        breadcrumbs={<ReportBreadcrumbs />}
        className="border-b border-border"
      />
      <ResourcePageState
        error={reportQuery.error}
        errorMessage="Failed to load report"
        isLoading={isPageLoading}
        loadingMessage="Loading report"
        notFoundMessage="Report not found"
      >
        {report ? (
          <Form {...form}>
            <div className="flex flex-col">
              <div className="flex flex-col p-4">
                <form
                  className={`${reportSurfaceClassName} flex flex-col gap-4 rounded-2xl px-4 pb-8 pt-6 sm:px-8`}
                  id={formId}
                  onSubmit={form.handleSubmit(submitReport)}
                >
                  {activePdfStatus ? (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm">
                      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-xl border border-blue-200 bg-blue-50 p-6 text-center text-sm text-blue-950 shadow-lg">
                        <div className="shrink-0 scale-150">
                          <LoadingIcon />
                        </div>
                        <div>
                          <p className="font-semibold">
                            {activePdfStatus.title}
                          </p>
                          <p className="mt-2">{activePdfStatus.description}</p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {requiresOrganizationSwitch && !isPublished ? (
                    <ActiveOrganizationWriteWarning
                      visibility={report.visibility}
                    />
                  ) : null}

                  {isPublished ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                      <p className="font-semibold">Published report</p>
                      <p className="mt-1">
                        Published {formatDateTime(report.publishedAt)}. This
                        report is locked and can no longer be changed.
                      </p>
                      <p className="mt-2">
                        The downloadable PDF is the canonical published report.
                        This live view remains available for browsing,
                        provenance, and link sharing.
                      </p>
                    </div>
                  ) : null}

                  <div className="flex items-start justify-between gap-4">
                    {isEditMode ? (
                      <div className="flex w-full max-w-[462px] flex-col items-start gap-2">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem className="w-full">
                              <FormControl>
                                <Input
                                  {...field}
                                  className="h-9 rounded-lg border-input bg-transparent px-3 py-1 text-xl font-semibold leading-7 shadow-none"
                                  placeholder="Report name"
                                  value={field.value ?? ''}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem className="w-full">
                              <FormControl>
                                <Textarea
                                  {...field}
                                  className="min-h-24 resize-y rounded-lg border-input bg-transparent px-3 py-2 text-sm leading-5 shadow-none"
                                  placeholder="Description"
                                  rows={3}
                                  value={field.value ?? ''}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {visibilityOptions.length > 0 ? (
                          <Select
                            disabled={
                              !canChangeVisibility ||
                              previewReportVisibility.isPending ||
                              updateReportVisibility.isPending
                            }
                            value={report.visibility}
                            onValueChange={(value) => {
                              const parsedVisibility =
                                visibilitySchema.safeParse(value)

                              if (parsedVisibility.success) {
                                void previewVisibilityChange(
                                  parsedVisibility.data,
                                )
                              }
                            }}
                          >
                            <SelectTrigger className="m-0 h-9 min-h-9 w-fit justify-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium leading-5 text-foreground shadow-xs [&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0 [&>svg]:opacity-100">
                              <ResourceVisibilityIcon
                                className="h-4 w-4"
                                visibility={report.visibility}
                              />
                              <span className="text-sm font-medium leading-5">
                                Visibility:{' '}
                                {formatVisibility(report.visibility)}
                              </span>
                            </SelectTrigger>
                            <SelectContent>
                              {visibilityOptions.map((option) => (
                                <SelectItem key={option} value={option}>
                                  <span className="inline-flex items-center gap-2">
                                    <ResourceVisibilityIcon
                                      className="h-4 w-4"
                                      visibility={option}
                                    />
                                    {formatVisibility(option)}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="flex h-9 min-h-9 w-fit items-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium leading-5 text-foreground shadow-xs">
                            <ResourceVisibilityIcon
                              className="h-4 w-4"
                              visibility={report.visibility}
                            />
                            Visibility: {formatVisibility(report.visibility)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex max-w-[720px] flex-1 flex-col gap-1">
                        <h1 className="text-xl font-semibold leading-7 text-card-foreground">
                          {report.name ?? 'Untitled report'}
                        </h1>
                        <p className="text-sm leading-5 text-muted-foreground">
                          {report.description ?? 'No description'}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium leading-5 text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <ResourceVisibilityIcon
                              className="h-3 w-3"
                              visibility={report.visibility}
                            />
                            {formatVisibility(report.visibility)}
                          </span>
                          {isPublished ? (
                            <span>
                              Published {formatDateTime(report.publishedAt)}
                            </span>
                          ) : (
                            <span>Draft</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {activeTab === 'overview' ? (
                    <div className="flex flex-col gap-4">
                      <ReportTabs
                        value={activeTab}
                        onValueChange={setActiveTab}
                      />
                      <div className={reportEditorClassName}>
                        <SimpleEditor
                          key={`${report.id}:${report.updatedAt ?? 'unknown'}:${isEditMode ? 'editable' : 'readonly'}`}
                          onUpdate={(json) => {
                            if (!isEditMode) {
                              return
                            }

                            const nextContent =
                              reportTiptapDocumentSchema.safeParse(json)

                            if (!nextContent.success) {
                              return
                            }

                            const currentContent = getReportEditorContent(
                              form.getValues('content'),
                            )

                            if (
                              areReportContentsEqual(
                                currentContent,
                                nextContent.data,
                              )
                            ) {
                              return
                            }

                            if (
                              !form.formState.isDirty &&
                              !isReportEditorInteraction()
                            ) {
                              return
                            }

                            form.setValue('content', nextContent.data, {
                              shouldDirty: true,
                              shouldTouch: true,
                            })
                          }}
                          content={reportContent}
                          chartFormBuilder={formBuilder}
                          editable={isEditMode}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <ReportTabs
                        value={activeTab}
                        onValueChange={setActiveTab}
                      />
                      <ReportSources sources={report.sources} />
                    </div>
                  )}
                </form>

                {canDelete ? (
                  <div
                    className={`${reportSurfaceClassName} mt-4 flex shrink-0 justify-end border-t border-border px-4 pt-6 sm:px-8`}
                  >
                    <DeleteAlertDialog
                      buttonIcon={<Trash2 className="h-4 w-4" />}
                      buttonTitle="Delete Report"
                      buttonVariant="destructive"
                      confirmDialog={{
                        title: 'Delete report?',
                        description: `This action cannot be undone. This will permanently delete ${report.name ?? 'this report'}.`,
                        buttonCancelTitle: 'Cancel',
                        buttonConfirmTitle: 'Delete Report',
                      }}
                      mutation={deleteReport}
                    />
                  </div>
                ) : null}
              </div>

              <ChartSelectedItem
                selectedDataPoint={selectedDataPoint}
                onSelect={setSelectedDataPoint}
              />
              <VisibilityImpactDialog
                open={visibilityDialog !== null}
                onOpenChange={(open) => {
                  if (!open) {
                    setVisibilityDialog(null)
                  }
                }}
                title={visibilityDialog?.title ?? 'Change visibility'}
                description={visibilityDialog?.description ?? ''}
                impact={visibilityDialog?.impact ?? null}
                closeLabel="Cancel"
                confirmLabel="Confirm"
                confirmDisabled={!visibilityDialog?.impact.canApply}
                confirmLoading={updateReportVisibility.isPending}
                onConfirm={confirmVisibilityChange}
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
          </Form>
        ) : null}
      </ResourcePageState>
    </div>
  )
}

export default ReportDetails
