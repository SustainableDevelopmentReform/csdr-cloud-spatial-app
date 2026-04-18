'use client'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/components/ui/dropdown-menu'
import { cn } from '@repo/ui/lib/utils'
import { CheckIcon, ChevronDownIcon } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { startTransition, useMemo } from 'react'
import { useAccessControl } from '~/hooks/useAccessControl'
import { useSwitchOrganization } from '~/hooks/useSwitchOrganization'

const appName = 'Spatial Data Framework'
const appSubtitle = 'Spatial Data Framework'

const OrganizationSummaryBlock = ({
  interactive = false,
  organizationName,
  showChevron = false,
  showSubtitle = true,
}: {
  interactive?: boolean
  organizationName: string
  showChevron?: boolean
  showSubtitle?: boolean
}) => {
  return (
    <div
      className={cn(
        'flex w-full items-center gap-2 rounded-lg p-2 text-left group-data-[collapsible=icon]:justify-center',
        interactive && 'transition-colors hover:bg-neutral-200',
      )}
    >
      <div className="flex h-8 shrink-0 items-center group-data-[collapsible=icon]:h-7">
        <Image
          alt="Global Ocean Accounts Partnership"
          className="h-full w-auto max-w-none shrink-0"
          height={356}
          src="/branding/goap-logo.webp"
          width={266}
        />
      </div>
      <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
        <div className="truncate text-sm leading-4 text-stone-900">
          {organizationName}
        </div>
        {showSubtitle ? (
          <div className="truncate text-xs leading-3 text-stone-900">
            {appSubtitle}
          </div>
        ) : null}
      </div>
      {showChevron ? (
        <ChevronDownIcon className="size-4 shrink-0 text-stone-900 group-data-[collapsible=icon]:hidden" />
      ) : null}
    </div>
  )
}

export const ConsoleSidebarOrganizationMenu = () => {
  const router = useRouter()
  const { access, activeOrganization, organizations } = useAccessControl()
  const switchOrganization = useSwitchOrganization(access.isSuperAdmin)

  const organizationsData = organizations.data ?? []
  const hasActiveOrganization = activeOrganization.data !== null
  const organizationName = useMemo(() => {
    return activeOrganization.data?.name ?? appName
  }, [activeOrganization.data?.name])

  if (
    !access.isAuthenticated ||
    organizationsData.length === 0 ||
    !hasActiveOrganization
  ) {
    return (
      <div className="w-full">
        <OrganizationSummaryBlock
          organizationName={appName}
          showSubtitle={false}
        />
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="w-full rounded-lg"
          title="Switch organization"
          type="button"
        >
          <OrganizationSummaryBlock
            interactive
            organizationName={organizationName}
            showChevron
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-64 rounded-lg border-neutral-200 bg-white p-1 shadow-md"
      >
        <DropdownMenuLabel className="px-2 py-2 text-sm font-semibold text-stone-900">
          Switch organization
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-neutral-200" />
        {organizationsData.map((organization) => {
          const isActive = organization.id === activeOrganization.data?.id

          return (
            <DropdownMenuItem
              key={organization.id}
              className={cn(
                'rounded-md px-2 py-2 text-stone-900 focus:bg-neutral-100 focus:text-stone-900',
                isActive && 'bg-neutral-100 font-medium',
              )}
              disabled={switchOrganization.isPending || isActive}
              onSelect={() => {
                switchOrganization.mutate(organization.id, {
                  onSuccess: () => {
                    startTransition(() => {
                      router.refresh()
                    })
                  },
                })
              }}
            >
              <CheckIcon
                className={cn(
                  'size-4 shrink-0 text-stone-900',
                  isActive ? 'opacity-100' : 'opacity-0',
                )}
              />
              <div className="grid min-w-0 flex-1 gap-0.5 leading-tight">
                <span className="truncate text-sm text-stone-900">
                  {organization.name}
                </span>
                <span className="truncate text-xs text-stone-900/70">
                  {organization.slug}
                </span>
              </div>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
