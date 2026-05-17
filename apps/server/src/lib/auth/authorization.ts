import type { Context } from 'hono'
import { eq, or } from 'drizzle-orm'
import type { AnyColumn, SQL } from 'drizzle-orm'
import { env } from '~/env'
import type { AppVisibility } from './access-control'
import { persistAccessLog, shouldPersistDeniedDecisionLog } from './access-log'
import type { AuthType } from './index'
import { db } from '../db'
import { ServerError } from '../error'
import {
  type RequestActor,
  requireActiveOrganization,
  requireAuthenticatedActor,
  requireMfaIfNeeded,
} from './request-actor'

const topLevelAclResourceTypes = [
  'dataset',
  'geometries',
  'product',
  'indicatorCategory',
  'indicator',
  'derivedIndicator',
  'report',
  'dashboard',
] as const

type TopLevelAclResourceType = (typeof topLevelAclResourceTypes)[number]

const permissionResourceTypes = [
  ...topLevelAclResourceTypes,
  'datasetRun',
  'geometriesRun',
  'geometryOutput',
  'productRun',
  'productOutput',
  'dataLibrary',
  'auditLog',
] as const

export type PermissionResourceType = (typeof permissionResourceTypes)[number]
type PermissionAction = 'read' | 'write'

export type AuthorizationMiddlewareOptions = {
  allowPublicRead?: boolean
}

type AppContext = Context<{ Variables: AuthType }>

export type AccessRecord = {
  organizationId: string
  createdByUserId: string | null
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
const logResourceTypes = new Set<PermissionResourceType>(['auditLog'])

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
  await persistAccessLog({
    actor: options.actor,
    action: parsedPermission.action,
    decision: options.decision,
    request: options.c.req.raw,
    resourceType: parsedPermission.resource,
    resourceId: options.resourceId ?? getRequestResourceId(options.c),
    statusCode: options.statusCode,
    targetOrganizationId:
      options.targetOrganizationId ??
      options.actor?.activeOrganizationId ??
      null,
    details: {
      permission: options.permission,
      ...(options.c.get('accessLogDetails') ?? {}),
    },
  })
}

const unauthorizedError = (description?: string) =>
  new ServerError({
    statusCode: 403,
    message: 'User is not authorized',
    description,
  })

const ensurePublicReadAccessEnabled = (actor: RequestActor | null): void => {
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
      'Sign in to access public resources or enable anonymous public access.',
  })
}

const isExternallyReadableVisibility = (visibility: AppVisibility): boolean => {
  return visibility !== 'private'
}

export const buildResourceListReadScope = (
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
      throw new Error('Failed to build resource list read scope')
    }

    return scopedWhere
  }

  ensurePublicReadAccessEnabled(actor)

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

const assertCanWriteResource = (options: {
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
    if (
      options.ownerUserId !== undefined &&
      options.ownerUserId !== options.actor.user.id
    ) {
      throw unauthorizedError(
        'Org creators can only manage dashboards and reports they created.',
      )
    }

    return
  }

  throw unauthorizedError()
}

const assertCanAccessLogs = (actor: RequestActor): void => {
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

const readAccessRecord = async (
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
    case 'dataLibrary':
      return null
  }
}

export const canReadAccessRecord = (
  actor: RequestActor | null,
  accessRecord: AccessRecord,
): boolean =>
  isExternallyReadableVisibility(accessRecord.visibility) ||
  actor?.activeOrganizationId === accessRecord.organizationId

export const assertResourceReadable = async (options: {
  c: AppContext
  resource: PermissionResourceType
  resourceId: string
  allowPublicRead?: boolean
  notFoundError: () => ServerError
}): Promise<AccessRecord> => {
  const actor = getRequestActor(options.c)

  if (options.allowPublicRead) {
    ensurePublicReadAccessEnabled(actor)
  } else {
    const authenticatedActor = requireAuthenticatedActor(actor)
    requireActiveOrganization(authenticatedActor)
  }

  const accessRecord = await readAccessRecord(
    options.resource,
    options.resourceId,
  )

  if (!accessRecord) {
    throw options.notFoundError()
  }

  if (!canReadAccessRecord(actor, accessRecord)) {
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

export const runAuthorizationMiddleware = async (
  c: AppContext,
  permission: string,
  next: () => Promise<void>,
  options: AuthorizationMiddlewareOptions = {},
) => {
  const parsedPermission = parsePermission(permission)
  const actor = getRequestActor(c)
  const resourceId = getRequestResourceId(c)

  try {
    if (parsedPermission.action === 'read') {
      if (options.allowPublicRead) {
        ensurePublicReadAccessEnabled(actor)
      } else {
        const authenticatedActor = requireAuthenticatedActor(actor)
        requireActiveOrganization(authenticatedActor)

        if (logResourceTypes.has(parsedPermission.resource)) {
          assertCanAccessLogs(authenticatedActor)
        }
      }
    } else {
      const authenticatedActor = requireAuthenticatedActor(actor)
      requireActiveOrganization(authenticatedActor)
      assertCanWriteResource({
        actor: authenticatedActor,
        resource: parsedPermission.resource,
      })
    }

    await next()

    const statusCode =
      c.error instanceof ServerError
        ? c.error.response.statusCode
        : c.res.status

    if (shouldPersistDeniedDecisionLog(statusCode)) {
      await persistDecisionLog({
        actor,
        c,
        decision: 'deny',
        permission,
        resourceId,
        statusCode,
        targetOrganizationId: actor?.activeOrganizationId ?? null,
      })
      return
    }

    await persistDecisionLog({
      actor,
      c,
      decision: 'allow',
      permission,
      resourceId,
      statusCode,
      targetOrganizationId: actor?.activeOrganizationId ?? null,
    })
  } catch (error) {
    if (error instanceof ServerError) {
      const statusCode = error.response.statusCode

      if (shouldPersistDeniedDecisionLog(statusCode)) {
        await persistDecisionLog({
          actor,
          c,
          decision: 'deny',
          permission,
          resourceId,
          statusCode,
          targetOrganizationId: actor?.activeOrganizationId ?? null,
        })
      }
    }

    throw error
  }
}
