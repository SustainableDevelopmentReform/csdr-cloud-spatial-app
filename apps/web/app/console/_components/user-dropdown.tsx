'use client'

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@repo/ui/components/ui/popover'
import {
  ChevronsUpDownIcon,
  Settings2Icon,
  ShieldCheckIcon,
  UserIcon,
} from 'lucide-react'
import { SignOutButton } from '../../../components/sign-out-button'
import { useState } from 'react'
import AccountSettingsButton from './account-settings-button'
import TwoFactorButton from './two-factor-dialog'

const menuItemClassName =
  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm leading-5 text-stone-900 transition-colors hover:bg-neutral-100'

type UserDropdownProps = {
  userEmail: string
  userRoleLabel: string
}

export const UserDropdown = ({
  userEmail,
  userRoleLabel,
}: UserDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false)
  const [isTwoFactorDialogOpen, setIsTwoFactorDialogOpen] = useState(false)

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            className="flex w-full items-center gap-2 rounded-lg p-2 text-left transition-colors hover:bg-neutral-200 group-data-[collapsible=icon]:justify-center"
            type="button"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-stone-900 text-neutral-100">
              <UserIcon className="size-4" />
            </div>
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <div className="truncate text-sm font-semibold leading-4 text-stone-900">
                {userRoleLabel}
              </div>
              <div className="truncate text-xs leading-3 text-stone-900/80">
                {userEmail}
              </div>
            </div>
            <ChevronsUpDownIcon className="size-4 shrink-0 text-stone-900 group-data-[collapsible=icon]:hidden" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-56 rounded-lg border border-neutral-200 bg-white p-0 shadow-md"
          side="top"
          sideOffset={8}
        >
          <div className="p-1">
            <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-stone-900 text-neutral-100">
                <UserIcon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold leading-4 text-stone-900">
                  {userRoleLabel}
                </div>
                <div className="truncate text-xs leading-3 text-stone-900/80">
                  {userEmail}
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-neutral-200" />
          <div className="p-1">
            <button
              className={menuItemClassName}
              onClick={() => {
                setIsOpen(false)
                setIsAccountDialogOpen(true)
              }}
              type="button"
            >
              <Settings2Icon className="size-4 text-stone-900/70" />
              <span>Account</span>
            </button>
            <button
              className={menuItemClassName}
              onClick={() => {
                setIsOpen(false)
                setIsTwoFactorDialogOpen(true)
              }}
              type="button"
            >
              <ShieldCheckIcon className="size-4 text-stone-900/70" />
              <span>Two-factor Authentication</span>
            </button>
          </div>
          <div className="border-t border-neutral-200" />
          <div className="p-1">
            <SignOutButton
              className={menuItemClassName}
              label="Sign out"
              onClick={() => setIsOpen(false)}
            />
          </div>
        </PopoverContent>
      </Popover>
      <AccountSettingsButton
        hideTrigger
        icon={<Settings2Icon className="size-4 text-stone-900/70" />}
        label="Account"
        onOpenChange={setIsAccountDialogOpen}
        open={isAccountDialogOpen}
      />
      <TwoFactorButton
        hideTrigger
        icon={<ShieldCheckIcon className="size-4 text-stone-900/70" />}
        label="Two-factor Authentication"
        onOpenChange={setIsTwoFactorDialogOpen}
        open={isTwoFactorDialogOpen}
      />
    </>
  )
}
