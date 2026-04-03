import type { Context } from 'hono'
import { eq, or } from 'drizzle-orm'
import type { AnyColumn, SQL } from 'drizzle-orm'
import { env } from '~/env'
import { auditLog, readLog } from '~/schemas/db'
import type { AppVisibility } from './access-control'
import type { AuthType } from './auth'
import { getRequestIp } from './auth-security'
import { db } from './db'
import { ServerError } from './error'
import {
  type RequestActor,
  requireActiveOrganization,
  requireAuthenticatedActor,
  requireMfaIfNeeded,
} from './request-actor'

export const topLevelAclResourceTypes = [
  'dataset',
  'geometries',
  'product',
  'indicatorCategory',
  'indicator',
  'derivedIndicator',
  'report',
  'dashboard',
] as const

export type TopLevelAclResourceType = (typeof topLevelAclResourceTypes)[number]

export const permissionResourceTypes = [
  ...topLevelAclResourceTypes,
  'datasetRun',
  'geometriesRun',
  'geometryOutput',
  'productRun',
  'productOutput',
  'auditLog',
  'readLog',
] as const

export type PermissionResourceType = (typeof permissionResourceTypes)[number]
export type PermissionAction = 'read' | 'write'
export type RouteAccessScope = 'console' | 'explorer'

type AppContext = Context<{ Variables: AuthType }>

type AccessRecord = {
  organizationId: string
  createdByUserId: string
  visibility: AppVisibility
}

type ParsedPermission = {
  action: PermissionAction
  resource: PermissionResourceType
}

const creatorWritableResourceTypes = new Set<PermissionResourceType>([
  'report',
  'dashboard',
])
const logResourceTypes = new Set<PermissionResourceType>([
  'auditLog',
  'readLog',
])

const permissionResourceByName = new Map<string, PermissionResourceType>(
  permissionResourceTypes.map((resourceType) => [resourceType, resourceType]),
)

const getRequestActor = (c: AppContext): RequestActor | null =>
  c.get('requestActor')

