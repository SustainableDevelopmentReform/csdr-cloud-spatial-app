import { AppMember, AppSession, AppSessionUser } from './auth'
import {
  AppOrganizationRole,
  getHighestOrganizationRole,
  isSuperAdminRole,
} from './access-control'
import { db } from './db'
import { ServerError } from './error'

const ACTIVE_ORGANIZATION_HEADERS = [
  'x-csdr-active-organization-id',
  'x-organization-id',
] as const

export type RequestActor = {
  user: AppSessionUser
  session: AppSession
  memberships: AppMember[]
  activeMember: AppMember | null
  activeOrganizationId: string | null
  organizationRole: AppOrganizationRole | null
  isSuperAdmin: boolean
  twoFactorEnabled: boolean
}

const getRequestedActiveOrganizationId = (headers: Headers): string | null => {
  for (const headerName of ACTIVE_ORGANIZATION_HEADERS) {
    const headerValue = headers.get(headerName)

    if (headerValue) {
      return headerValue
    }
  }

  return null
}

export const loadRequestActor = async (input: {
  headers: Headers
  user: AppSessionUser | null
  session: AppSession | null
}): Promise<RequestActor | null> => {
  const user = input.user
  const session = input.session

  if (!user || !session) {
    return null
  }

  const [memberships, persistedSession, persistedUser] = await Promise.all([
    db.query.member.findMany({
      where: (member, { eq }) => eq(member.userId, user.id),
      orderBy: (member, { asc }) => asc(member.createdAt),
    }),
    db.query.session.findFirst({
      columns: {
        activeOrganizationId: true,
      },
      where: (table, { eq }) => eq(table.id, session.id),
    }),
    db.query.user.findFirst({
      columns: {
        twoFactorEnabled: true,
      },
      where: (table, { eq }) => eq(table.id, user.id),
    }),
  ])

  const requestedActiveOrganizationId =
    getRequestedActiveOrganizationId(input.headers) ??
    persistedSession?.activeOrganizationId ??
    null

  const fallbackMembership = memberships[0] ?? null
  const activeMember =
    memberships.find(
      (member) => member.organizationId === requestedActiveOrganizationId,
    ) ?? fallbackMembership

  const activeOrganizationId =
    requestedActiveOrganizationId ?? activeMember?.organizationId ?? null

  return {
    user,
    session,
    memberships,
    activeMember,
    activeOrganizationId,
    organizationRole: getHighestOrganizationRole(activeMember?.role ?? null),
    isSuperAdmin: isSuperAdminRole(user.role),
    twoFactorEnabled: persistedUser?.twoFactorEnabled === true,
  }
}

export const requireAuthenticatedActor = (
  actor: RequestActor | null,
): RequestActor => {
  if (!actor) {
    throw new ServerError({
      statusCode: 401,
      message: 'User is not authenticated',
    })
  }

  return actor
}

export const requireActiveOrganization = (actor: RequestActor): string => {
  if (!actor.activeOrganizationId) {
    throw new ServerError({
      statusCode: 403,
      message: 'No active organization selected',
      description:
        'Select an active organization before accessing organization-scoped resources.',
    })
  }

  return actor.activeOrganizationId
}

export const requireOrganizationMembership = (
  actor: RequestActor,
  organizationId: string,
): AppMember => {
  if (actor.isSuperAdmin) {
    if (
      actor.activeMember &&
      actor.activeMember.organizationId === organizationId
    ) {
      return actor.activeMember
    }

    throw new ServerError({
      statusCode: 403,
      message: 'User is not authorized',
      description:
        'Super admins must select the target organization as active before performing this action.',
    })
  }

  const membership = actor.memberships.find(
    (member) => member.organizationId === organizationId,
  )

  if (!membership) {
    throw new ServerError({
      statusCode: 403,
      message: 'User is not authorized',
    })
  }

  return membership
}

export const requireMfaIfNeeded = (actor: RequestActor): void => {
  const mfaRequired =
    actor.isSuperAdmin || actor.organizationRole === 'org_admin'

  if (mfaRequired && !actor.twoFactorEnabled) {
    throw new ServerError({
      statusCode: 403,
      message: 'Two-factor authentication is required',
      description:
        'Enable two-factor authentication before performing this action.',
    })
  }
}
