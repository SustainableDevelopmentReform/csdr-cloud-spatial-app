'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import type { DashboardContent } from '@repo/schemas/crud'
import { updateDashboardSchema } from '@repo/schemas/crud'
import { Button } from '@repo/ui/components/ui/button'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
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
import {
  useAccessControl,
  useRequiresActiveOrganizationSwitchForWrite,
} from '../../../../hooks/useAccessControl'
import { DASHBOARDS_BASE_PATH } from '../../../../lib/paths'
import {
  canCreateConsoleResource,
  canEditConsoleResource,
  getCreatedByUserId,
} from '../../../../utils/access-control'
import DashboardGridEditor, {
  createEmptyDashboardContent,
} from '../_components/dashboard-grid-editor'
import {
  useDashboard,
  useDeleteDashboard,
  useDuplicateDashboard,
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
  const duplicateDashboard = useDuplicateDashboard()
  const deleteDashboard = useDeleteDashboard(undefined, DASHBOARDS_BASE_PATH)
  const { access } = useAccessControl()
  const router = useRouter()
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
  const canDuplicate = canCreateConsoleResource(access, 'dashboard')
  const requiresOrganizationSwitch =
    useRequiresActiveOrganizationSwitchForWrite({
      access,
      createdByUserId: getCreatedByUserId(dashboard),
      resource: 'dashboard',
      resourceData: dashboard,
    })

  const formActions = useMemo(() => {
    if (!dashboard) {
      return []
    }

    const actions = []
    const visibilityAction = createResourceVisibilityAction({
      access,
      mutation: updateDashboardVisibility,
      previewMutation: previewDashboardVisibility,
      resourceData: dashboard,
      successMessage: 'Dashboard visibility updated',
      visibility: dashboard.visibility,
    })

    if (visibilityAction) {
      actions.push(visibilityAction)
    }

    if (canDuplicate) {
      actions.push({
        title: 'Duplicate dashboard',
        description:
          'Create a new private editable copy in your active organization.',
        component: (
          <Button
            variant="outline"
            onClick={() => {
              void duplicateDashboard
                .mutateAsync()
                .then((duplicatedDashboard) => {
                  if (duplicatedDashboard?.id) {
                    router.push(
                      `${DASHBOARDS_BASE_PATH}/${duplicatedDashboard.id}`,
                    )
                  }
                })
            }}
            disabled={duplicateDashboard.isPending}
            className="w-fit"
          >
            {duplicateDashboard.isPending ? 'Duplicating...' : 'Duplicate'}
          </Button>
        ),
      })
    }

    return actions
  }, [
    access,
    canDuplicate,
    dashboard,
    duplicateDashboard,
    previewDashboardVisibility,
    router,
    updateDashboardVisibility,
  ])

  return (
    <ResourcePageState
      error={dashboardQuery.error}
      errorMessage="Failed to load dashboard"
      isLoading={dashboardQuery.isLoading}
      loadingMessage="Loading dashboard"
      notFoundMessage="Dashboard not found"
    >
      <div className="flex max-w-full flex-col gap-8">
        {requiresOrganizationSwitch ? (
          <ActiveOrganizationWriteWarning visibility={dashboard?.visibility} />
        ) : null}
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
