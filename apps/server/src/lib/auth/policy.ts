import { APIError } from 'better-auth/api'
import { sql } from 'drizzle-orm'
import { db } from '../db'
import { ServerError } from '../error'
import { getHighestOrganizationRole } from './access-control'
import {
  type RequestActor,
  requireActiveOrganization,
  requireAuthenticatedActor,
  requireMfaIfNeeded,
} from './request-actor'

export type AuthRequestBody = Record<string, unknown> | null
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]
type DbClient = typeof db | DbTransaction

const orgAdminFloorMessage =
  'An organization must keep at least one org admin. Promote another org admin before removing or demoting this member.'

const getStringValue = (body: AuthRequestBody, key: string): string | null => {
  const value = body?.[key]

  return typeof value === 'string' ? value : null
}

const getRequestStringValue = (options: {
  body: AuthRequestBody
  searchParams: URLSearchParams
  key: string
}): string | null =>
  getStringValue(options.body, options.key) ??
  options.searchParams.get(options.key)

const listOrganizationMembersForAdminFloor = async (
  client: DbClient,
  organizationId: string,
) =>
  client.query.member.findMany({
    columns: {
      id: true,
      role: true,
      userId: true,
    },
    where: (member, { eq }) => eq(member.organizationId, organizationId),
  })

const checkOrgAdminFloor = async (options: {
  client: DbClient
  memberId: string
  nextRole: string | null
  organizationId: string
}): Promise<'member-not-found' | 'last-admin' | null> => {
  const organizationMembers = await listOrganizationMembersForAdminFloor(
    options.client,
    options.organizationId,
  )
  const currentMember = organizationMembers.find(
    (member) => member.id === options.memberId,
  )

  if (!currentMember) {
    return 'member-not-found'
  }

  if (getHighestOrganizationRole(currentMember.role) !== 'org_admin') {
    return null
  }

  if (getHighestOrganizationRole(options.nextRole) === 'org_admin') {
    return null
  }

  const orgAdminCount = organizationMembers.filter(
    (member) => getHighestOrganizationRole(member.role) === 'org_admin',
  ).length

  return orgAdminCount <= 1 ? 'last-admin' : null
}

export const ensureOrgAdminFloor = async (options: {
  memberId: string
  nextRole: string | null
  organizationId: string
}): Promise<void> => {
  const violation = await checkOrgAdminFloor({ ...options, client: db })

  if (violation === 'member-not-found') {
    throw new ServerError({
      statusCode: 404,
      message: 'Member not found',
    })
  }

  if (violation === 'last-admin') {
    throw new ServerError({
      statusCode: 400,
      message: orgAdminFloorMessage,
    })
  }
}

export const lockOrganizationAdminFloor = async (
  client: DbClient,
  organizationId: string,
): Promise<void> => {
  await client.execute(
    sql`select pg_advisory_xact_lock(hashtext(${organizationId}))`,
  )
}

export const ensureOrgAdminFloorInTransaction = async (
  client: DbClient,
  options: {
    memberId: string
    nextRole: string | null
    organizationId: string
  },
): Promise<void> => {
  const violation = await checkOrgAdminFloor({ ...options, client })

  if (violation === 'member-not-found') {
    throw new ServerError({
      statusCode: 404,
      message: 'Member not found',
    })
  }

  if (violation === 'last-admin') {
    throw new ServerError({
      statusCode: 400,
      message: orgAdminFloorMessage,
    })
  }
}

export const ensureBetterAuthOrgAdminFloor = async (options: {
  memberId: string
  nextRole: string | null
  organizationId: string
}): Promise<void> => {
  const violation = await checkOrgAdminFloor({ ...options, client: db })

  if (violation === 'member-not-found') {
    throw APIError.fromStatus('BAD_REQUEST', {
      message: 'Member not found.',
    })
  }

  if (violation === 'last-admin') {
    throw APIError.fromStatus('BAD_REQUEST', {
      message: orgAdminFloorMessage,
    })
  }
}

export const requireSuperAdminActor = (
  actor: RequestActor | null,
): RequestActor => {
  const authenticatedActor = requireAuthenticatedActor(actor)

  if (!authenticatedActor.isSuperAdmin) {
    throw new ServerError({
      statusCode: 403,
      message: 'User is not authorized',
    })
  }

  requireMfaIfNeeded(authenticatedActor)

  return authenticatedActor
}

