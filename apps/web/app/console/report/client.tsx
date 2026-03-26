'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { createReportSchema } from '@repo/schemas/crud'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import Pagination from '~/components/table/pagination'
import CrudFormDialog from '../../../components/form/crud-form-dialog'
import BaseCrudTable from '../../../components/table/crud-table'
import { useAccessControl } from '../../../hooks/useAccessControl'
import { ReportButton } from './_components/report-button'
import { useCreateReport, useReportLink, useReports } from './_hooks'
import { SearchInput } from '../../../components/table/search-input'
import { canCreateConsoleResource } from '../../../utils/access-control'

const ReportFeature = () => {
  const {
    data,
    query,
    setSearchParams,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
  } = useReports(undefined, true)
  const createReport = useCreateReport()
  const { access } = useAccessControl()

  const reportLink = useReportLink()

  const baseColumns = useMemo(() => {
    return ['description', 'createdAt', 'updatedAt'] as const
  }, [])

  const form = useForm({
    resolver: zodResolver(createReportSchema),
  })

  return (
    <div>
      <div className="flex justify-between">
        <h1 className="text-3xl font-medium mb-2">Reports</h1>
        <CrudFormDialog
          form={form}
          mutation={createReport}
          buttonText="Add Report"
          entityName="Report"
          entityNamePlural="reports"
          hideTrigger={!canCreateConsoleResource(access, 'report')}
        ></CrudFormDialog>
      </div>
      <div>
        <SearchInput
          placeholder="Search reports"
          value={query?.search ?? ''}
          onChange={(e) => setSearchParams({ search: e.target.value })}
        />
        <BaseCrudTable
          data={data?.data || []}
          isLoading={isLoading}
          baseColumns={baseColumns}
          title="Report"
          itemLink={reportLink}
          itemButton={(report) => <ReportButton report={report} />}
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

export default ReportFeature
