'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { updateWorkflowSchema } from '@repo/schemas/crud'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { usePathname } from 'next/navigation'
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

function camelCaseToTitleCase(str: string) {
  return str
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/^./, (s) => s.toUpperCase()) // Capitalize the first letter
}

const WorkflowDetails = () => {
  const pathname = usePathname()
  let workflowId = pathname.split('/').pop()
  if (workflowId === 'workflow') workflowId = undefined

  const { data: workflowFromUrl } = useWorkflow(workflowId)

  const workflow = workflowFromUrl

  const updateWorkflow = useUpdateWorkflow(workflowId)
  const deleteWorkflow = useDeleteWorkflow(workflowId, WORKFLOWS_BASE_PATH)

  const form = useForm({
    resolver: zodResolver(updateWorkflowSchema),
  })

  useEffect(() => {
    if (workflow) {
      form.reset(workflow)
    }
  }, [workflow, form])

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
        readOnlyFields={['id', 'name']}
        hiddenFields={['description', 'metadata']}
      >
        <FormField
          control={form.control}
          name="inputParameters"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Input Parameters</FormLabel>
              <FormControl>
                <Input
                  disabled
                  className="bg-gray-100"
                  {...field}
                  value={
                    typeof field.value === 'string'
                      ? field.value
                      : JSON.stringify(field.value, null, 2)
                  }
                  onChange={(e) => {
                    let val = e.target.value
                    try {
                      val = JSON.parse(val)
                    } catch {}
                    field.onChange(val)
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {['status', 'createdAt', 'updatedAt', 'completedAt'].map(
          (fieldName) => (
            <FormField
              key={fieldName}
              control={form.control}
              name={fieldName}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{camelCaseToTitleCase(fieldName)}</FormLabel>
                  <FormControl>
                    <Input
                      disabled
                      className="bg-gray-100"
                      {...field}
                      value={
                        field.value
                          ? fieldName.endsWith('At')
                            ? new Date(field.value).toLocaleString()
                            : field.value
                          : ''
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ),
        )}
      </CrudForm>
    </div>
  )
}

export default WorkflowDetails