const parsePermission = (permission: string): ParsedPermission => {
  const [action, resourceName] = permission.split(':')

  if (action !== 'read' && action !== 'write') {
    throw new Error(`Unsupported permission action: ${permission}`)
  }

  const resource = resourceName
    ? permissionResourceByName.get(resourceName)
    : undefined

  if (!resource) {
    throw new Error(`Unsupported permission resource: ${permission}`)
  }

  return {
    action,
    resource,
  }
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

const getRequestResourceId = (c: AppContext): string | null => {
  const id = c.req.param('id')

  return id ? id : null
}

const persistDecisionLog = async (options: {
  actor: RequestActor | null
  c: AppContext
  decision: 'allow' | 'deny'
  permission: string
  resourceId?: string | null
  statusCode: number
  targetOrganizationId?: string | null
}) => {
  const parsedPermission = parsePermission(options.permission)
  const actor = options.actor
  const commonValues = {
    id: crypto.randomUUID(),
    actorUserId: actor?.user.id ?? null,
    actorRole: getActorRole(actor),
    activeOrganizationId: actor?.activeOrganizationId ?? null,
    targetOrganizationId:
      options.targetOrganizationId ?? actor?.activeOrganizationId ?? null,
    resourceType: parsedPermission.resource,
    resourceId: options.resourceId ?? getRequestResourceId(options.c),
    action: parsedPermission.action,
    decision: options.decision,
    requestPath: new URL(options.c.req.url).pathname,
    requestMethod: options.c.req.method,
    ipAddress: getRequestIp(options.c.req.raw),
    userAgent: options.c.req.header('user-agent') ?? null,
    details: {
      permission: options.permission,
      statusCode: options.statusCode,
    },
  }

  try {
    if (parsedPermission.action === 'read') {
      await db.insert(readLog).values(commonValues)
      return
    }

    await db.insert(auditLog).values(commonValues)
  } catch (error) {
    console.error('Failed to persist access control log entry', error)
  }
}

const unauthorizedError = (description?: string) =>
  new ServerError({
    statusCode: 403,
    message: 'User is not authorized',
    description,
  })

const buildNotFoundError = (resource: PermissionResourceType) =>
  new ServerError({
    statusCode: 404,
    message: `Failed to get ${resource}`,
    description: `${resource} you're looking for is not found`,
  })

const ensureExplorerAccessEnabled = (actor: RequestActor | null): void => {
  if (actor) {
    return
  }

  if (env.ACCESS_CONTROL_ALLOW_ANONYMOUS_PUBLIC) {
    return
  }

  throw new ServerError({
    statusCode: 403,
    message: 'Anonymous public access is disabled',
    description:
      'Sign in to access the public explorer or enable anonymous public access.',
  })
}

const isExternallyReadableVisibility = (visibility: AppVisibility): boolean => {
  return visibility !== 'private'
}

export const buildConsoleReadScope = (
  c: AppContext,
  organizationIdColumn: AnyColumn,
  visibilityColumn: AnyColumn,
): SQL => {
  const actor = requireAuthenticatedActor(getRequestActor(c))
  const activeOrganizationId = requireActiveOrganization(actor)
  const scopedWhere = or(
    eq(organizationIdColumn, activeOrganizationId),
    eq(visibilityColumn, 'global'),
  )

  if (!scopedWhere) {
    throw new Error('Failed to build console scope')
  }

  return scopedWhere
}

export const buildExplorerReadScope = (
  c: AppContext,
  organizationIdColumn: AnyColumn,
  visibilityColumn: AnyColumn,
): SQL => {
  const actor = getRequestActor(c)

  if (actor?.activeOrganizationId) {
    const scopedWhere = or(
      eq(organizationIdColumn, actor.activeOrganizationId),
      eq(visibilityColumn, 'global'),
    )

    if (!scopedWhere) {
      throw new Error('Failed to build explorer scope')
    }

    return scopedWhere
  }

  ensureExplorerAccessEnabled(actor)

  return eq(visibilityColumn, 'global')
}

export const requireOwnedInsertContext = (
  c: AppContext,
): { actor: RequestActor; activeOrganizationId: string } => {
  const actor = requireAuthenticatedActor(getRequestActor(c))
  const activeOrganizationId = requireActiveOrganization(actor)

  return {
    actor,
    activeOrganizationId,
  }
}

export const assertCanWriteResource = (options: {
  actor: RequestActor
  resource: PermissionResourceType
  ownerUserId?: string | null
}): void => {
  requireActiveOrganization(options.actor)
  requireMfaIfNeeded(options.actor)

  if (options.actor.isSuperAdmin) {
    return
  }

  if (options.actor.organizationRole === 'org_admin') {
    return
  }

  if (
    options.actor.organizationRole === 'org_creator' &&
    creatorWritableResourceTypes.has(options.resource)
  ) {
    if (options.ownerUserId && options.ownerUserId !== options.actor.user.id) {
      throw unauthorizedError(
        'Org creators can only manage dashboards and reports they created.',
      )
    }

    return
  }

  throw unauthorizedError()
}

export const assertCanAccessLogs = (actor: RequestActor): void => {
  requireActiveOrganization(actor)
  requireMfaIfNeeded(actor)

  if (actor.isSuperAdmin || actor.organizationRole === 'org_admin') {
    return
  }

  throw unauthorizedError()
}

export const assertCanSetVisibility = (options: {
  actor: RequestActor
  currentVisibility: AppVisibility
  nextVisibility: AppVisibility
}): void => {
  if (options.currentVisibility === options.nextVisibility) {
    return
  }

  if (options.actor.isSuperAdmin) {
    return
  }

  if (options.actor.organizationRole !== 'org_admin') {
    throw unauthorizedError(
      'Only org admins or super admins can change resource visibility.',
    )
  }

  if (
    options.currentVisibility === 'global' ||
    options.nextVisibility === 'global'
  ) {
    throw unauthorizedError('Only super admins can change global visibility.')
  }
}

const readTopLevelAccessRecord = async (
  resource: TopLevelAclResourceType,
  id: string,
): Promise<AccessRecord | null> => {
  switch (resource) {
    case 'dataset':
      return (
        (await db.query.dataset.findFirst({
          columns: {
            organizationId: true,
            createdByUserId: true,
            visibility: true,
          },
          where: (table, { eq }) => eq(table.id, id),
        })) ?? null
      )
    case 'geometries':
      return (
        (await db.query.geometries.findFirst({
          columns: {
            organizationId: true,
            createdByUserId: true,
            visibility: true,
          },
          where: (table, { eq }) => eq(table.id, id),
        })) ?? null
      )
    case 'product':
      return (
        (await db.query.product.findFirst({
          columns: {
            organizationId: true,
            createdByUserId: true,
            visibility: true,
          },
          where: (table, { eq }) => eq(table.id, id),
        })) ?? null
      )
    case 'indicatorCategory':
      return (
        (await db.query.indicatorCategory.findFirst({
          columns: {
            organizationId: true,
            createdByUserId: true,
            visibility: true,
          },
          where: (table, { eq }) => eq(table.id, id),
        })) ?? null
      )
    case 'indicator':
      return (
        (await db.query.indicator.findFirst({
          columns: {
            organizationId: true,
            createdByUserId: true,
            visibility: true,
          },
          where: (table, { eq }) => eq(table.id, id),
        })) ?? null
      )
    case 'derivedIndicator':
      return (
        (await db.query.derivedIndicator.findFirst({
          columns: {
            organizationId: true,
            createdByUserId: true,
            visibility: true,
          },
          where: (table, { eq }) => eq(table.id, id),
        })) ?? null
      )
    case 'report':
      return (
        (await db.query.report.findFirst({
          columns: {
            organizationId: true,
            createdByUserId: true,
            visibility: true,
          },
          where: (table, { eq }) => eq(table.id, id),
        })) ?? null
      )
    case 'dashboard':
      return (
        (await db.query.dashboard.findFirst({
          columns: {
            organizationId: true,
            createdByUserId: true,
            visibility: true,
          },
          where: (table, { eq }) => eq(table.id, id),
        })) ?? null
      )
  }
}

export const readAccessRecord = async (
  resource: PermissionResourceType,
  id: string,
): Promise<AccessRecord | null> => {
  switch (resource) {
    case 'dataset':
    case 'geometries':
    case 'product':
    case 'indicatorCategory':
    case 'indicator':
    case 'derivedIndicator':
    case 'report':
    case 'dashboard':
      return readTopLevelAccessRecord(resource, id)
    case 'datasetRun': {
      const record = await db.query.datasetRun.findFirst({
        columns: { datasetId: true },
        where: (table, { eq }) => eq(table.id, id),
      })

      return record
        ? readTopLevelAccessRecord('dataset', record.datasetId)
        : null
    }
    case 'geometriesRun': {
      const record = await db.query.geometriesRun.findFirst({
        columns: { geometriesId: true },
        where: (table, { eq }) => eq(table.id, id),
      })

      return record
        ? readTopLevelAccessRecord('geometries', record.geometriesId)
        : null
    }
    case 'geometryOutput': {
      const record = await db.query.geometryOutput.findFirst({
        columns: { geometriesRunId: true },
        where: (table, { eq }) => eq(table.id, id),
      })

      return record
        ? readAccessRecord('geometriesRun', record.geometriesRunId)
        : null
    }
    case 'productRun': {
      const record = await db.query.productRun.findFirst({
        columns: { productId: true },
        where: (table, { eq }) => eq(table.id, id),
      })

      return record
        ? readTopLevelAccessRecord('product', record.productId)
        : null
    }
    case 'productOutput': {
      const record = await db.query.productOutput.findFirst({
        columns: { productRunId: true },
        where: (table, { eq }) => eq(table.id, id),
      })

      return record ? readAccessRecord('productRun', record.productRunId) : null
    }
    case 'auditLog':
    case 'readLog':
      return null
  }
}

const canReadInConsole = (
  actor: RequestActor,
  accessRecord: AccessRecord,
): boolean =>
  actor.activeOrganizationId === accessRecord.organizationId ||
  isExternallyReadableVisibility(accessRecord.visibility)

const canReadInExplorer = (
  actor: RequestActor | null,
  accessRecord: AccessRecord,
): boolean => {
  if (isExternallyReadableVisibility(accessRecord.visibility)) {
    return true
  }

  return actor?.activeOrganizationId === accessRecord.organizationId
}

export const assertResourceReadable = async (options: {
  c: AppContext
  resource: PermissionResourceType
  resourceId: string
  scope?: RouteAccessScope
  notFoundError: () => ServerError
}): Promise<AccessRecord> => {
  const scope = options.scope ?? 'console'
  const actor =
    scope === 'console'
      ? requireAuthenticatedActor(getRequestActor(options.c))
      : getRequestActor(options.c)

  if (scope === 'console' && actor) {
    requireActiveOrganization(actor)
  } else if (scope === 'explorer') {
    ensureExplorerAccessEnabled(actor)
  }

  const accessRecord = await readAccessRecord(
    options.resource,
    options.resourceId,
  )

  if (!accessRecord) {
    throw options.notFoundError()
  }

  const allowed =
    scope === 'console'
      ? actor !== null && canReadInConsole(actor, accessRecord)
      : canReadInExplorer(actor, accessRecord)

  if (!allowed) {
    throw options.notFoundError()
  }

  return accessRecord
}

export const assertResourceWritable = async (options: {
  c: AppContext
  resource: PermissionResourceType
  resourceId: string
  notFoundError: () => ServerError
}): Promise<AccessRecord> => {
  const actor = requireAuthenticatedActor(getRequestActor(options.c))
  const activeOrganizationId = requireActiveOrganization(actor)
  const accessRecord = await readAccessRecord(
    options.resource,
    options.resourceId,
  )

  if (!accessRecord || accessRecord.organizationId !== activeOrganizationId) {
    throw options.notFoundError()
  }

  assertCanWriteResource({
    actor,
    resource: options.resource,
    ownerUserId: accessRecord.createdByUserId,
  })

  return accessRecord
}

export const authMiddlewareOptionsDefaults = {
  scope: 'console',
} as const

export const runAuthorizationMiddleware = async (
  c: AppContext,
  permission: string,
  next: () => Promise<void>,
  scope: RouteAccessScope,
  targetResource?: PermissionResourceType,
  skipResourceCheck = false,
) => {
  const parsedPermission = parsePermission(permission)
  const actor = getRequestActor(c)
  const authorizationResource = targetResource ?? parsedPermission.resource
  const resourceId = getRequestResourceId(c)
  let accessRecord: AccessRecord | null = null

  try {
    if (scope === 'console') {
      const authenticatedActor = requireAuthenticatedActor(actor)
      requireActiveOrganization(authenticatedActor)

      if (logResourceTypes.has(parsedPermission.resource)) {
        assertCanAccessLogs(authenticatedActor)
      }

      if (parsedPermission.action === 'write') {
        assertCanWriteResource({
          actor: authenticatedActor,
          resource: parsedPermission.resource,
        })
      }
    } else if (parsedPermission.action === 'read') {
      ensureExplorerAccessEnabled(actor)
    } else {
      const authenticatedActor = requireAuthenticatedActor(actor)
      requireActiveOrganization(authenticatedActor)
      assertCanWriteResource({
        actor: authenticatedActor,
        resource: parsedPermission.resource,
      })
    }

    if (resourceId && !skipResourceCheck) {
      if (parsedPermission.action === 'read') {
        accessRecord = await assertResourceReadable({
          c,
          resource: authorizationResource,
          resourceId,
          scope,
          notFoundError: () => buildNotFoundError(authorizationResource),
        })
      } else {
        accessRecord = await assertResourceWritable({
          c,
          resource: authorizationResource,
          resourceId,
          notFoundError: () => buildNotFoundError(authorizationResource),
        })
      }
    }

    await next()

    await persistDecisionLog({
      actor,
      c,
      decision: 'allow',
      permission,
      resourceId,
      statusCode: c.res.status,
      targetOrganizationId:
        accessRecord?.organizationId ?? actor?.activeOrganizationId ?? null,
    })
  } catch (error) {
    if (error instanceof ServerError) {
      const statusCode = error.response.statusCode

      if (
        statusCode === 401 ||
        statusCode === 403 ||
        (parsedPermission.action === 'read' && statusCode === 404)
      ) {
        await persistDecisionLog({
          actor,
          c,
          decision: 'deny',
          permission,
          resourceId,
          statusCode,
          targetOrganizationId:
            accessRecord?.organizationId ?? actor?.activeOrganizationId ?? null,
        })
      }
    }

    throw error
  }
}
