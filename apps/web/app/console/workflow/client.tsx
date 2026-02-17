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
import { WorkflowButton } from './_components/workflow-button'
import {
  useAllWorkflows,
  useCreateWorkflow,
  useWorkflowLink,
  WorkflowListItem,
} from './_hooks'
import { createWorkflowSchema } from '@repo/schemas/crud'
import { SearchInput } from '../../../components/table/search-input'
import { ColumnDef, createColumnHelper } from '@tanstack/react-table'

const columnHelper = createColumnHelper<WorkflowListItem>()
const columns = [
  columnHelper.accessor((row) => row.duration, {
    id: 'duration',
    header: () => <span>Duration</span>,
    cell: (info) => {
      return info.getValue()
    },
    size: 120,
  }),
  columnHelper.accessor((row) => row.completedAt, {
    id: 'completedAt',
    header: () => <span>Completed At</span>,
    cell: (info) => {
      const value = info.getValue()
      if (!value) return null
      return new Date(value).toLocaleDateString()
    },
    size: 120,
  }),
  columnHelper.accessor((row) => row.status, {
    id: 'status',
    header: () => <span>Status</span>,
    cell: (info) => {
      const value = info.getValue()
      if (!value) return null
      return <span>{value}</span>
    },
    size: 120,
  }),
  columnHelper.accessor((row) => row.message, {
    id: 'message',
    header: () => <span>Message</span>,
    cell: (info) => {
      return info.getValue()
    },
    size: 120,
  }),
  columnHelper.accessor((row) => row.inputParameters, {
    id: 'inputParameters',
    header: () => <span>Input Parameters</span>,
    cell: (info) => {
      const value = info.getValue()
      if (!value) return null
      return <pre>{JSON.stringify(value, null, 2)}</pre>
    },
    size: 120,
  }),
] as ColumnDef<WorkflowListItem>[]

const WorkflowFeature = () => {
  const {
    data,
    query,
    setSearchParams,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAllWorkflows(undefined, true)
  const createWorkflow = useCreateWorkflow()
  const workflowLink = useWorkflowLink()

  const baseColumns = useMemo(() => {
    return ['id', 'createdAt', 'updatedAt'] as const
  }, [])

  const form = useForm({
    resolver: zodResolver(createWorkflowSchema),
  })

  return (
    <div>
      <div className="flex justify-between">
        <h1 className="text-3xl font-medium mb-2">Workflows</h1>
        <CrudFormDialog
          form={form}
          mutation={createWorkflow}
          buttonText="Add Workflow"
          entityName="Workflow"
          entityNamePlural="Workflows"
          hiddenFields={['metadata']}
        >
          <FormField
            control={form.control}
            name={'sourceUrl'}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Source URL</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={'sourceMetadataUrl'}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Source Metadata URL</FormLabel>
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
          extraColumns={columns}
          title="Workflows"
          itemLink={workflowLink}
          itemButton={(workflow) => <WorkflowButton workflow={workflow} />}
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

export default WorkflowFeature
