'use client'

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query'
import { useConfig } from '~/components/providers'
import { useAuthClient } from '~/hooks/useAuthClient'

const getSwitchOrganizationErrorMessage = (payload: unknown): string => {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'message' in payload &&
    typeof payload.message === 'string'
  ) {
    return payload.message
  }

  return 'Failed to switch organization'
}

const setSuperAdminActiveOrganization = async (
  apiBaseUrl: string,
  organizationId: string,
): Promise<void> => {
  const response = await fetch(`${apiBaseUrl}/api/v0/organization/active`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      organizationId,
    }),
  })

  if (response.ok) {
    return
  }

  const payload = await response.json().catch(() => null)
  throw new Error(getSwitchOrganizationErrorMessage(payload))
}

export const useSwitchOrganization = (
  isSuperAdmin: boolean,
): UseMutationResult<void, Error, string> => {
  const { apiBaseUrl } = useConfig()
  const authClient = useAuthClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (organizationId: string) => {
      if (isSuperAdmin) {
        await setSuperAdminActiveOrganization(apiBaseUrl, organizationId)
      } else {
        const response = await authClient.organization.setActive({
          organizationId,
        })

        if (response.error) {
          throw new Error(
            response.error.message ?? 'Failed to switch organization',
          )
        }
      }

      const sessionResponse = await authClient.getSession()

      if (sessionResponse.error) {
        throw new Error(
          sessionResponse.error.message ?? 'Failed to refresh session',
        )
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries()
    },
  })
}
