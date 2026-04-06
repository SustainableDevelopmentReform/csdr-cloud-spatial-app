import { auditLog, readLog } from '~/schemas/db'
import { db } from './db'
import type { RequestActor } from './request-actor'

export type AccessLogDecision = 'allow' | 'deny'
export type AccessLogDestination = 'audit' | 'read'

type AccessLogDetails = Record<string, unknown> | null

const readActions = new Set(['read', 'list'])

const resolveAccessLogDestination = (
  action: string,
  destination?: AccessLogDestination,
): AccessLogDestination => {
  if (destination) {
    return destination
  }

  return readActions.has(action) ? 'read' : 'audit'
}

const getActorRole = (actor: RequestActor | null): string | null => {
  if (!actor) {
    return null
  }

  if (actor.isSuperAdmin) {
    return 'super_admin'
  }

  return actor.organizationRole
}

export const shouldPersistDeniedDecisionLog = (statusCode: number): boolean =>
  statusCode === 401 || statusCode === 403 || statusCode === 404

export const getRequestIp = (request: Request): string | null => {
  const forwardedFor = request.headers.get('x-forwarded-for')

  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() ?? null
  }

  return request.headers.get('x-real-ip')
}

export const persistAccessLog = async (options: {
  actor: RequestActor | null
  action: string
  decision: AccessLogDecision
  destination?: AccessLogDestination
  request: Request
  resourceId?: string | null
  resourceType: string
  statusCode: number
  actorRole?: string | null
  actorUserId?: string | null
  activeOrganizationId?: string | null
  details?: AccessLogDetails
  targetOrganizationId?: string | null
}): Promise<void> => {
  const destination = resolveAccessLogDestination(
    options.action,
    options.destination,
  )
  const values = {
    id: crypto.randomUUID(),
    actorUserId: options.actorUserId ?? options.actor?.user.id ?? null,
    actorRole: options.actorRole ?? getActorRole(options.actor),
    activeOrganizationId:
      options.activeOrganizationId ??
      options.actor?.activeOrganizationId ??
      null,
    targetOrganizationId:
      options.targetOrganizationId ??
      options.actor?.activeOrganizationId ??
      null,
    resourceType: options.resourceType,
    resourceId: options.resourceId ?? null,
    action: options.action,
    decision: options.decision,
    requestPath: new URL(options.request.url).pathname,
    requestMethod: options.request.method,
    ipAddress: getRequestIp(options.request),
    userAgent: options.request.headers.get('user-agent'),
    details: {
      ...(options.details ?? {}),
      statusCode: options.statusCode,
    },
  }

  try {
    if (destination === 'read') {
      await db.insert(readLog).values(values)
      return
    }

    await db.insert(auditLog).values(values)
  } catch (error) {
    console.error('Failed to persist access log entry', error)
  }
}
