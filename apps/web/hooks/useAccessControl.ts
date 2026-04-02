'use client'

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useConfig } from '~/components/providers'
import { useAuthClient } from './useAuthClient'
import {
  activeMemberSchema,
  buildSessionAccess,
  organizationSummarySchema,
} from '~/utils/access-control'
import { z } from 'zod'

export const useAccessControl = () => {
  const { apiBaseUrl } = useConfig()
  const authClient = useAuthClient()
  const session = authClient.useSession()
  const activeMember = authClient.useActiveMember()
  const activeOrganization = authClient.useActiveOrganization()
  const organizations = authClient.useListOrganizations()
  const isSuperAdmin = session.data?.user?.role === 'super_admin'
  const organizationsSchema = useMemo(
    () => z.array(organizationSummarySchema),
    [],
  )
  const superAdminOrganizationSchema = useMemo(
    () =>
      organizationSummarySchema.extend({
        createdAt: z.string(),
        memberCount: z.number().int(),
      }),
    [],
  )
  const superAdminOrganizationsQuery = useQuery({
    queryKey: ['access-control', 'organizations', 'super-admin'],
    enabled: isSuperAdmin,
    queryFn: async () => {
      const response = await fetch(`${apiBaseUrl}/api/v0/organization`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to load organizations')
      }

      const payload = await response.json()
      const parsed = z
        .object({
          data: z.array(superAdminOrganizationSchema),
        })
        .parse(payload)

      return parsed.data.map((currentOrganization) =>
        organizationSummarySchema.parse(currentOrganization),
      )
    },
  })

  const parsedActiveMember = useMemo(() => {
    const parsed = activeMemberSchema.safeParse(activeMember.data)
    return parsed.success ? parsed.data : null
  }, [activeMember.data])

  const parsedActiveOrganization = useMemo(() => {
    const parsed = organizationSummarySchema.safeParse(activeOrganization.data)
    return parsed.success ? parsed.data : null
  }, [activeOrganization.data])

  const parsedOrganizations = useMemo(() => {
    if (isSuperAdmin) {
      return superAdminOrganizationsQuery.data ?? []
    }

    const parsed = organizationsSchema.safeParse(organizations.data)
    return parsed.success ? parsed.data : []
  }, [
    isSuperAdmin,
    organizations.data,
    organizationsSchema,
    superAdminOrganizationsQuery.data,
  ])

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
    activeMember: {
      ...activeMember,
      data: parsedActiveMember,
    },
    activeOrganization: {
      ...activeOrganization,
      data: parsedActiveOrganization,
    },
    organizations: isSuperAdmin
      ? {
          ...superAdminOrganizationsQuery,
          data: parsedOrganizations,
        }
      : {
          ...organizations,
          data: parsedOrganizations,
        },
    session,
  }
}
