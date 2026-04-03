import { visibilitySchema } from '@repo/schemas/crud'
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

export type ResourceVisibility = z.infer<typeof visibilitySchema>

export const visibilityImpactResourceTypeSchema = z.enum([
  'dataset',
  'geometries',
  'product',
  'indicator',
  'derivedIndicator',
  'report',
  'dashboard',
])

export type VisibilityImpactResourceType = z.infer<
  typeof visibilityImpactResourceTypeSchema
>

export const visibilityImpactResourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  resourceType: visibilityImpactResourceTypeSchema,
  visibility: visibilitySchema,
})

export const visibilityImpactExternalCountSchema = z.object({
  resourceType: visibilityImpactResourceTypeSchema,
  count: z.number().int().min(1),
})

export const visibilityImpactCodeSchema = z.enum([
  'private_upstream_dependencies',
  'missing_main_run_output_summary',
  'externally_visible_dependents',
])

export const visibilityImpactEntrySchema = z.object({
  code: visibilityImpactCodeSchema,
  message: z.string(),
  resources: z.array(visibilityImpactResourceSchema),
  externalCounts: z.array(visibilityImpactExternalCountSchema),
})

export const visibilityImpactSchema = z.object({
  canApply: z.boolean(),
  blockingIssues: z.array(visibilityImpactEntrySchema),
  warnings: z.array(visibilityImpactEntrySchema),
})

export const visibilityImpactResponseSchema = z.object({
  data: visibilityImpactSchema,
})

export type VisibilityImpactResource = z.infer<
  typeof visibilityImpactResourceSchema
>
export type VisibilityImpactExternalCount = z.infer<
  typeof visibilityImpactExternalCountSchema
>
export type VisibilityImpactEntry = z.infer<typeof visibilityImpactEntrySchema>
export type VisibilityImpact = z.infer<typeof visibilityImpactSchema>

export type ConsoleResource =
  | 'dashboard'
  | 'dataset'
  | 'geometries'
  | 'indicator'
  | 'indicatorCategory'
  | 'product'
  | 'report'

const collaborativeResources = new Set<ConsoleResource>(['dashboard', 'report'])
const nestedOrganizationResourceKeys = [
  'dataset',
  'datasetRun',
  'geometries',
  'geometriesRun',
  'geometryOutput',
  'product',
  'productRun',
] as const

const organizationRoleLabels: Record<OrganizationRole, string> = {
  org_admin: 'Org admin',
  org_creator: 'Org creator',
  org_viewer: 'Org viewer',
}

const globalUserRoleLabels: Record<GlobalUserRole, string> = {
  super_admin: 'Super admin',
  user: 'User',
}

const allVisibilityOptions: ResourceVisibility[] = [...visibilitySchema.options]
const orgAdminVisibilityOptions: ResourceVisibility[] = ['private', 'public']

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const getRecordProperty = (value: unknown, key: string): unknown => {
  if (!isRecord(value)) {
    return undefined
  }

  return value[key]
}

const getStringProperty = (value: unknown, key: string): string | undefined => {
  const property = getRecordProperty(value, key)

  return typeof property === 'string' ? property : undefined
}

export const getResourceOrganizationId = (
  resource: unknown,
): string | undefined => {
  if (!isRecord(resource)) {
    return undefined
  }

  const organizationId = getStringProperty(resource, 'organizationId')

  if (organizationId) {
    return organizationId
  }

  for (const key of nestedOrganizationResourceKeys) {
    const nestedOrganizationId = getResourceOrganizationId(
      getRecordProperty(resource, key),
    )

    if (nestedOrganizationId) {
      return nestedOrganizationId
    }
  }

  return undefined
}

const belongsToActiveOrganization = (
  access: SessionAccess,
  resource: unknown,
): boolean => {
  const activeOrganizationId = access.activeOrganization?.id
  const resourceOrganizationId = getResourceOrganizationId(resource)

  return (
    typeof activeOrganizationId === 'string' &&
    resourceOrganizationId === activeOrganizationId
  )
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

export const canManageConsoleChildResource = (input: {
  access: SessionAccess
  resourceData: unknown
}): boolean =>
  input.access.isSuperAdmin ||
  (input.access.isOrgAdmin &&
    belongsToActiveOrganization(input.access, input.resourceData))

export const canEditConsoleResource = (input: {
  access: SessionAccess
  createdByUserId?: string | null
  resource: ConsoleResource
  resourceData: unknown
}): boolean => {
  if (input.access.isSuperAdmin) {
    return true
  }

  if (!belongsToActiveOrganization(input.access, input.resourceData)) {
    return false
  }

  const createdByUserId =
    input.createdByUserId ?? getCreatedByUserId(input.resourceData)

  if (collaborativeResources.has(input.resource)) {
    if (input.access.isOrgAdmin) {
      return true
    }

    return (
      input.access.isOrgCreator &&
      createdByUserId !== null &&
      createdByUserId !== undefined &&
      createdByUserId === input.access.userId
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
  visibility: ResourceVisibility | null | undefined,
): string => {
  switch (visibility) {
    case 'global':
      return 'Global'
    case 'public':
      return 'Public'
    case 'private':
    case null:
    case undefined:
      return 'Private'
    default: {
      const exhaustiveCheck: never = visibility
      return exhaustiveCheck
    }
  }
}

export const getConsoleResourceVisibilityOptions = (input: {
  access: SessionAccess
  currentVisibility: ResourceVisibility
  resourceData: unknown
}): ResourceVisibility[] => {
  if (input.access.isSuperAdmin) {
    return allVisibilityOptions
  }

  if (!belongsToActiveOrganization(input.access, input.resourceData)) {
    return []
  }

  if (!input.access.isOrgAdmin) {
    return []
  }

  if (input.currentVisibility === 'global') {
    return ['global']
  }

  return orgAdminVisibilityOptions
}

export const canChangeConsoleResourceVisibility = (input: {
  access: SessionAccess
  currentVisibility: ResourceVisibility
  resourceData: unknown
}): boolean => {
  if (input.access.isSuperAdmin) {
    return true
  }

  return (
    input.access.isOrgAdmin &&
    belongsToActiveOrganization(input.access, input.resourceData) &&
    input.currentVisibility !== 'global'
  )
}

export const getConsoleResourceVisibilityDescription = (input: {
  access: SessionAccess
  currentVisibility: ResourceVisibility
  resourceData: unknown
}): string => {
  if (input.access.isSuperAdmin) {
    return 'Private keeps the resource inside its organization. Public makes it readable to anyone. Global also lists it in every organization and the public explorer.'
  }

  if (!belongsToActiveOrganization(input.access, input.resourceData)) {
    return 'Only the owning organization can change resource visibility.'
  }

  if (input.access.isOrgAdmin && input.currentVisibility !== 'global') {
    return 'Private keeps the resource inside its organization. Public makes it readable to anyone.'
  }

  return 'This resource is global. Only super admins can change global visibility.'
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
