import { z } from 'zod'

export const organizationRoleSchema = z.enum([
  'org_viewer',
  'org_creator',
  'org_admin',
])

export type OrganizationRole = z.infer<typeof organizationRoleSchema>

export const globalUserRoleSchema = z.enum(['user', 'super_admin'])

export type GlobalUserRole = z.infer<typeof globalUserRoleSchema>

export const organizationSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  logo: z.string().nullable().optional(),
})

export const activeMemberSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  userId: z.string(),
  role: organizationRoleSchema,
  createdAt: z.union([z.string(), z.date()]).optional(),
})

export type OrganizationSummary = z.infer<typeof organizationSummarySchema>
export type ActiveMember = z.infer<typeof activeMemberSchema>

export type SessionAccess = {
  activeMember: ActiveMember | null
  activeOrganization: OrganizationSummary | null
  isAuthenticated: boolean
  isOrgAdmin: boolean
  isOrgCreator: boolean
  isOrgViewer: boolean
  isSuperAdmin: boolean
  organizationRole: OrganizationRole | null
  userId: string | null
}

export type ConsoleResource =
  | 'dashboard'
  | 'dataset'
  | 'geometries'
  | 'indicator'
  | 'indicatorCategory'
  | 'product'
  | 'report'

const collaborativeResources = new Set<ConsoleResource>(['dashboard', 'report'])

const organizationRoleLabels: Record<OrganizationRole, string> = {
  org_admin: 'Org admin',
  org_creator: 'Org creator',
  org_viewer: 'Org viewer',
}

const globalUserRoleLabels: Record<GlobalUserRole, string> = {
  super_admin: 'Super admin',
  user: 'User',
}

export const buildSessionAccess = (input: {
  activeMember: ActiveMember | null
  activeOrganization: OrganizationSummary | null
  user: {
    id: string
    role?: string | null
  } | null
}): SessionAccess => {
  const isSuperAdmin = input.user?.role === 'super_admin'
  const organizationRole = input.activeMember?.role ?? null

  return {
    userId: input.user?.id ?? null,
    activeMember: input.activeMember,
    activeOrganization: input.activeOrganization,
    organizationRole,
    isAuthenticated: input.user !== null,
    isSuperAdmin,
    isOrgAdmin: organizationRole === 'org_admin',
    isOrgCreator: organizationRole === 'org_creator',
    isOrgViewer: organizationRole === 'org_viewer',
  }
}

export const canAccessConsole = (access: SessionAccess): boolean =>
  access.isAuthenticated

export const canManageWorkspace = (access: SessionAccess): boolean =>
  access.isSuperAdmin || access.isOrgAdmin

export const canViewLogs = (access: SessionAccess): boolean =>
  access.isSuperAdmin || access.isOrgAdmin

export const canCreateConsoleResource = (
  access: SessionAccess,
  resource: ConsoleResource,
): boolean => {
  if (access.isSuperAdmin) {
    return true
  }

  if (collaborativeResources.has(resource)) {
    return access.isOrgAdmin || access.isOrgCreator
  }

  return access.isOrgAdmin
}

export const canEditConsoleResource = (input: {
  access: SessionAccess
  createdByUserId?: string | null
  resource: ConsoleResource
}): boolean => {
  if (input.access.isSuperAdmin) {
    return true
  }

  if (collaborativeResources.has(input.resource)) {
    if (input.access.isOrgAdmin) {
      return true
    }

    return (
      input.access.isOrgCreator &&
      input.createdByUserId !== null &&
      input.createdByUserId !== undefined &&
      input.createdByUserId === input.access.userId
    )
  }

  return input.access.isOrgAdmin
}

export const formatOrganizationRole = (
  role: OrganizationRole | null | undefined,
): string => {
  if (!role) {
    return 'No active role'
  }

  return organizationRoleLabels[role]
}

export const formatGlobalUserRole = (
  role: GlobalUserRole | null | undefined,
): string => {
  if (!role) {
    return 'User'
  }

  return globalUserRoleLabels[role]
}

export const formatVisibility = (
  visibility: 'private' | 'public' | null | undefined,
): string => {
  if (!visibility) {
    return 'Private'
  }

  return visibility === 'public' ? 'Public' : 'Private'
}

export const getCreatedByUserId = (resource: unknown): string | undefined => {
  if (
    typeof resource === 'object' &&
    resource !== null &&
    'createdByUserId' in resource
  ) {
    const createdByUserId = resource.createdByUserId

    return typeof createdByUserId === 'string' ? createdByUserId : undefined
  }

  return undefined
}

export const roleMatches = (access: SessionAccess, role: string): boolean => {
  switch (role) {
    case 'user':
      return access.isAuthenticated
    case 'admin':
    case 'super_admin':
      return access.isSuperAdmin
    case 'org_admin':
      return access.isOrgAdmin || access.isSuperAdmin
    case 'org_creator':
      return access.isOrgCreator || access.isOrgAdmin || access.isSuperAdmin
    case 'org_viewer':
      return canAccessConsole(access)
    default:
      return false
  }
}
