'use client'

import { Badge } from '@repo/ui/components/ui/badge'
import { Button } from '@repo/ui/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/ui/card'
import { Input } from '@repo/ui/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@repo/ui/components/ui/tabs'
import { formatDateTime } from '@repo/ui/lib/date'
import { Shield, Telescope } from 'lucide-react'
import { useMemo } from 'react'
import { useQueryWithSearchParams } from '~/hooks/useSearchParams'
import {
  logPageQuerySchema,
  type LogEntry,
  useAuditLogs,
  useReadLogs,
} from './_hooks'

const formatToken = (value: string | null | undefined) => {
  if (!value) {
    return 'Unknown'
  }

  return value.replaceAll('_', ' ')
}

const serializeDetails = (details: unknown) => {
  if (details === null || details === undefined) {
    return null
  }

  try {
    return JSON.stringify(details, null, 2)
  } catch {
    return 'Unable to render log details'
  }
}

const LogCards = ({
  entries,
  emptyMessage,
  isLoading,
}: {
  entries: LogEntry[]
  emptyMessage: string
  isLoading: boolean
}) => {
  if (isLoading) {
    return (
      <div className="rounded-[24px] border border-dashed border-gray-300 bg-white px-6 py-10 text-sm text-gray-500">
        Loading log events...
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-gray-300 bg-white px-6 py-10 text-sm text-gray-500">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => {
        const details = serializeDetails(entry.details)

        return (
          <Card
            key={entry.id}
            className="overflow-hidden border-gray-200 bg-white shadow-sm"
          >
            <CardHeader className="gap-4 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-lg capitalize">
                    {formatToken(entry.action)}{' '}
                    {formatToken(entry.resourceType)}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {formatDateTime(entry.createdAt)} · {entry.requestMethod}{' '}
                    {entry.requestPath}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={
                      entry.decision === 'deny' ? 'destructive' : 'secondary'
                    }
                  >
                    {entry.decision}
                  </Badge>
                  <Badge variant="outline">
                    {formatToken(entry.actorRole ?? 'anonymous')}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 px-6 py-5 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 bg-gray-50/70 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-gray-500">
                    Actor
                  </div>
                  <div className="mt-2 text-sm font-medium text-gray-900">
                    {entry.actorUserId ?? 'Anonymous'}
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50/70 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-gray-500">
                    Workspace
                  </div>
                  <div className="mt-2 text-sm font-medium text-gray-900">
                    {entry.targetOrganizationId ?? 'None'}
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50/70 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-gray-500">
                    Resource
                  </div>
                  <div className="mt-2 text-sm font-medium text-gray-900">
                    {entry.resourceId ?? 'List/search event'}
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50/70 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-gray-500">
                    Client
                  </div>
                  <div className="mt-2 text-sm font-medium text-gray-900">
                    {entry.ipAddress ?? 'Unavailable'}
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-gray-200 bg-slate-950 px-4 py-4 text-sm text-slate-100 shadow-inner">
                <div className="text-xs uppercase tracking-[0.22em] text-slate-400">
                  Redacted details
                </div>
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-6 text-slate-200">
                  {details ?? 'No additional details recorded.'}
                </pre>
              </div>
            </CardContent>
          </Card>
        )
      })}
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
  const tab = query?.tab ?? 'audit'
  const auditLogs = useAuditLogs(query, tab === 'audit')
  const readLogs = useReadLogs(query, tab === 'read')
  const activeQuery = tab === 'audit' ? auditLogs : readLogs
  const activeData = activeQuery.data

  const summaryItems = useMemo(
    () => [
      {
        label: 'Visible events',
        value: activeData?.totalCount ?? 0,
      },
      {
        label: 'Current page',
        value: query?.page ?? 1,
      },
      {
        label: 'Event stream',
        value: tab === 'audit' ? 'Audit' : 'Read',
      },
    ],
    [activeData?.totalCount, query?.page, tab],
  )

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_32%),linear-gradient(135deg,_#ffffff,_#f8fafc_55%,_#ecfeff)] px-6 py-7 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <div className="text-xs uppercase tracking-[0.28em] text-slate-500">
              Access trace
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              Organization audit and read logs
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Review privileged changes, public reads, denied requests, and
              workspace-scoped access decisions from the new authorization
              layer.
            </p>
          </div>
          <div className="grid min-w-[260px] gap-3 sm:grid-cols-3">
            {summaryItems.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/70 bg-white/90 px-4 py-4 shadow-sm"
              >
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  {item.label}
                </div>
                <div className="mt-2 text-xl font-semibold text-slate-950">
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => {
          if (value === 'audit' || value === 'read') {
            setSearchParams({
              page: 1,
              tab: value,
            })
          }
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <TabsList className="bg-white">
            <TabsTrigger value="audit" className="gap-2">
              <Shield className="size-4" />
              Audit stream
            </TabsTrigger>
            <TabsTrigger value="read" className="gap-2">
              <Telescope className="size-4" />
              Read stream
            </TabsTrigger>
          </TabsList>

          <div className="grid gap-3 md:grid-cols-3">
            <Input
              placeholder="Filter resource type"
              value={query?.resourceType ?? ''}
              onChange={(event) => {
                setSearchParams({
                  page: 1,
                  resourceType: event.target.value,
                })
              }}
            />
            <Input
              placeholder="Filter action"
              value={query?.action ?? ''}
              onChange={(event) => {
                setSearchParams({
                  action: event.target.value,
                  page: 1,
                })
              }}
            />
            <Select
              value={query?.decision ?? 'all'}
              onValueChange={(value) => {
                const parsedDecision =
                  value === 'all'
                    ? null
                    : logPageQuerySchema.shape.decision.safeParse(value)

                setSearchParams({
                  decision:
                    value === 'all'
                      ? undefined
                      : parsedDecision?.success
                        ? parsedDecision.data
                        : undefined,
                  page: 1,
                })
              }}
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Decision" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All decisions</SelectItem>
                <SelectItem value="allow">Allow</SelectItem>
                <SelectItem value="deny">Deny</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="audit" className="mt-6 space-y-4">
          <LogCards
            entries={auditLogs.data?.data ?? []}
            emptyMessage="No audit events match the current filters."
            isLoading={auditLogs.isLoading}
          />
        </TabsContent>

        <TabsContent value="read" className="mt-6 space-y-4">
          <LogCards
            entries={readLogs.data?.data ?? []}
            emptyMessage="No read events match the current filters."
            isLoading={readLogs.isLoading}
          />
        </TabsContent>
      </Tabs>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-gray-200 bg-white px-5 py-4 shadow-sm">
        <div className="text-sm text-gray-500">
          Page {query?.page ?? 1} of {activeData?.pageCount ?? 1}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={(query?.page ?? 1) <= 1}
            onClick={() => {
              setSearchParams({
                page: Math.max((query?.page ?? 1) - 1, 1),
              })
            }}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={(query?.page ?? 1) >= (activeData?.pageCount ?? 1)}
            onClick={() => {
              setSearchParams({
                page: (query?.page ?? 1) + 1,
              })
            }}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}

export default LogsPageClient
