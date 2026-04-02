'use client'

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { z } from 'zod'
import { useConfig } from '~/components/providers'
import { useAuthClient } from './useAuthClient'
import {
  activeMemberSchema,
  buildSessionAccess,
  organizationSummarySchema,
} from '~/utils/access-control'

const organizationListSchema = z.array(organizationSummarySchema)
const superAdminOrganizationSchema = organizationSummarySchema.extend({
  createdAt: z.string(),
  memberCount: z.number().int(),
})
const superAdminOrganizationListResponseSchema = z.object({
  data: z.array(superAdminOrganizationSchema),
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
  apiBaseUrl: string,
): Promise<z.infer<typeof organizationListSchema>> => {
  const response = await fetch(`${apiBaseUrl}/api/v0/organization`, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Failed to load organizations')
  }

  const payload = await response.json()
  const parsed = superAdminOrganizationListResponseSchema.safeParse(payload)

  if (!parsed.success) {
    throw new Error('Failed to parse organizations')
  }

  return parsed.data.data.map((organization) =>
    organizationSummarySchema.parse(organization),
  )
}

export const useAccessControl = () => {
  const { apiBaseUrl } = useConfig()
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

  const activeOrganizationQuery = useQuery({
    queryKey: [
      'access-control',
      'active-organization',
      session.data?.session.activeOrganizationId ?? null,
    ],
    enabled: isAuthenticated && !isSuperAdmin,
    queryFn: async () => {
      const payload = await fetchAuthEndpoint(
        apiBaseUrl,
        '/organization/get-full-organization',
      )
      const parsed = organizationSummarySchema.safeParse(payload)

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
    queryFn: async () => fetchSuperAdminOrganizations(apiBaseUrl),
  })

  const parsedActiveMember = useMemo(() => {
    if (isSuperAdmin) {
      return null
    }

    return activeMemberQuery.data ?? null
  }, [activeMemberQuery.data, isSuperAdmin])

  const parsedActiveOrganization = useMemo(() => {
    if (!isSuperAdmin) {
      return activeOrganizationQuery.data ?? null
    }

    const activeOrganizationId = session.data?.session.activeOrganizationId

    if (!activeOrganizationId) {
      return null
    }

    return (
      (superAdminOrganizationsQuery.data ?? []).find(
        (organization) => organization.id === activeOrganizationId,
      ) ?? null
    )
  }, [
    activeOrganizationQuery.data,
    isSuperAdmin,
    session.data?.session.activeOrganizationId,
    superAdminOrganizationsQuery.data,
  ])

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
          ...activeOrganizationQuery,
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
