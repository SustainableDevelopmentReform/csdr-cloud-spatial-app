'use client'

import { toast } from '@repo/ui/components/ui/sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/ui/select'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { useConfig } from '../../../components/providers'
import { useAccessControl } from '../../../hooks/useAccessControl'
import { useAuthClient } from '../../../hooks/useAuthClient'

export const OrgSwitcher = () => {
  const { apiBaseUrl } = useConfig()
  const authClient = useAuthClient()
  const router = useRouter()
  const { access, activeOrganization, organizations, session } =
    useAccessControl()
  const [isPending, startTransition] = useTransition()

  const organizationsData = organizations.data ?? []

  if (organizationsData.length === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-500">Organization</span>
      <Select
        disabled={isPending}
        value={activeOrganization.data?.id}
        onValueChange={(organizationId) => {
          const switchOrganization = access.isSuperAdmin
            ? fetch(`${apiBaseUrl}/api/v0/organization/active`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                  'content-type': 'application/json',
                },
                body: JSON.stringify({
                  organizationId,
                }),
              }).then(async (response) => {
                if (response.ok) {
                  return null
                }

                const payload = await response.json().catch(() => null)
                const message =
                  payload &&
                  typeof payload === 'object' &&
                  'message' in payload &&
                  typeof payload.message === 'string'
                    ? payload.message
                    : 'Failed to switch organization'

                return {
                  error: {
                    message,
                  },
                }
              })
            : authClient.organization.setActive({
                organizationId,
              })

          void switchOrganization.then((response) => {
            if (response?.error) {
              toast.error(
                response.error.message ?? 'Failed to switch organization',
              )
              return
            }

            startTransition(() => {
              void Promise.all([
                activeOrganization.refetch(),
                organizations.refetch(),
                session.refetch(),
              ])
              router.refresh()
            })
          })
        }}
      >
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="Select organization" />
        </SelectTrigger>
        <SelectContent>
          {organizationsData.map((organization) => (
            <SelectItem key={organization.id} value={organization.id}>
              {organization.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
