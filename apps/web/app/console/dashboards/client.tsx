'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { createDashboardSchema } from '@repo/schemas/crud'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import Pagination from '~/components/pagination'
import CrudFormDialog from '../../../components/crud-form-dialog'
import BaseCrudTable from '../../../components/crud-table'
import { useCreateDashboard, useDashboardLink, useDashboards } from './_hooks'
import { createEmptyDashboardContent } from './_components/dashboard-grid-editor'
import { DashboardButton } from './_components/dashboard-button'
import { SearchInput } from '../../../components/search-input'

const DashboardFeature = () => {
  const { data, query, setSearchParams } = useDashboards(undefined, true)
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
          baseColumns={baseColumns}
          title="Dashboard"
          itemLink={dashboardLink}
          itemButton={(dashboard) => <DashboardButton dashboard={dashboard} />}
          query={query}
          onSortChange={setSearchParams}
        />
        <Pagination
          className="justify-end mt-4"
          totalPages={data?.pageCount ?? 1}
          currentPage={query?.page ?? 1}
          onPageChange={(page) => setSearchParams({ page })}
        />
      </div>
    </div>
  )
}

export default DashboardFeature
