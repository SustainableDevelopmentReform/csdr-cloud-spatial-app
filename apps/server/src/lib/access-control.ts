import { createAccessControl } from 'better-auth/plugins/access'

export const appVisibilityValues = ['private', 'public', 'global'] as const
export type AppVisibility = (typeof appVisibilityValues)[number]

export const appAdminStatements = {
  user: [
    'create',
    'list',
    'set-role',
    'ban',
    'impersonate',
    'delete',
    'set-password',
    'get',
    'update',
  ],
  session: ['list', 'revoke', 'delete'],
} as const

export const appAdminAccessControl = createAccessControl(appAdminStatements)

export const appAdminRoles = {
  user: appAdminAccessControl.newRole({
    user: [],
    session: [],
  }),
  super_admin: appAdminAccessControl.newRole({
    user: [
      'create',
      'list',
      'set-role',
      'ban',
      'impersonate',
      'delete',
      'set-password',
      'get',
      'update',
    ],
    session: ['list', 'revoke', 'delete'],
  }),
}

export const appOrganizationRoleValues = [
  'org_viewer',
  'org_creator',
  'org_admin',
] as const

export type AppOrganizationRole = (typeof appOrganizationRoleValues)[number]

export const appOrganizationStatements = {
  organization: ['update'],
  member: ['create', 'update', 'delete'],
  invitation: ['create', 'cancel'],
} as const

export const appOrganizationAccessControl = createAccessControl(
  appOrganizationStatements,
)

const createEmptyOrganizationRole = () =>
  appOrganizationAccessControl.newRole({
    organization: [],
    member: [],
    invitation: [],
  })

const orgAdminRole = appOrganizationAccessControl.newRole({
  organization: ['update'],
  member: ['create', 'update', 'delete'],
  invitation: ['create', 'cancel'],
})

export const appOrganizationRoles = {
  org_viewer: createEmptyOrganizationRole(),
  org_creator: createEmptyOrganizationRole(),
  org_admin: orgAdminRole,
}

const appOrganizationRoleRank = {
  org_viewer: 0,
  org_creator: 1,
  org_admin: 2,
} satisfies Record<AppOrganizationRole, number>

const isAppOrganizationRole = (role: string): role is AppOrganizationRole => {
  switch (role) {
    case 'org_viewer':
    case 'org_creator':
    case 'org_admin':
      return true
    default:
      return false
  }
}

export const parseOrganizationRoles = (
  rawRole: string | null | undefined,
): AppOrganizationRole[] =>
  rawRole
    ? rawRole
        .split(',')
        .map((role) => role.trim())
        .filter(isAppOrganizationRole)
    : []

export const getHighestOrganizationRole = (
  rawRole: string | null | undefined,
): AppOrganizationRole | null => {
  const roles = parseOrganizationRoles(rawRole)

  const [firstRole, ...remainingRoles] = roles

  if (!firstRole) {
    return null
  }

  return remainingRoles.reduce<AppOrganizationRole>(
    (highestRole, currentRole) =>
      appOrganizationRoleRank[currentRole] >
      appOrganizationRoleRank[highestRole]
        ? currentRole
        : highestRole,
    firstRole,
  )
}

export const hasAtLeastOrganizationRole = (
  rawRole: string | null | undefined,
  requiredRole: AppOrganizationRole,
): boolean => {
  const highestRole = getHighestOrganizationRole(rawRole)

  if (!highestRole) {
    return false
  }

  return (
    appOrganizationRoleRank[highestRole] >=
    appOrganizationRoleRank[requiredRole]
  )
}

export const isSuperAdminRole = (rawRole: string | null | undefined): boolean =>
  rawRole === 'super_admin'
