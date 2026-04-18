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
import { useQueryWithSearchParams } from '~/hooks/useSearchParams'
import { useAccessControl } from '~/hooks/useAccessControl'
import { ConsoleCrudListFrame } from '../_components/console-crud-list-frame'
import { ConsolePageHeader } from '../_components/console-page-header'
import { ConsoleSimpleBreadcrumbs } from '../_components/console-simple-breadcrumbs'
import {
  logPageQuerySchema,
  type LogEntry,
  useAuditLogs,
  useReadLogs,
} from './_hooks'

const formatToken = (value: string | null | undefined): string => {
  if (!value) {
    return 'Unknown'
  }

  return value.replaceAll('_', ' ')
}

const renderDetails = (details: unknown): string => {
  if (details === null || details === undefined) {
    return 'No additional details recorded.'
  }

  try {
    return JSON.stringify(details, null, 2)
  } catch {
    return 'Unable to render log details.'
  }
}

const LogTable = ({ entries }: { entries: LogEntry[] }) => {
  if (entries.length === 0) {
    return <div className="text-sm text-gray-500">No log events found.</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="px-3 py-2 font-medium">Date</th>
            <th className="px-3 py-2 font-medium">Action</th>
            <th className="px-3 py-2 font-medium">Resource</th>
            <th className="px-3 py-2 font-medium">Actor</th>
            <th className="px-3 py-2 font-medium">Decision</th>
            <th className="px-3 py-2 font-medium">Details</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className="border-b border-gray-100 align-top">
              <td className="px-3 py-2 whitespace-nowrap">
                {new Date(entry.createdAt).toLocaleString()}
              </td>
              <td className="px-3 py-2">
                {formatToken(entry.action)} ({entry.requestMethod})
              </td>
              <td className="px-3 py-2">
                <div>{formatToken(entry.resourceType)}</div>
                <div className="text-xs text-gray-500">
                  {entry.resourceId ?? entry.requestPath}
                </div>
              </td>
              <td className="px-3 py-2">
                <div>{entry.actorUserId ?? 'Anonymous'}</div>
                <div className="text-xs text-gray-500">
                  {formatToken(entry.actorRole)}
                </div>
              </td>
              <td className="px-3 py-2">{entry.decision}</td>
              <td className="px-3 py-2">
                <details>
                  <summary className="cursor-pointer text-sm underline">
                    View
                  </summary>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words rounded border border-gray-200 bg-gray-50 p-3 text-xs">
                    {renderDetails(entry.details)}
                  </pre>
                </details>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const LogsPageClient = () => {
  const { query, setSearchParams } = useQueryWithSearchParams(
    logPageQuerySchema,
    {
      page: 1,
      size: 25,
      tab: 'audit',
    },
    true,
  )
  const { activeOrganization } = useAccessControl()
  const activeOrganizationId = activeOrganization.data?.id ?? null

  const tab = query?.tab ?? 'audit'
  const hasActiveOrganization = activeOrganizationId !== null
  const auditLogs = useAuditLogs(
    activeOrganizationId,
    query,
    tab === 'audit' && hasActiveOrganization,
  )
  const readLogs = useReadLogs(
    activeOrganizationId,
    query,
    tab === 'read' && hasActiveOrganization,
  )
  const activeQuery = tab === 'audit' ? auditLogs : readLogs
  const activeData = activeQuery.data
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
        description="Audit and read events for the active organization."
        actions={
          <div className="flex gap-2">
            <Button
              variant={tab === 'audit' ? 'default' : 'outline'}
              onClick={() =>
                setSearchParams({
                  page: 1,
                  tab: 'audit',
                })
              }
            >
              Audit
            </Button>
            <Button
              variant={tab === 'read' ? 'default' : 'outline'}
              onClick={() =>
                setSearchParams({
                  page: 1,
                  tab: 'read',
                })
              }
            >
              Read
            </Button>
          </div>
        }
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
        {!hasActiveOrganization ? (
          <div className="text-sm text-gray-500">
            Select an organization before reviewing logs.
          </div>
        ) : activeQuery.isLoading ? (
          <div className="text-sm text-gray-500">Loading logs...</div>
        ) : (
          <LogTable entries={activeData?.data ?? []} />
        )}

        {hasActiveOrganization ? (
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
        ) : null}
      </ConsoleCrudListFrame>
    </div>
  )
}

export default LogsPageClient
