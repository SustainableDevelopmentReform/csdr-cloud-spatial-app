'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/ui/select'
import { ConsoleCrudListFrame } from '~/app/console/_components/console-crud-list-frame'
import { ConsolePageHeader } from '~/app/console/_components/console-page-header'
import { ConsoleSimpleBreadcrumbs } from '~/app/console/_components/console-simple-breadcrumbs'
import Pagination from '~/components/table/pagination'
import { SearchInput } from '~/components/table/search-input'
import {
  ActiveTableFilter,
  TableFilterPopover,
} from '~/components/table/filter-popover'
import { useQueryWithSearchParams } from '~/hooks/useSearchParams'
import { LogTable } from '../../logs/_components/log-table'
import { logPageQuerySchema, useSuperAdminAuditLogs } from '../../logs/_hooks'

const SuperAdminAuditLogsPageClient = () => {
  const { query, setSearchParams } = useQueryWithSearchParams(
    logPageQuerySchema,
    {
      page: 1,
      size: 25,
    },
    true,
  )
  const auditLogs = useSuperAdminAuditLogs(query)
  const activeData = auditLogs.data
  const activeFilters: ActiveTableFilter[] = []

  if (query?.decision) {
    activeFilters.push({
      id: 'decision',
      label: 'Decision',
      value: query.decision,
      onClear: () => setSearchParams({ decision: undefined, page: 1 }),
    })
  }

  if (query?.requestKind) {
    activeFilters.push({
      id: 'request-kind',
      label: 'Request type',
      value: query.requestKind === 'mutating' ? 'Mutating' : 'Read-only',
      onClear: () => setSearchParams({ requestKind: undefined, page: 1 }),
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <ConsolePageHeader
        breadcrumbs={
          <ConsoleSimpleBreadcrumbs items={[{ label: 'Audit Logs' }]} />
        }
      />
      <ConsoleCrudListFrame
        title="Audit Logs"
        description="Audit events that are not attached to an organization."
        footer={
          <Pagination
            hasNextPage={!!auditLogs.hasNextPage}
            isLoading={auditLogs.isFetchingNextPage}
            loadedCount={activeData?.data.length}
            totalCount={activeData?.totalCount}
            onLoadMore={() => auditLogs.fetchNextPage()}
          />
        }
        toolbar={
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <SearchInput
              className="w-full md:w-72"
              placeholder="Search audit logs"
              value={query?.search ?? ''}
              onChange={(event) =>
                setSearchParams({
                  search: event.target.value || undefined,
                  page: 1,
                })
              }
            />
            <TableFilterPopover activeFilters={activeFilters}>
              <Select
                value={query?.decision ?? 'all'}
                onValueChange={(value) => {
                  const decision =
                    value === 'allow' || value === 'deny' ? value : undefined

                  setSearchParams({
                    decision,
                    page: 1,
                  })
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Decision" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All decisions</SelectItem>
                  <SelectItem value="allow">Allow</SelectItem>
                  <SelectItem value="deny">Deny</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={query?.requestKind ?? 'all'}
                onValueChange={(value) => {
                  const requestKind =
                    value === 'mutating' || value === 'read' ? value : undefined

                  setSearchParams({
                    page: 1,
                    requestKind,
                  })
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Request type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All requests</SelectItem>
                  <SelectItem value="mutating">Mutating</SelectItem>
                  <SelectItem value="read">Read-only</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={String(query?.size ?? 25)}
                onValueChange={(value) =>
                  setSearchParams({
                    page: 1,
                    size: Number(value),
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Page size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 rows</SelectItem>
                  <SelectItem value="50">50 rows</SelectItem>
                  <SelectItem value="100">100 rows</SelectItem>
                </SelectContent>
              </Select>
            </TableFilterPopover>
          </div>
        }
      >
        <LogTable
          entries={activeData?.data ?? []}
          isLoading={auditLogs.isLoading}
          showUserLinks
        />
      </ConsoleCrudListFrame>
    </div>
  )
}

export default SuperAdminAuditLogsPageClient
