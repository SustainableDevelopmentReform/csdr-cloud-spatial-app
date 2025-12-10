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
import Link from '~/components/link'
import { useConfig } from '../../../components/providers'
import { SignOutButton } from '../../../components/sign-out-button'
import { useAuthClient } from '../../../hooks/useAuthClient'
import AccountSettingsButton from './account-settings-button'
import { useState } from 'react'

export const UserDropdown = () => {
  const { apiBaseUrl } = useConfig()
  const authClient = useAuthClient()
  const { data } = authClient.useSession()
  const user = data?.user

  const [isOpen, setIsOpen] = useState(false)

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
        <div className="pt-2 mt-2 border-t border-gray-200 px-4 flex flex-col gap-1">
          <AccountSettingsButton onClose={() => setIsOpen(false)} />
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
