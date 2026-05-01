'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { createDashboardSchema } from '@repo/schemas/crud'
import { useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import CrudFormDialog from '../../../components/form/crud-form-dialog'
import { useAccessControl } from '../../../hooks/useAccessControl'
import { useIsHydrated } from '../../../hooks/useIsHydrated'
import { useUnsavedChangesWarning } from '../../../hooks/useUnsavedChangesWarning'
import DashboardGridEditor, {
  createEmptyDashboardContent,
} from '../dashboard/_components/dashboard-grid-editor'
import { ConsolePageHeader } from '../_components/console-page-header'
import {
  type CreateDashboardPayload,
  useCreateDashboard,
} from '../dashboard/_hooks'
import { canCreateConsoleResource } from '../../../utils/access-control'
import { AnalysisBreadcrumbs } from './_components/breadcrumbs'

const DataExplorerFeature = () => {
  const createDashboard = useCreateDashboard()
  const { access } = useAccessControl()
  const isHydrated = useIsHydrated()
  const canSaveDashboard = canCreateConsoleResource(access, 'dashboard')
  const emptyContent = useMemo(() => createEmptyDashboardContent(), [])
  const form = useForm<CreateDashboardPayload>({
    resolver: zodResolver(createDashboardSchema),
    defaultValues: {
      content: emptyContent,
    },
  })
  const content = useWatch({ control: form.control, name: 'content' })
  const saveDashboardAction =
    isHydrated && canSaveDashboard ? (
      <CrudFormDialog
        form={form}
        mutation={createDashboard}
        buttonText="Save as Dashboard"
        entityName="Dashboard"
        entityNamePlural="dashboards"
        hiddenFields={['content', 'metadata']}
      />
    ) : null

  useUnsavedChangesWarning(form.formState.isDirty)

  return (
    <div className="flex flex-col bg-neutral-100 text-foreground">
      <ConsolePageHeader
        actions={saveDashboardAction}
        breadcrumbs={<AnalysisBreadcrumbs />}
        className="border-b border-border"
      />
      <div className="flex flex-col p-4">
        <div className="flex flex-col gap-4 rounded-2xl px-4 pb-8 pt-6 sm:px-8">
          <DashboardGridEditor
            className="w-full"
            emptyMessage="No charts"
            header={(addChartAction) => (
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex max-w-[720px] flex-col gap-1">
                  <h1 className="text-xl font-semibold leading-7 text-card-foreground">
                    Analysis
                  </h1>
                  <p className="text-sm leading-5 text-muted-foreground">
                    Build exploratory charts, then save the layout as a
                    dashboard when it is ready to share.
                  </p>
                </div>
                {addChartAction ? (
                  <div className="shrink-0">{addChartAction}</div>
                ) : null}
              </div>
            )}
            value={content ?? emptyContent}
            onChange={(next) =>
              form.setValue('content', next, {
                shouldDirty: true,
                shouldTouch: true,
              })
            }
          />
        </div>
      </div>
    </div>
  )
}

export default DataExplorerFeature
