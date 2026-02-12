'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { updateWorkflowsSchema } from '@repo/schemas/crud'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { CrudForm } from '../../../../components/form/crud-form'
import { WORKFLOWS_BASE_PATH } from '../../../../lib/paths'
import { SourcesCard } from '../../_components/sources-card'
import { useDeleteWorkflows, useWorkflows, useUpdateWorkflows } from '../_hooks'

const WorkflowsDetails = () => {
  const { data: workflows } = useWorkflows()
  const updateWorkflows = useUpdateWorkflows()
  const deleteWorkflows = useDeleteWorkflows(undefined, WORKFLOWS_BASE_PATH)

  const form = useForm({
    resolver: zodResolver(updateWorkflowsSchema),
  })

  useEffect(() => {
    if (workflows) {
      form.reset(workflows)
    }
  }, [workflows, form])

  return (
    <div className="w-[800px] max-w-full gap-8 flex flex-col">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="grid grid-cols-1 grid-rows-3 gap-4">
            {workflows && <SourcesCard resource={workflows} />}
          </div>
        </div>
      </div>
      <CrudForm
        form={form}
        mutation={updateWorkflows}
        deleteMutation={deleteWorkflows}
        entityName="Workflows"
        entityNamePlural="workflows sets"
        successMessage="Updated Workflows"
      />
    </div>
  )
}

export default WorkflowsDetails
