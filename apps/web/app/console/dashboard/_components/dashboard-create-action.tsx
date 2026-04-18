'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { createDashboardSchema } from '@repo/schemas/crud'
import { useForm } from 'react-hook-form'
import CrudFormDialog from '~/components/form/crud-form-dialog'
import { useAccessControl } from '~/hooks/useAccessControl'
import { useIsHydrated } from '~/hooks/useIsHydrated'
import { canCreateConsoleResource } from '~/utils/access-control'
import { useCreateDashboard } from '../_hooks'
import { createEmptyDashboardContent } from './dashboard-grid-editor'

export const DashboardCreateAction = () => {
  const createDashboard = useCreateDashboard()
  const { access } = useAccessControl()
  const isHydrated = useIsHydrated()
  const form = useForm({
    resolver: zodResolver(createDashboardSchema),
    defaultValues: {
      content: createEmptyDashboardContent(),
    },
  })

  return (
    <CrudFormDialog
      form={form}
      mutation={createDashboard}
      buttonText="Add Dashboard"
      entityName="Dashboard"
      entityNamePlural="dashboards"
      hideTrigger={
        !isHydrated || !canCreateConsoleResource(access, 'dashboard')
      }
      hiddenFields={['content', 'metadata']}
    />
  )
}
