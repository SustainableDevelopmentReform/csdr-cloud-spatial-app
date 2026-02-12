'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/ui/form'
import { Input } from '@repo/ui/components/ui/input'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import Pagination from '~/components/table/pagination'
import CrudFormDialog from '../../../components/form/crud-form-dialog'
import BaseCrudTable from '../../../components/table/crud-table'
import { WorkflowsButton } from './_components/workflows-button'
import { useAllWorkflows, useCreateWorkflows, useWorkflowsLink } from './_hooks'
import { createWorkflowsSchema } from '@repo/schemas/crud'
import { SearchInput } from '../../../components/table/search-input'

const WorkflowsFeature = () => {
  const {
    data,
    query,
    setSearchParams,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAllWorkflows(undefined, true)
  const createWorkflows = useCreateWorkflows()
  const workflowsLink = useWorkflowsLink()

  const baseColumns = useMemo(() => {
    return ['description', 'createdAt', 'updatedAt'] as const
  }, [])

  const form = useForm({
    resolver: zodResolver(createWorkflowsSchema),
  })

  return (
    <div>
      <div className="flex justify-between">
        <h1 className="text-3xl font-medium mb-2">Workflows</h1>
        <CrudFormDialog
          form={form}
          mutation={createWorkflows}
          buttonText="Add Workflows"
          entityName="Workflows"
          entityNamePlural="workflows sets"
          hiddenFields={[
            'description',
            'metadata',
            'sourceUrl',
            'sourceMetadataUrl',
          ]}
        >
          {/* <FormField
            control={form.control}
            name={'userId'}
            render={({ field }) => (
              <FormItem>
                <FormLabel>User ID</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          /> */}
          <FormField
            control={form.control}
            name={'status'}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
        </CrudFormDialog>
      </div>
      <div>
        <SearchInput
          placeholder="Search workflows"
          value={query?.search ?? ''}
          onChange={(e) => setSearchParams({ search: e.target.value })}
        />
        <BaseCrudTable
          data={data?.data || []}
          baseColumns={baseColumns}
          title="Workflows"
          itemLink={workflowsLink}
          itemButton={(workflows) => <WorkflowsButton workflows={workflows} />}
          query={query}
          onSortChange={setSearchParams}
        />
        <Pagination
          className="justify-end mt-4"
          hasNextPage={!!hasNextPage}
          isLoading={isFetchingNextPage}
          onLoadMore={() => fetchNextPage()}
        />
      </div>
    </div>
  )
}

export default WorkflowsFeature
