'use client'

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@repo/ui/components/ui/avatar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@repo/ui/components/ui/popover'
import { Button } from '@repo/ui/components/ui/button'
import { toast } from '@repo/ui/components/ui/sonner'
import Link from '~/components/link'
import { useConfig } from '../../../components/providers'
import { SignOutButton } from '../../../components/sign-out-button'
import { useAccessControl } from '../../../hooks/useAccessControl'
import { useAuthClient } from '../../../hooks/useAuthClient'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import AccountSettingsButton from './account-settings-button'
import TwoFactorButton from './two-factor-dialog'
import { LOGS_BASE_PATH, WORKSPACE_BASE_PATH } from '../../../lib/paths'
import {
  canManageWorkspace,
  canViewLogs,
  formatOrganizationRole,
} from '../../../utils/access-control'

export const UserDropdown = () => {
  const { apiBaseUrl } = useConfig()
  const authClient = useAuthClient()
  const router = useRouter()
  const { access, activeOrganization, organizations, session } =
    useAccessControl()
  const user = session.data?.user
  const [isPending, startTransition] = useTransition()

  const [isOpen, setIsOpen] = useState(false)

  const switchWorkspace = async (organizationId: string) => {
    const response = await authClient.organization.setActive({
      organizationId,
    })

    if (response.error) {
      toast.error(response.error.message ?? 'Failed to switch workspace')
      return
    }

    startTransition(() => {
      setIsOpen(false)
      void session.refetch()
      router.refresh()
    })
  }

  const organizationsData = organizations.data ?? []

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button>
          <Avatar>
            <AvatarImage
              className="object-cover object-center"
              src={user?.image ?? undefined}
            />
            <AvatarFallback>{user?.name[0]}</AvatarFallback>
          </Avatar>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" side="bottom" className="px-0 py-4 w-52">
        <div className="px-4">
          <div className="line-clamp-1">{user?.name}</div>
          <div className="text-sm text-gray-400 line-clamp-1">
            {user?.email}
          </div>
        </div>
        <div className="mt-3 border-t border-gray-200 px-4 pt-3">
          <div className="text-[11px] uppercase tracking-[0.2em] text-gray-500">
            Active workspace
          </div>
          <div className="mt-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
            <div className="font-medium">
              {activeOrganization.data?.name ?? 'No workspace selected'}
            </div>
            <div className="text-sm text-gray-500">
              {formatOrganizationRole(access.organizationRole)}
            </div>
          </div>
          {organizationsData.length > 1 ? (
            <div className="mt-3 grid gap-2">
              {organizationsData.map((organization) => {
                const isActive = organization.id === activeOrganization.data?.id

                return (
                  <Button
                    key={organization.id}
                    type="button"
                    variant={isActive ? 'default' : 'outline'}
                    className="justify-start"
                    disabled={isPending || isActive}
                    onClick={() => {
                      void switchWorkspace(organization.id)
                    }}
                  >
                    {organization.name}
                  </Button>
                )
              })}
            </div>
          ) : null}
        </div>
        <div className="pt-2 mt-2 border-t border-gray-200 px-4 flex flex-col gap-1">
          {canManageWorkspace(access) ? (
            <Link
              className="mb-2 block w-full text-left"
              href={WORKSPACE_BASE_PATH}
              onClick={() => setIsOpen(false)}
            >
              Workspace
            </Link>
          ) : null}
          {canViewLogs(access) ? (
            <Link
              className="mb-2 block w-full text-left"
              href={LOGS_BASE_PATH}
              onClick={() => setIsOpen(false)}
            >
              Audit logs
            </Link>
          ) : null}
          <AccountSettingsButton onClose={() => setIsOpen(false)} />
          <TwoFactorButton onClose={() => setIsOpen(false)} />
          <Link
            className="mb-2 block w-full text-left"
            href="/console/me/api-keys"
            onClick={() => setIsOpen(false)}
          >
            API Keys
          </Link>
          <Link
            className="mb-2 block w-full text-left"
            href={`${apiBaseUrl}/api/v0/scalar`}
            onClick={() => setIsOpen(false)}
          >
            API Docs
          </Link>
          <SignOutButton onClick={() => setIsOpen(false)} />
        </div>
      </PopoverContent>
    </Popover>
  )
}