export const resolveSuperAdminOrganizationId = async (options: {
  actor: RequestActor
  organizationId: string | undefined
}): Promise<string> => {
  const organizationId =
    options.organizationId ?? requireActiveOrganization(options.actor)
  const currentOrganization = await db.query.organization.findFirst({
    columns: {
      id: true,
    },
    where: (table, { eq }) => eq(table.id, organizationId),
  })

  if (!currentOrganization) {
    throw new ServerError({
      statusCode: 404,
      message: 'Organization not found',
    })
  }

  return currentOrganization.id
}

export const resolveActorForTargetOrganization = (options: {
  actor: RequestActor
  targetOrganizationId: string
}): RequestActor => {
  const targetMembership =
    options.actor.memberships.find(
      (membership) =>
        membership.organizationId === options.targetOrganizationId,
    ) ?? null
  const targetOrganizationRole = getHighestOrganizationRole(
    targetMembership?.role ?? null,
  )

  return {
    ...options.actor,
    activeMember: targetMembership,
    activeOrganizationId: options.targetOrganizationId,
    organizationRole: targetOrganizationRole,
  }
}

export const requireTargetOrganizationAdmin = (options: {
  actor: RequestActor
  targetOrganizationId: string | null
}): RequestActor => {
  if (!options.targetOrganizationId) {
    throw new ServerError({
      statusCode: 403,
      message: 'No active organization selected',
      description:
        'Select an active organization before accessing organization-scoped resources.',
    })
  }

  const targetActor = resolveActorForTargetOrganization({
    actor: options.actor,
    targetOrganizationId: options.targetOrganizationId,
  })

  if (targetActor.organizationRole !== 'org_admin') {
    throw new ServerError({
      statusCode: 403,
      message: 'User is not authorized',
    })
  }

  return targetActor
}

const resolveExistingOrganizationId = async (
  organizationId: string | null,
): Promise<string | null> => {
  if (!organizationId) {
    return null
  }

  const currentOrganization = await db.query.organization.findFirst({
    columns: {
      id: true,
    },
    where: (table, { eq }) => eq(table.id, organizationId),
  })

  return currentOrganization?.id ?? null
}

const resolveExistingOrganizationSlug = async (
  organizationSlug: string | null,
): Promise<string | null> => {
  if (!organizationSlug) {
    return null
  }

  const currentOrganization = await db.query.organization.findFirst({
    columns: {
      id: true,
    },
    where: (table, { eq }) => eq(table.slug, organizationSlug),
  })

  return currentOrganization?.id ?? null
}

const resolveInvitationOrganizationId = async (
  invitationId: string | null,
): Promise<string | null> => {
  if (!invitationId) {
    return null
  }

  const currentInvitation = await db.query.invitation.findFirst({
    columns: {
      organizationId: true,
    },
    where: (table, { eq }) => eq(table.id, invitationId),
  })

  return currentInvitation?.organizationId ?? null
}

export const resolveAuthTargetOrganizationId = async (options: {
  actor: RequestActor | null
  body: AuthRequestBody
  path: string
  searchParams: URLSearchParams
  invitationTargetPaths: ReadonlySet<string>
  organizationTargetPaths: ReadonlySet<string>
}): Promise<string | null> => {
  if (options.invitationTargetPaths.has(options.path)) {
    return resolveInvitationOrganizationId(
      getRequestStringValue({
        body: options.body,
        key: 'invitationId',
        searchParams: options.searchParams,
      }),
    )
  }

  if (!options.organizationTargetPaths.has(options.path)) {
    return null
  }

  const organizationSlug = getRequestStringValue({
    body: options.body,
    key: 'organizationSlug',
    searchParams: options.searchParams,
  })

  if (organizationSlug) {
    return resolveExistingOrganizationSlug(organizationSlug)
  }

  const requestedOrganizationId = getRequestStringValue({
    body: options.body,
    key: 'organizationId',
    searchParams: options.searchParams,
  })

  if (requestedOrganizationId) {
    return resolveExistingOrganizationId(requestedOrganizationId)
  }

  return options.actor?.sessionActiveOrganizationId ?? null
}

export const getAuthRequestStringValue = getRequestStringValue

export const assertCanGenerateReportPdf = (actor: RequestActor): void => {
  if (actor.isSuperAdmin || actor.organizationRole === 'org_admin') {
    return
  }

  throw new ServerError({
    statusCode: 403,
    message: 'User is not authorized',
    description: 'Only org admins or super admins can generate report PDFs.',
  })
}
