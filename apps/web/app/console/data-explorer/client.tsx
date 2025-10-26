'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { createDashboardSchema } from '@repo/schemas/crud'
import { useForm } from 'react-hook-form'
import CrudFormDialog from '../../../components/crud-form-dialog'
import DashboardGridEditor, {
  createEmptyDashboardContent,
} from '../dashboards/_components/dashboard-grid-editor'
import { useCreateDashboard } from '../dashboards/_hooks'

const DataExplorerFeature = () => {
  const createDashboard = useCreateDashboard()
  const form = useForm({
    resolver: zodResolver(createDashboardSchema),
    defaultValues: {
      content: createEmptyDashboardContent(),
    },
  })

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
        onChange={(next) => form.setValue('content', next)}
      />
    </div>
  )
}

export default DataExplorerFeature
