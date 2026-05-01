'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  type DashboardContent,
  updateDashboardSchema,
  visibilitySchema,
} from '@repo/schemas/crud'
import { Button } from '@repo/ui/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@repo/ui/components/ui/form'
import { Input } from '@repo/ui/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@repo/ui/components/ui/select'
import { Separator } from '@repo/ui/components/ui/separator'
import { toast } from '@repo/ui/components/ui/sonner'
import { Tabs, TabsList, TabsTrigger } from '@repo/ui/components/ui/tabs'
import { Textarea } from '@repo/ui/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@repo/ui/components/ui/tooltip'
import {
  Copy,
  Loader2,
  Pencil,
  Save,
  Share2,
  Trash2,
  Undo2,
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { ReportSources } from '~/app/console/report/_components/report-sources'
import { DeleteAlertDialog } from '~/components/form/delete-alert-dialog'
import { useUnsavedChangesWarning } from '~/hooks/useUnsavedChangesWarning'
import { DASHBOARDS_BASE_PATH } from '~/lib/paths'
import {
  canChangeConsoleResourceVisibility,
  canCreateConsoleResource,
  canEditConsoleResource,
  formatVisibility,
  getConsoleResourceVisibilityOptions,
  getCreatedByUserId,
  type ResourceVisibility,
} from '~/utils/access-control'
import { toastError } from '~/utils/error-handling'
import { ResourcePageState } from '../../_components/resource-page-state'
import DashboardGridEditor, {
  createEmptyDashboardContent,
} from '../_components/dashboard-grid-editor'
import {
  type DashboardDetail,
  type UpdateDashboardPayload,
  useDashboard,
  useDeleteDashboard,
  useDuplicateDashboard,
  usePreviewDashboardVisibility,
  useUpdateDashboard,
  useUpdateDashboardVisibility,
} from '../_hooks'
import {
  useAccessControl,
  useRequiresActiveOrganizationSwitchForWrite,
} from '../../../../hooks/useAccessControl'
import { DashboardBreadcrumbs } from '../_components/breadcrumbs'

type DashboardTab = 'overview' | 'sources'

type DashboardVisibilityDialogState = VisibilityImpactDialogState & {
  nextVisibility: ResourceVisibility
}

const formId = 'dashboard-detail-form'

const getDashboardPath = (dashboardId: string) =>
  `${DASHBOARDS_BASE_PATH}/${dashboardId}`

const getDashboardFormValues = (
  dashboard: DashboardDetail,
  fallbackContent: DashboardContent,
): UpdateDashboardPayload => ({
  name: dashboard.name,
  description: dashboard.description,
  content: dashboard.content ?? fallbackContent,
})

const toDashboardTab = (value: string): DashboardTab =>
  value === 'sources' ? 'sources' : 'overview'

const getVisibilityChangeSummary = (visibility: ResourceVisibility): string => {
  switch (visibility) {
    case 'private':
      return 'This will keep the dashboard inside its organization and may break externally visible dependents.'
    case 'public':
      return 'This will make the dashboard readable to anyone with the link.'
    case 'global':
      return 'This will make the dashboard readable to anyone and list it across organizations and in the public explorer.'
    default:
      return visibility
  }
}

const DashboardTabs = ({
  onValueChange,
  value,
}: {
  onValueChange: (value: DashboardTab) => void
  value: DashboardTab
}) => (
  <Tabs
    value={value}
    onValueChange={(next) => onValueChange(toDashboardTab(next))}
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

const DashboardDetails = () => {
  const dashboardQuery = useDashboard()
  const dashboard = dashboardQuery.data
  const updateDashboard = useUpdateDashboard()
  const updateDashboardVisibility = useUpdateDashboardVisibility()
  const previewDashboardVisibility = usePreviewDashboardVisibility()
  const duplicateDashboard = useDuplicateDashboard()
  const deleteDashboard = useDeleteDashboard(undefined, DASHBOARDS_BASE_PATH)
  const { access } = useAccessControl()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview')
  const [shareCopied, setShareCopied] = useState(false)
  const [visibilityDialog, setVisibilityDialog] =
    useState<DashboardVisibilityDialogState | null>(null)
  const [updateErrorDialog, setUpdateErrorDialog] =
    useState<VisibilityImpactDialogState | null>(null)

  const emptyContent = useMemo(() => createEmptyDashboardContent(), [])
  const form = useForm<UpdateDashboardPayload>({
    resolver: zodResolver(updateDashboardSchema),
    defaultValues: {
      name: '',
      description: null,
      content: emptyContent,
    },
  })
  const isDirty = form.formState.isDirty

  useUnsavedChangesWarning(isDirty)

  useEffect(() => {
    if (!dashboard || isDirty) {
      return
    }

    form.reset(getDashboardFormValues(dashboard, emptyContent))
  }, [dashboard, emptyContent, form, isDirty])

  useEffect(() => {
    if (!shareCopied) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setShareCopied(false)
    }, 2000)

    return () => window.clearTimeout(timeoutId)
  }, [shareCopied])

  const requiresOrganizationSwitch =
    useRequiresActiveOrganizationSwitchForWrite({
      access,
      createdByUserId: getCreatedByUserId(dashboard),
      resource: 'dashboard',
      resourceData: dashboard,
    })
  const canEdit =
    !!dashboard &&
    canEditConsoleResource({
      access,
      resource: 'dashboard',
      createdByUserId: getCreatedByUserId(dashboard),
      resourceData: dashboard,
    }) &&
    !requiresOrganizationSwitch
  const canDuplicate = canCreateConsoleResource(access, 'dashboard')
  const canDelete = canEdit
  const isEditMode = searchParams.get('mode') === 'edit' && canEdit
  const watchedContent = useWatch({ control: form.control, name: 'content' })
  const content = watchedContent ?? emptyContent

  const visibilityOptions = dashboard
    ? getConsoleResourceVisibilityOptions({
        access,
        currentVisibility: dashboard.visibility,
        resourceData: dashboard,
      })
    : []
  const canChangeVisibility = dashboard
    ? canChangeConsoleResourceVisibility({
        access,
        currentVisibility: dashboard.visibility,
        resourceData: dashboard,
      })
    : false

  const copyShareLink = useCallback(async () => {
    if (!dashboard) {
      return
    }

    const canonicalUrl = `${window.location.origin}${getDashboardPath(
      dashboard.id,
    )}`

    try {
      await navigator.clipboard.writeText(canonicalUrl)
      setShareCopied(true)
      toast.success('Dashboard link copied')
    } catch (error) {
      toastError(error, 'Failed to copy dashboard link')
    }
  }, [dashboard])

  const createCopy = useCallback(() => {
    void duplicateDashboard
      .mutateAsync()
      .then((duplicatedDashboard) => {
        if (duplicatedDashboard?.id) {
          router.push(`${getDashboardPath(duplicatedDashboard.id)}?mode=edit`)
        }
      })
      .catch((error) => {
        toastError(error, 'Failed to create dashboard copy')
      })
  }, [duplicateDashboard, router])

  const discardEdits = useCallback(() => {
    if (!dashboard) {
      return
    }

    form.reset(getDashboardFormValues(dashboard, emptyContent))
    router.replace(getDashboardPath(dashboard.id))
  }, [dashboard, emptyContent, form, router])

  const openEditMode = useCallback(() => {
    if (!dashboard) {
      return
    }

    router.push(`${getDashboardPath(dashboard.id)}?mode=edit`)
  }, [dashboard, router])

  const previewVisibilityChange = useCallback(
    async (nextVisibility: ResourceVisibility) => {
      if (!dashboard || nextVisibility === dashboard.visibility) {
        return
      }

      const preview = await previewDashboardVisibility
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
    [dashboard, previewDashboardVisibility],
  )

  const confirmVisibilityChange = useCallback(() => {
    if (!visibilityDialog || !dashboard) {
      return
    }

    updateDashboardVisibility.mutate(
      { visibility: visibilityDialog.nextVisibility },
      {
        onError: (error) => {
          toastError(error, 'Failed to update dashboard visibility')
        },
        onSuccess: () => {
          setVisibilityDialog(null)
          toast.success('Dashboard visibility updated')
        },
      },
    )
  }, [dashboard, updateDashboardVisibility, visibilityDialog])

  const submitDashboard = useCallback(
    (formData: UpdateDashboardPayload) => {
      if (!canEdit) {
        return
      }

      updateDashboard.mutate(formData, {
        onError: (error) => {
          handleVisibilityImpactError({
            error,
            fallbackMessage: 'Failed to update dashboard',
            setDialogState: setUpdateErrorDialog,
          })
        },
        onSuccess: () => {
          form.reset(formData)
          toast.success('Dashboard saved')
        },
      })
    },
    [canEdit, form, updateDashboard],
  )

  const dashboardActions = dashboard ? (
    <>
      {!isEditMode && canEdit ? (
        <Button onClick={openEditMode} type="button" variant="outline">
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
      ) : null}
      {canDuplicate ? (
        <Button
          disabled={duplicateDashboard.isPending}
          onClick={createCopy}
          type="button"
          variant="outline"
        >
          {duplicateDashboard.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          Create Copy
        </Button>
      ) : null}
      {isEditMode && canDuplicate ? (
        <Separator className="h-5" orientation="vertical" />
      ) : null}
      {isEditMode ? (
        <>
          <Button onClick={discardEdits} type="button" variant="ghost">
            <Undo2 className="h-4 w-4" />
            Discard Edits
          </Button>
          <Button
            disabled={updateDashboard.isPending}
            form={formId}
            type="submit"
          >
            {updateDashboard.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save
          </Button>
        </>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button onClick={copyShareLink} type="button">
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {shareCopied ? 'Copied' : 'Copy dashboard link'}
          </TooltipContent>
        </Tooltip>
      )}
    </>
  ) : null

  return (
    <div className="flex flex-col bg-neutral-100 text-foreground">
      <ConsolePageHeader
        actions={dashboardActions}
        breadcrumbs={<DashboardBreadcrumbs />}
        className="border-b border-border"
      />
      <ResourcePageState
        error={dashboardQuery.error}
        errorMessage="Failed to load dashboard"
        isLoading={dashboardQuery.isLoading}
        loadingMessage="Loading dashboard"
        notFoundMessage="Dashboard not found"
      >
        {dashboard ? (
          <Form {...form}>
            <div className="flex flex-col">
              <div className="flex flex-col p-4">
                <form
                  className="flex flex-col gap-4 rounded-2xl px-4 pb-8 pt-6 sm:px-8"
                  id={formId}
                  onSubmit={form.handleSubmit(submitDashboard)}
                >
                  {requiresOrganizationSwitch ? (
                    <ActiveOrganizationWriteWarning
                      visibility={dashboard.visibility}
                    />
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
                                  placeholder="Dashboard name"
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
                              previewDashboardVisibility.isPending ||
                              updateDashboardVisibility.isPending
                            }
                            value={dashboard.visibility}
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
                                visibility={dashboard.visibility}
                              />
                              <span className="text-sm font-medium leading-5">
                                Visibility:{' '}
                                {formatVisibility(dashboard.visibility)}
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
                              visibility={dashboard.visibility}
                            />
                            Visibility: {formatVisibility(dashboard.visibility)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex max-w-[720px] flex-1 flex-col gap-1">
                        <h1 className="text-xl font-semibold leading-7 text-card-foreground">
                          {dashboard.name ?? 'Untitled dashboard'}
                        </h1>
                        <p className="text-sm leading-5 text-muted-foreground">
                          {dashboard.description ?? 'No description'}
                        </p>
                        <div className="flex items-center gap-1 text-sm font-medium leading-5 text-muted-foreground">
                          <ResourceVisibilityIcon
                            className="h-3 w-3"
                            visibility={dashboard.visibility}
                          />
                          {formatVisibility(dashboard.visibility)}
                        </div>
                      </div>
                    )}
                  </div>

                  {activeTab === 'overview' ? (
                    <DashboardGridEditor
                      className="w-full"
                      disabled={!isEditMode}
                      emptyMessage="No charts"
                      header={(addChartAction) => (
                        <div className="flex w-full items-center justify-between gap-4">
                          <DashboardTabs
                            value={activeTab}
                            onValueChange={setActiveTab}
                          />
                          {isEditMode ? addChartAction : null}
                        </div>
                      )}
                      value={content}
                      onChange={(next) => {
                        form.setValue('content', next, {
                          shouldDirty: true,
                          shouldTouch: true,
                        })
                      }}
                    />
                  ) : (
                    <div className="flex flex-col gap-4">
                      <DashboardTabs
                        value={activeTab}
                        onValueChange={setActiveTab}
                      />
                      <ReportSources
                        description="Live references derived from the dashboard chart usage."
                        emptyMessage="No sources referenced in this dashboard."
                        sources={dashboard.sources}
                      />
                    </div>
                  )}
                </form>

                {canDelete ? (
                  <div className="mt-4 flex shrink-0 justify-end border-t border-border px-4 pt-6 sm:px-8">
                    <DeleteAlertDialog
                      buttonIcon={<Trash2 className="h-4 w-4" />}
                      buttonTitle="Delete Dashboard"
                      buttonVariant="destructive"
                      confirmDialog={{
                        title: 'Delete dashboard?',
                        description: `This action cannot be undone. This will permanently delete ${dashboard.name ?? 'this dashboard'}.`,
                        buttonCancelTitle: 'Cancel',
                        buttonConfirmTitle: 'Delete Dashboard',
                      }}
                      mutation={deleteDashboard}
                    />
                  </div>
                ) : null}
              </div>

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
                confirmLoading={updateDashboardVisibility.isPending}
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

export default DashboardDetails
