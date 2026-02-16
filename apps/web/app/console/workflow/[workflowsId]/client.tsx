'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { updateWorkflowSchema } from '@repo/schemas/crud'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { CrudForm } from '../../../../components/form/crud-form'
import { WORKFLOWS_BASE_PATH } from '../../../../lib/paths'
import { SourcesCard } from '../../_components/sources-card'
import { useDeleteWorkflow, useWorkflow, useUpdateWorkflow } from '../_hooks'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/ui/form'
import { Input } from '@repo/ui/components/ui/input'

const WorkflowDetails = () => {
  const { data: workflow } = useWorkflow()
  const updateWorkflow = useUpdateWorkflow()
  const deleteWorkflow = useDeleteWorkflow(undefined, WORKFLOWS_BASE_PATH)

  const form = useForm({
    resolver: zodResolver(updateWorkflowSchema),
  })

  useEffect(() => {
    if (workflow) {
      form.reset(workflow)
    }
  }, [workflow, form])

  console.log('workflow', workflow)

  return (
    <div className="w-[800px] max-w-full gap-8 flex flex-col">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="grid grid-cols-1 grid-rows-3 gap-4">
            {workflow && <SourcesCard resource={workflow} />}
          </div>
        </div>
      </div>
      <CrudForm
        form={form}
        mutation={updateWorkflow}
        deleteMutation={deleteWorkflow}
        entityName="Workflow"
        entityNamePlural="Workflows"
        successMessage="Updated Workflow"
        readOnlyFields={['inputParameters']}
      >
        <FormField
          control={form.control}
          name={'inputParameters'}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Input Parameters</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CrudForm>
    </div>
  )
}

export default WorkflowDetails
