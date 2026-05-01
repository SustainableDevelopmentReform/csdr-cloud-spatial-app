'use client'

import { Button } from '@repo/ui/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  useSidebar,
} from '@repo/ui/components/ui/sidebar'
import { cn } from '@repo/ui/lib/utils'
import {
  ArrowUpRightIcon,
  BarChartHorizontalBigIcon,
  BookOpenIcon,
  Building2Icon,
  ChevronRightIcon,
  ClipboardListIcon,
  DatabaseIcon,
  EarthIcon,
  FileBarChart2Icon,
  GaugeCircleIcon,
  HomeIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  SquareStackIcon,
  Table2Icon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useMemo, useState } from 'react'
import { useConfig } from '~/components/providers'
import { StatusMessage } from '~/components/status-message'
import {
  DASHBOARDS_BASE_PATH,
  DATASETS_BASE_PATH,
  GEOMETRIES_BASE_PATH,
  INDICATORS_BASE_PATH,
  LOGS_BASE_PATH,
  PRODUCTS_BASE_PATH,
  REPORTS_BASE_PATH,
  SUPER_ADMIN_AUDIT_LOGS_BASE_PATH,
  SUPER_ADMIN_ORGANIZATIONS_BASE_PATH,
  USERS_BASE_PATH,
  WORKSPACE_BASE_PATH,
  ACCOUNT_DETAILS_BASE_PATH,
  API_KEYS_BASE_PATH,
  TWO_FACTOR_BASE_PATH,
} from '~/lib/paths'
import { ConsoleSidebarOrganizationMenu } from './console-sidebar-organization-menu'
import { ConsoleSidebarUserSection } from './console-sidebar-user-section'

type ConsoleShellProps = {
  canManageWorkspace: boolean
  canViewLogs: boolean
  defaultSidebarOpen: boolean
  isAuthenticated: boolean
  isSuperAdmin: boolean
  showEmailVerificationWarning: boolean
  showSuperAdminTwoFactorWarning: boolean
  userEmail: string | null
  userRoleLabel: string
  children: React.ReactNode
}

type NavLinkItem = {
  kind: 'link'
  external?: boolean
  href: string
  icon: LucideIcon
  label: string
  newTab?: boolean
  exact?: boolean
}

type NavDisclosureItem = {
  kind: 'disclosure'
  children: NavLinkItem[]
  icon: LucideIcon
  id: string
  label: string
}

type NavItem = NavLinkItem | NavDisclosureItem

type NavGroup = {
  label: string
  items: NavItem[]
}

const topLevelItemClassName =
  'h-8 rounded-lg px-2 text-sm font-normal leading-4 text-stone-900 hover:bg-neutral-200 hover:text-stone-900 data-[active=true]:bg-neutral-200 data-[active=true]:font-medium data-[active=true]:text-stone-900 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-stone-900'

const disclosureChildClassName =
  'h-7 rounded-lg px-2 text-sm font-normal leading-4 text-stone-900 hover:bg-neutral-200 hover:text-stone-900 data-[active=true]:bg-neutral-200/90 data-[active=true]:font-medium data-[active=true]:text-stone-900 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-stone-900'

const groupLabelClassName =
  'h-8 px-2 text-[11px] font-medium uppercase leading-4 tracking-[0.04em] text-neutral-900/70'

const AccountSecurityWarning = ({
  children,
  href,
  label,
}: {
  children: React.ReactNode
  href: string
  label: string
}) => {
  return (
    <StatusMessage variant="error" className="shadow-sm" role="alert">
      {children}{' '}
      <Link
        className="font-medium underline underline-offset-2 transition-colors hover:text-red-900 dark:hover:text-red-200"
        href={href}
      >
        {label}
      </Link>
    </StatusMessage>
  )
}

const AccountSecurityWarnings = ({
  showEmailVerificationWarning,
  showSuperAdminTwoFactorWarning,
}: {
  showEmailVerificationWarning: boolean
  showSuperAdminTwoFactorWarning: boolean
}) => {
  if (!showEmailVerificationWarning && !showSuperAdminTwoFactorWarning) {
    return null
  }

  return (
    <div className="mt-4 grid gap-2">
      {showEmailVerificationWarning ? (
        <AccountSecurityWarning
          href={ACCOUNT_DETAILS_BASE_PATH}
          label="Open account details"
        >
          Your email address is not verified. Verify it to keep account access
          reliable.
        </AccountSecurityWarning>
      ) : null}
      {showSuperAdminTwoFactorWarning ? (
        <AccountSecurityWarning
          href={TWO_FACTOR_BASE_PATH}
          label="Open 2FA settings"
        >
          Super admin access requires two-factor authentication. Enable 2FA
          before performing protected operations.
        </AccountSecurityWarning>
      ) : null}
    </div>
  )
}

