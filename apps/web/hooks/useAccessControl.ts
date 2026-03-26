'use client'

import { useMemo } from 'react'
import { useAuthClient } from './useAuthClient'
import {
  activeMemberSchema,
  buildSessionAccess,
  organizationSummarySchema,
} from '~/utils/access-control'
import { z } from 'zod'

export const useAccessControl = () => {
  const authClient = useAuthClient()
  const session = authClient.useSession()
  const activeMember = authClient.useActiveMember()
  const activeOrganization = authClient.useActiveOrganization()
  const organizations = authClient.useListOrganizations()
  const organizationsSchema = useMemo(
    () => z.array(organizationSummarySchema),
    [],
  )

  const parsedActiveMember = useMemo(() => {
    const parsed = activeMemberSchema.safeParse(activeMember.data)
    return parsed.success ? parsed.data : null
  }, [activeMember.data])

  const parsedActiveOrganization = useMemo(() => {
    const parsed = organizationSummarySchema.safeParse(activeOrganization.data)
    return parsed.success ? parsed.data : null
  }, [activeOrganization.data])

  const parsedOrganizations = useMemo(() => {
    const parsed = organizationsSchema.safeParse(organizations.data)
    return parsed.success ? parsed.data : []
  }, [organizations.data, organizationsSchema])

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
    organizations: {
      ...organizations,
      data: parsedOrganizations,
    },
    session,
  }
}
