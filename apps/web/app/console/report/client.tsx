'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { createReportSchema } from '@repo/schemas/crud'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import Pagination from '~/components/table/pagination'
import CrudFormDialog from '../../../components/form/crud-form-dialog'
import BaseCrudTable from '../../../components/table/crud-table'
import { ReportButton } from './_components/report-button'
import { useCreateReport, useReportLink, useReports } from './_hooks'
import { SearchInput } from '../../../components/table/search-input'

const ReportFeature = () => {
  const { data, query, setSearchParams } = useReports(undefined, true)
  const createReport = useCreateReport()

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
          baseColumns={baseColumns}
          title="Report"
          itemLink={reportLink}
          itemButton={(report) => <ReportButton report={report} />}
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

export default ReportFeature
