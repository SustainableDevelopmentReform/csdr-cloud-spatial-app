import Link from 'next/link'
import type { ReactNode } from 'react'
import type { LogEntry } from '../_hooks'

const userBasePath = '/console/super-admin/users'

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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const collectDetailUserIds = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap(collectDetailUserIds)
  }

  if (!isRecord(value)) {
    return []
  }

  return Object.entries(value).flatMap(([key, nestedValue]) => {
    const nestedIds = collectDetailUserIds(nestedValue)

    if (
      typeof nestedValue === 'string' &&
      (key === 'userId' || key.endsWith('UserId') || key.endsWith('UserIds'))
    ) {
      return [nestedValue, ...nestedIds]
    }

    return nestedIds
  })
}

const authUserResourceActions = new Set([
  'admin_ban_user',
  'admin_get_user',
  'admin_impersonate_user',
  'admin_list_user_sessions',
  'admin_remove_user',
  'admin_revoke_user_sessions',
  'admin_set_role',
  'admin_set_user_password',
  'admin_unban_user',
  'admin_update_user',
])

const isUserResourceId = (entry: LogEntry): boolean => {
  if (!entry.resourceId) {
    return false
  }

  if (entry.resourceType === 'user') {
    return true
  }

  if (entry.actorUserId && entry.resourceId === entry.actorUserId) {
    return true
  }

  return (
    entry.resourceType === 'auth' && authUserResourceActions.has(entry.action)
  )
}

const UserLink = ({
  userId,
  children,
  className,
}: {
  userId: string
  children: ReactNode
  className: string
}) => (
  <Link
    className={className}
    href={`${userBasePath}/${encodeURIComponent(userId)}`}
  >
    {children}
  </Link>
)

const UserIdLink = ({ userId }: { userId: string }) => (
  <UserLink
    className="font-mono text-xs text-blue-700 underline underline-offset-2"
    userId={userId}
  >
    {userId}
  </UserLink>
)

const getRelatedUserIds = (entry: LogEntry): string[] => {
  const ids = [
    entry.actorUserId,
    isUserResourceId(entry) ? entry.resourceId : null,
    ...collectDetailUserIds(entry.details),
  ].filter((value) => value !== null)

  return Array.from(new Set(ids))
}

const getActorLabel = (entry: LogEntry): string => {
  if (entry.actorUser?.name) {
    return entry.actorUser.name
  }

  if (entry.actorUser?.email) {
    return entry.actorUser.email
  }

  return entry.actorUserId ?? 'Anonymous'
}

const ActorCell = ({
  entry,
  showUserLinks,
}: {
  entry: LogEntry
  showUserLinks: boolean
}) => {
  const actorUserId = entry.actorUser?.id ?? entry.actorUserId
  const actorLabel = getActorLabel(entry)
  const actorEmail =
    entry.actorUser?.email && entry.actorUser.email !== actorLabel
      ? entry.actorUser.email
      : null

  return (
    <div>
      <div>
        {showUserLinks && actorUserId ? (
          <UserLink
            className="font-medium text-blue-700 underline underline-offset-2"
            userId={actorUserId}
          >
            {actorLabel}
          </UserLink>
        ) : (
          actorLabel
        )}
      </div>
      {actorEmail ? (
        <div className="text-xs text-gray-500">{actorEmail}</div>
      ) : null}
      {showUserLinks && actorUserId ? (
        <div>
          <UserIdLink userId={actorUserId} />
        </div>
      ) : null}
      <div className="text-xs text-gray-500">
        {formatToken(entry.actorRole)}
      </div>
    </div>
  )
}

export const LogTable = ({
  entries,
  showUserLinks = false,
}: {
  entries: LogEntry[]
  showUserLinks?: boolean
}) => {
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
          {entries.map((entry) => {
            const relatedUserIds = showUserLinks ? getRelatedUserIds(entry) : []

            return (
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
                    {showUserLinks &&
                    isUserResourceId(entry) &&
                    entry.resourceId ? (
                      <UserIdLink userId={entry.resourceId} />
                    ) : (
                      (entry.resourceId ?? entry.requestPath)
                    )}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <ActorCell entry={entry} showUserLinks={showUserLinks} />
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
                    {relatedUserIds.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        {relatedUserIds.map((userId) => (
                          <UserIdLink key={userId} userId={userId} />
                        ))}
                      </div>
                    ) : null}
                  </details>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