const isActiveRoute = (
  pathname: string | null,
  href: string,
  exact = false,
): boolean => {
  if (pathname === null) {
    return false
  }

  if (exact) {
    return pathname === href
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

const isDisclosureItemOpen = (
  pathname: string | null,
  item: NavDisclosureItem,
  expanded: Record<string, boolean>,
): boolean => {
  if (
    item.children.some((child) =>
      isActiveRoute(pathname, child.href, child.exact),
    )
  ) {
    return true
  }

  return expanded[item.id] === true
}

const ConsoleShellNavigation = ({ groups }: { groups: NavGroup[] }) => {
  const pathname = usePathname()
  const { isMobile, open, setOpen } = useSidebar()
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(
    {},
  )

  const toggleDisclosure = (item: NavDisclosureItem) => {
    if (!isMobile && !open) {
      setOpen(true)
      setExpandedItems((current) => ({
        ...current,
        [item.id]: true,
      }))
      return
    }

    setExpandedItems((current) => ({
      ...current,
      [item.id]: !isDisclosureItemOpen(pathname, item, current),
    }))
  }

  return (
    <>
      {groups.map((group) => (
        <SidebarGroup key={group.label} className="px-2 py-1 not-first:mt-4">
          <SidebarGroupLabel className={groupLabelClassName}>
            {group.label}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {group.items.map((item) => {
                if (item.kind === 'link') {
                  const Icon = item.icon

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActiveRoute(
                          pathname,
                          item.href,
                          item.exact,
                        )}
                        tooltip={item.label}
                        className={topLevelItemClassName}
                      >
                        {item.external ? (
                          <a
                            href={item.href}
                            rel={
                              item.newTab ? 'noreferrer noopener' : undefined
                            }
                            target={item.newTab ? '_blank' : undefined}
                          >
                            <Icon />
                            <span>{item.label}</span>
                            {item.newTab ? (
                              <ArrowUpRightIcon className="ml-auto size-4 shrink-0 text-stone-900 group-data-[collapsible=icon]:hidden" />
                            ) : null}
                          </a>
                        ) : (
                          <Link href={item.href}>
                            <Icon />
                            <span>{item.label}</span>
                          </Link>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                }

                const Icon = item.icon
                const isOpen = isDisclosureItemOpen(
                  pathname,
                  item,
                  expandedItems,
                )
                const isActive = item.children.some((child) =>
                  isActiveRoute(pathname, child.href, child.exact),
                )

                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.label}
                      className={topLevelItemClassName}
                      onClick={() => toggleDisclosure(item)}
                    >
                      <Icon />
                      <span>{item.label}</span>
                      <ChevronRightIcon
                        className={cn(
                          'ml-auto size-4 text-stone-900 transition-transform group-data-[collapsible=icon]:hidden',
                          isOpen ? 'rotate-90' : 'rotate-0',
                        )}
                      />
                    </SidebarMenuButton>
                    {isOpen ? (
                      <SidebarMenuSub className="relative mx-0 mt-1 translate-x-0 gap-1 border-l-0 px-6 py-0.5 after:absolute after:bottom-0 after:left-4 after:top-0 after:w-px after:bg-neutral-300">
                        {item.children.map((child) => {
                          const ChildIcon = child.icon

                          return (
                            <SidebarMenuSubItem key={child.href}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={isActiveRoute(
                                  pathname,
                                  child.href,
                                  child.exact,
                                )}
                                className={disclosureChildClassName}
                              >
                                <Link href={child.href}>
                                  <ChildIcon />
                                  <span>{child.label}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          )
                        })}
                      </SidebarMenuSub>
                    ) : null}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  )
}

const ConsoleShellFrame = ({
  children,
  groups,
  isAuthenticated,
  showEmailVerificationWarning,
  showSuperAdminTwoFactorWarning,
  userEmail,
  userRoleLabel,
}: {
  children: React.ReactNode
  groups: NavGroup[]
  isAuthenticated: boolean
  showEmailVerificationWarning: boolean
  showSuperAdminTwoFactorWarning: boolean
  userEmail: string | null
  userRoleLabel: string
}) => {
  return (
    <>
      <Sidebar
        collapsible="icon"
        className="border-r-0 bg-neutral-100 group-data-[side=left]:border-r-0 group-data-[side=right]:border-l-0"
      >
        <SidebarHeader className="gap-0 bg-neutral-100 p-2">
          <ConsoleSidebarOrganizationMenu />
        </SidebarHeader>
        <SidebarContent className="bg-neutral-100 py-2">
          <ConsoleShellNavigation groups={groups} />
        </SidebarContent>
        <SidebarFooter className="bg-neutral-100 p-2">
          {isAuthenticated ? (
            <ConsoleSidebarUserSection
              userEmail={userEmail}
              userRoleLabel={userRoleLabel}
            />
          ) : (
            <div className="grid gap-2">
              <Button asChild size="sm">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/sign-up">Sign up</Link>
              </Button>
            </div>
          )}
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="min-h-svh overflow-x-hidden bg-neutral-100">
        <div className="flex flex-1 flex-col px-4 pb-4">
          <AccountSecurityWarnings
            showEmailVerificationWarning={showEmailVerificationWarning}
            showSuperAdminTwoFactorWarning={showSuperAdminTwoFactorWarning}
          />
          {children}
        </div>
      </SidebarInset>
    </>
  )
}

export const ConsoleShell = ({
  canManageWorkspace,
  canViewLogs,
  children,
  defaultSidebarOpen,
  isAuthenticated,
  isSuperAdmin,
  showEmailVerificationWarning,
  showSuperAdminTwoFactorWarning,
  userEmail,
  userRoleLabel,
}: ConsoleShellProps) => {
  const { apiBaseUrl } = useConfig()
  const navGroups = useMemo<NavGroup[]>(() => {
    const exploreItems: NavItem[] = [
      {
        kind: 'link',
        href: '/console',
        icon: HomeIcon,
        label: 'Home',
        exact: true,
      },
      {
        kind: 'link',
        href: DASHBOARDS_BASE_PATH,
        icon: LayoutDashboardIcon,
        label: 'Dashboards',
      },
      {
        kind: 'link',
        href: REPORTS_BASE_PATH,
        icon: FileBarChart2Icon,
        label: 'Reports',
      },
      {
        kind: 'link',
        href: '/console/data-explorer',
        icon: BarChartHorizontalBigIcon,
        label: 'Analysis',
      },
      {
        kind: 'disclosure',
        children: [
          {
            kind: 'link',
            href: DATASETS_BASE_PATH,
            icon: EarthIcon,
            label: 'Datasets',
          },
          {
            kind: 'link',
            href: GEOMETRIES_BASE_PATH,
            icon: SquareStackIcon,
            label: 'Boundaries',
          },
          {
            kind: 'link',
            href: PRODUCTS_BASE_PATH,
            icon: Table2Icon,
            label: 'Products',
          },
        ],
        icon: DatabaseIcon,
        id: 'data-library',
        label: 'Data Library',
      },
    ]

    const groups: NavGroup[] = [
      {
        label: 'Explore',
        items: exploreItems,
      },
    ]

    if (isAuthenticated) {
      if (canManageWorkspace) {
        const adminItems: NavItem[] = [
          {
            kind: 'link',
            href: INDICATORS_BASE_PATH,
            icon: GaugeCircleIcon,
            label: 'Indicator Definitions',
          },
        ]

        adminItems.push({
          kind: 'link',
          href: WORKSPACE_BASE_PATH,
          icon: Building2Icon,
          label: 'Organization Settings',
        })

        if (canViewLogs) {
          adminItems.push({
            kind: 'link',
            href: LOGS_BASE_PATH,
            icon: ClipboardListIcon,
            label: 'Audit Logs',
          })
        }

        groups.push({
          label: 'Admin',
          items: adminItems,
        })
      }

      if (isSuperAdmin) {
        groups.push({
          label: 'Super admin',
          items: [
            {
              kind: 'link',
              href: SUPER_ADMIN_ORGANIZATIONS_BASE_PATH,
              icon: Building2Icon,
              label: 'Organizations',
            },
            {
              kind: 'link',
              href: USERS_BASE_PATH,
              icon: UsersIcon,
              label: 'Users',
            },
            {
              kind: 'link',
              href: SUPER_ADMIN_AUDIT_LOGS_BASE_PATH,
              icon: ClipboardListIcon,
              label: 'Audit Logs',
            },
          ],
        })
      }

      const developerItems: NavItem[] = [
        {
          kind: 'link',
          href: API_KEYS_BASE_PATH,
          icon: KeyRoundIcon,
          label: 'API Keys',
        },
        {
          kind: 'link',
          external: true,
          href: `${apiBaseUrl}/api/v0/scalar`,
          icon: BookOpenIcon,
          label: 'API Docs',
          newTab: true,
        },
      ]

      groups.push({
        label: 'Developer',
        items: developerItems,
      })
    }

    return groups
  }, [
    apiBaseUrl,
    canManageWorkspace,
    canViewLogs,
    isAuthenticated,
    isSuperAdmin,
  ])

  return (
    <SidebarProvider defaultOpen={defaultSidebarOpen}>
      <ConsoleShellFrame
        groups={navGroups}
        isAuthenticated={isAuthenticated}
        showEmailVerificationWarning={showEmailVerificationWarning}
        showSuperAdminTwoFactorWarning={showSuperAdminTwoFactorWarning}
        userEmail={userEmail}
        userRoleLabel={userRoleLabel}
      >
        {children}
      </ConsoleShellFrame>
    </SidebarProvider>
  )
}
