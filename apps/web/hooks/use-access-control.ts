'use client'

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { z } from 'zod'
import { useConfig } from '~/components/providers'
import { useApiClient } from './use-api-client'
import { useAuthClient } from './use-auth-client'
import { Client, unwrapResponse } from '~/utils/api-client'
import {
  activeMemberSchema,
  buildSessionAccess,
  ConsoleResource,
  getResourceOrganizationId,
  OrganizationSummary,
  OrganizationRole,
  organizationRoleSchema,
  organizationSummarySchema,
  SessionAccess,
  requiresActiveOrganizationSwitchForWrite,
} from '~/utils/access-control'

const organizationListSchema = z.array(organizationSummarySchema)
const organizationRoleResponseSchema = z.object({
  role: organizationRoleSchema,
})

const fetchAuthEndpoint = async (
  apiBaseUrl: string,
  path: string,
): Promise<unknown | null> => {
  const response = await fetch(`${apiBaseUrl}/api/auth${path}`, {
    credentials: 'include',
  })

  if (!response.ok) {
    return null
  }

  return response.json()
}

const fetchSuperAdminOrganizations = async (
  client: Client,
): Promise<OrganizationSummary[]> => {
  const payload = await unwrapResponse(client.api.v0.organization.$get())

  return payload.data.map((organization) => ({
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
  }))
}

export const useAccessControl = () => {
  const { apiBaseUrl } = useConfig()
  const apiClient = useApiClient()
  const authClient = useAuthClient()
  const session = authClient.useSession()
  const isSuperAdmin = session.data?.user?.role === 'super_admin'
  const isAuthenticated =
    session.data?.user !== null && session.data?.user !== undefined

  const activeMemberQuery = useQuery({
    queryKey: [
      'access-control',
      'active-member',
      session.data?.session.activeOrganizationId ?? null,
    ],
    enabled: isAuthenticated && !isSuperAdmin,
    queryFn: async () => {
      const payload = await fetchAuthEndpoint(
        apiBaseUrl,
        '/organization/get-active-member',
      )
      const parsed = activeMemberSchema.safeParse(payload)

      return parsed.success ? parsed.data : null
    },
  })

  const organizationListQuery = useQuery({
    queryKey: ['access-control', 'organizations', 'member'],
    enabled: isAuthenticated && !isSuperAdmin,
    queryFn: async () => {
      const payload = await fetchAuthEndpoint(apiBaseUrl, '/organization/list')
      const parsed = organizationListSchema.safeParse(payload)

      return parsed.success ? parsed.data : []
    },
  })

  const superAdminOrganizationsQuery = useQuery({
    queryKey: ['access-control', 'organizations', 'super-admin'],
    enabled: isAuthenticated && isSuperAdmin,
    queryFn: async () => fetchSuperAdminOrganizations(apiClient),
  })

  const parsedActiveMember = useMemo(() => {
    if (isSuperAdmin) {
      return null
    }

    return activeMemberQuery.data ?? null
  }, [activeMemberQuery.data, isSuperAdmin])

  const parsedOrganizations = useMemo(() => {
    if (isSuperAdmin) {
      return superAdminOrganizationsQuery.data ?? []
    }

    return organizationListQuery.data ?? []
  }, [
    isSuperAdmin,
    organizationListQuery.data,
    superAdminOrganizationsQuery.data,
  ])

  const parsedActiveOrganization = useMemo(() => {
    const activeOrganizationId = session.data?.session.activeOrganizationId

    if (!activeOrganizationId) {
      return null
    }

    return (
      parsedOrganizations.find(
        (organization) => organization.id === activeOrganizationId,
      ) ?? null
    )
  }, [parsedOrganizations, session.data?.session.activeOrganizationId])

  const refetchSuperAdminOrganizationState = async () => {
    const [, organizationResult] = await Promise.all([
      session.refetch(),
      superAdminOrganizationsQuery.refetch(),
    ])

    return organizationResult
  }

  const access = useMemo(
    () =>
      buildSessionAccess({
        user: session.data?.user ?? null,
        activeMember: parsedActiveMember,
        activeOrganization: parsedActiveOrganization,
      }),
    [parsedActiveMember, parsedActiveOrganization, session.data?.user],
  )

  return {
    access,
    activeMember: isSuperAdmin
      ? {
          ...superAdminOrganizationsQuery,
          data: null,
          refetch: refetchSuperAdminOrganizationState,
        }
      : {
          ...activeMemberQuery,
          data: parsedActiveMember,
        },
    activeOrganization: isSuperAdmin
      ? {
          ...superAdminOrganizationsQuery,
          data: parsedActiveOrganization,
          refetch: refetchSuperAdminOrganizationState,
        }
      : {
          ...organizationListQuery,
          data: parsedActiveOrganization,
        },
    organizations: isSuperAdmin
      ? {
          ...superAdminOrganizationsQuery,
          data: parsedOrganizations,
        }
      : {
          ...organizationListQuery,
          data: parsedOrganizations,
        },
    session,
  }
}

export const useRequiresActiveOrganizationSwitchForWrite = (input: {
  access: SessionAccess
  createdByUserId?: string | null
  resource: ConsoleResource
  resourceData: unknown
}): boolean => {
  const { apiBaseUrl } = useConfig()
  const resourceOrganizationId = getResourceOrganizationId(input.resourceData)
  const activeOrganizationId = input.access.activeOrganization?.id
  const shouldCheckOrganizationRole =
    input.access.isAuthenticated &&
    !input.access.isSuperAdmin &&
    typeof resourceOrganizationId === 'string' &&
    resourceOrganizationId !== activeOrganizationId

  const organizationRoleQuery = useQuery({
    queryKey: [
      'access-control',
      'organization-role',
      resourceOrganizationId ?? null,
    ],
    enabled: shouldCheckOrganizationRole,
    queryFn: async (): Promise<OrganizationRole | null> => {
      if (!resourceOrganizationId) {
        return null
      }

      const query = new URLSearchParams({
        organizationId: resourceOrganizationId,
      })
      const payload = await fetchAuthEndpoint(
        apiBaseUrl,
        `/organization/get-active-member-role?${query.toString()}`,
      )
      const parsed = organizationRoleResponseSchema.safeParse(payload)

      return parsed.success ? parsed.data.role : null
    },
  })

  return requiresActiveOrganizationSwitchForWrite({
    access: input.access,
    createdByUserId: input.createdByUserId,
    resource: input.resource,
    resourceData: input.resourceData,
    resourceOrganizationRole: organizationRoleQuery.data ?? null,
  })
}
