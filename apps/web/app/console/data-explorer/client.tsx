'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { createDashboardSchema } from '@repo/schemas/crud'
import { useForm } from 'react-hook-form'
import CrudFormDialog from '../../../components/form/crud-form-dialog'
import { useUnsavedChangesWarning } from '../../../hooks/useUnsavedChangesWarning'
import DashboardGridEditor, {
  createEmptyDashboardContent,
} from '../dashboard/_components/dashboard-grid-editor'
import { useCreateDashboard } from '../dashboard/_hooks'

const DataExplorerFeature = () => {
  const createDashboard = useCreateDashboard()
  const form = useForm({
    resolver: zodResolver(createDashboardSchema),
    defaultValues: {
      content: createEmptyDashboardContent(),
    },
  })

  useUnsavedChangesWarning(form.formState.isDirty)

  return (
    <div className="flex flex-col gap-4">
      <CrudFormDialog
        form={form}
        mutation={createDashboard}
        buttonText="Save as Dashboard"
        entityName="Dashboard"
        entityNamePlural="dashboards"
        hiddenFields={['content', 'metadata']}
      />
      <DashboardGridEditor
        value={form.watch('content')}
        onChange={(next) =>
          form.setValue('content', next, {
            shouldDirty: true,
            shouldTouch: true,
          })
        }
      />
    </div>
  )
}

export default DataExplorerFeature
