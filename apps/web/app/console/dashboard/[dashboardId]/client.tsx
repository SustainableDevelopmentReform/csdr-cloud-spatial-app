'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import type { DashboardContent } from '@repo/schemas/crud'
import { updateDashboardSchema } from '@repo/schemas/crud'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
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
import { useDashboard, useDeleteDashboard, useUpdateDashboard } from '../_hooks'

const DashboardDetails = () => {
  const { data: dashboard } = useDashboard()
  const updateDashboard = useUpdateDashboard()
  const deleteDashboard = useDeleteDashboard(undefined, DASHBOARDS_BASE_PATH)
  const { access } = useAccessControl()

  const form = useForm({
    resolver: zodResolver(updateDashboardSchema),
  })

  const emptyContent = useMemo(() => createEmptyDashboardContent(), [])

  useEffect(() => {
    if (dashboard) {
      form.reset({
        ...dashboard,
        content: dashboard.content ?? emptyContent,
      })
    }
  }, [dashboard, form, emptyContent])

  const content = (form.watch('content') ?? emptyContent) as DashboardContent
  const canEdit = canEditConsoleResource({
    access,
    resource: 'dashboard',
    createdByUserId: getCreatedByUserId(dashboard),
  })

  return (
    <div className="max-w-full gap-8 flex flex-col">
      <CrudForm
        form={form}
        mutation={updateDashboard}
        deleteMutation={deleteDashboard}
        entityName="Dashboard"
        entityNamePlural="dashboards"
        hiddenFields={['metadata', 'content']}
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
    </div>
  )
}

export default DashboardDetails
