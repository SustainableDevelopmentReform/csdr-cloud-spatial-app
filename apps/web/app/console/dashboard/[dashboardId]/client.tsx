'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import type { DashboardContent } from '@repo/schemas/crud'
import { updateDashboardSchema } from '@repo/schemas/crud'
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
import { DASHBOARDS_BASE_PATH } from '../../../../lib/paths'
import {
  canEditConsoleResource,
  getCreatedByUserId,
} from '../../../../utils/access-control'
import DashboardGridEditor, {
  createEmptyDashboardContent,
} from '../_components/dashboard-grid-editor'
import {
  useDashboard,
  useDeleteDashboard,
  usePreviewDashboardVisibility,
  useUpdateDashboard,
  useUpdateDashboardVisibility,
} from '../_hooks'

const DashboardDetails = () => {
  const dashboardQuery = useDashboard()
  const dashboard = dashboardQuery.data
  const updateDashboard = useUpdateDashboard()
  const updateDashboardVisibility = useUpdateDashboardVisibility()
  const previewDashboardVisibility = usePreviewDashboardVisibility()
  const deleteDashboard = useDeleteDashboard(undefined, DASHBOARDS_BASE_PATH)
  const { access } = useAccessControl()
  const [updateErrorDialog, setUpdateErrorDialog] =
    useState<VisibilityImpactDialogState | null>(null)

  const form = useForm({
    resolver: zodResolver(updateDashboardSchema),
  })
  const isDirty = form.formState.isDirty

  const emptyContent = useMemo(() => createEmptyDashboardContent(), [])

  useEffect(() => {
    if (!dashboard || isDirty) {
      return
    }

    form.reset({
      ...dashboard,
      content: dashboard.content ?? emptyContent,
    })
  }, [dashboard, emptyContent, form, isDirty])

  const content = (form.watch('content') ?? emptyContent) as DashboardContent
  const canEdit = canEditConsoleResource({
    access,
    resource: 'dashboard',
    createdByUserId: getCreatedByUserId(dashboard),
    resourceData: dashboard,
  })

  const formActions = useMemo(() => {
    if (!dashboard) {
      return []
    }

    const visibilityAction = createResourceVisibilityAction({
      access,
      mutation: updateDashboardVisibility,
      previewMutation: previewDashboardVisibility,
      resourceData: dashboard,
      successMessage: 'Dashboard visibility updated',
      visibility: dashboard.visibility,
    })

    return visibilityAction ? [visibilityAction] : []
  }, [access, dashboard, previewDashboardVisibility, updateDashboardVisibility])

  return (
    <ResourcePageState
      error={dashboardQuery.error}
      errorMessage="Failed to load dashboard"
      isLoading={dashboardQuery.isLoading}
      loadingMessage="Loading dashboard"
      notFoundMessage="Dashboard not found"
    >
      <div className="max-w-full gap-8 flex flex-col">
        <CrudForm
          form={form}
          mutation={updateDashboard}
          deleteMutation={deleteDashboard}
          actions={formActions}
          entityName="Dashboard"
          entityNamePlural="dashboards"
          hiddenFields={['metadata', 'content']}
          onError={(error) => {
            handleVisibilityImpactError({
              error,
              fallbackMessage: 'Failed to update dashboard',
              setDialogState: setUpdateErrorDialog,
            })
          }}
          readOnly={!canEdit}
          successMessage="Updated dashboard"
        >
          <DashboardGridEditor
            disabled={!canEdit}
            value={content}
            onChange={(next) => {
              form.setValue('content', next, {
                shouldDirty: true,
                shouldTouch: true,
              })
            }}
          />
        </CrudForm>
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

export default DashboardDetails
