'use client'

import { Button } from '@repo/ui/components/ui/button'
import { Input } from '@repo/ui/components/ui/input'
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
  const currentPage = query?.page ?? 1
  const pageCount = activeData?.pageCount ?? 1

  return (
    <div className="flex flex-col gap-6">
      <ConsolePageHeader
        breadcrumbs={
          <ConsoleSimpleBreadcrumbs
            items={[
              { href: '/console', label: 'Home' },
              { label: 'Audit Logs' },
            ]}
          />
        }
      />
      <ConsoleCrudListFrame
        title="Audit Logs"
        description="Audit events that are not attached to an organization."
        toolbar={
          <div className="flex flex-wrap gap-3">
            <Input
              className="w-[180px]"
              placeholder="Action"
              value={query?.action ?? ''}
              onChange={(event) =>
                setSearchParams({
                  action: event.target.value || undefined,
                  page: 1,
                })
              }
            />
            <Input
              className="w-[180px]"
              placeholder="Resource type"
              value={query?.resourceType ?? ''}
              onChange={(event) =>
                setSearchParams({
                  page: 1,
                  resourceType: event.target.value || undefined,
                })
              }
            />
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
              <SelectTrigger className="w-[160px]">
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
              <SelectTrigger className="w-[170px]">
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
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Page size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25 rows</SelectItem>
                <SelectItem value="50">50 rows</SelectItem>
                <SelectItem value="100">100 rows</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      >
        {auditLogs.isLoading ? (
          <div className="text-sm text-gray-500">Loading logs...</div>
        ) : (
          <LogTable entries={activeData?.data ?? []} showUserLinks />
        )}

        <div className="mt-6 flex items-center justify-end gap-2">
          <div className="mr-2 text-sm text-gray-500">
            Page {currentPage} of {pageCount}
          </div>
          <Button
            variant="outline"
            disabled={currentPage <= 1}
            onClick={() =>
              setSearchParams({
                page: currentPage - 1,
              })
            }
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={currentPage >= pageCount}
            onClick={() =>
              setSearchParams({
                page: currentPage + 1,
              })
            }
          >
            Next
          </Button>
        </div>
      </ConsoleCrudListFrame>
    </div>
  )
}

export default SuperAdminAuditLogsPageClient
