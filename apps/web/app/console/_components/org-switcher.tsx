'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/ui/select'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { useAccessControl } from '../../../hooks/useAccessControl'
import { useSwitchOrganization } from '../../../hooks/useSwitchOrganization'

export const OrgSwitcher = () => {
  const router = useRouter()
  const { access, activeOrganization, organizations } = useAccessControl()
  const switchOrganization = useSwitchOrganization(access.isSuperAdmin)
  const [isPending, startTransition] = useTransition()

  const organizationsData = organizations.data ?? []

  if (organizationsData.length === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-500">Organization</span>
      <Select
        disabled={isPending || switchOrganization.isPending}
        value={activeOrganization.data?.id}
        onValueChange={(organizationId) => {
          switchOrganization.mutate(organizationId, {
            onSuccess: () => {
              startTransition(() => {
                router.refresh()
              })
            },
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
