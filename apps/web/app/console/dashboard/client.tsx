'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { createDashboardSchema } from '@repo/schemas/crud'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import Pagination from '~/components/table/pagination'
import CrudFormDialog from '../../../components/form/crud-form-dialog'
import BaseCrudTable from '../../../components/table/crud-table'
import { useCreateDashboard, useDashboardLink, useDashboards } from './_hooks'
import { createEmptyDashboardContent } from './_components/dashboard-grid-editor'
import { DashboardButton } from './_components/dashboard-button'
import { SearchInput } from '../../../components/table/search-input'

const DashboardFeature = () => {
  const {
    data,
    query,
    setSearchParams,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
  } = useDashboards(undefined, true)
  const createDashboard = useCreateDashboard()

  const dashboardLink = useDashboardLink()

  const baseColumns = useMemo(() => {
    return ['description', 'createdAt', 'updatedAt'] as const
  }, [])

  const form = useForm({
    resolver: zodResolver(createDashboardSchema),
    defaultValues: {
      content: createEmptyDashboardContent(),
    },
  })

  return (
    <div>
      <div className="flex justify-between">
        <h1 className="text-3xl font-medium mb-2">Dashboards</h1>
        <CrudFormDialog
          form={form}
          mutation={createDashboard}
          buttonText="Add Dashboard"
          entityName="Dashboard"
          entityNamePlural="dashboards"
          hiddenFields={['content', 'metadata']}
        />
      </div>
      <div>
        <SearchInput
          placeholder="Search dashboards"
          value={query?.search ?? ''}
          onChange={(e) => setSearchParams({ search: e.target.value })}
        />
        <BaseCrudTable
          data={data?.data || []}
          isLoading={isLoading}
          baseColumns={baseColumns}
          title="Dashboard"
          itemLink={dashboardLink}
          itemButton={(dashboard) => <DashboardButton dashboard={dashboard} />}
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

export default DashboardFeature
