import { SquareIcon } from 'lucide-react'
import React from 'react'
import Link from '~/components/link'
import {
  DASHBOARDS_BASE_PATH,
  DATASETS_BASE_PATH,
  GEOMETRIES_BASE_PATH,
  LOGS_BASE_PATH,
  PRODUCTS_BASE_PATH,
  PUBLIC_EXPLORER_BASE_PATH,
  REPORTS_BASE_PATH,
  USERS_BASE_PATH,
  INDICATORS_BASE_PATH,
  WORKSPACE_BASE_PATH,
} from '../../lib/paths'
import { getUserServerSession } from '../../utils/getUserServerSession'
import {
  buildSessionAccess,
  canManageWorkspace,
  canViewLogs,
} from '../../utils/access-control'
import { UserDropdown } from './_components/user-dropdown'

const SIDEBAR_CONFIG = [
  {
    text: 'Users',
    icon: <SquareIcon className="fill-gray-300 stroke-none size-6" />,
    href: USERS_BASE_PATH,
    show: (isSuperAdmin: boolean) => isSuperAdmin,
  },
  {
    text: 'Datasets',
    icon: <SquareIcon className="fill-dataset stroke-none size-6" />,
    href: DATASETS_BASE_PATH,
    show: () => true,
  },
  {
    text: 'Geometries',
    icon: <SquareIcon className="fill-geometry stroke-none size-6" />,
    href: GEOMETRIES_BASE_PATH,
    show: () => true,
  },
  {
    text: 'Products',
    icon: <SquareIcon className="fill-product stroke-none size-6" />,
    href: PRODUCTS_BASE_PATH,
    show: () => true,
  },
  {
    text: 'Indicators',
    icon: <SquareIcon className="fill-indicator stroke-none size-6" />,
    href: INDICATORS_BASE_PATH,
    show: () => true,
  },
  {
    text: 'Dashboards',
    icon: <SquareIcon className="fill-gray-300 stroke-none size-6" />,
    href: DASHBOARDS_BASE_PATH,
    show: () => true,
  },
  {
    text: 'Data Explorer',
    icon: <SquareIcon className="fill-gray-300 stroke-none size-6" />,
    href: '/console/data-explorer',
    show: () => true,
  },
  {
    text: 'Reports',
    icon: <SquareIcon className="fill-gray-300 stroke-none size-6" />,
    href: REPORTS_BASE_PATH,
    show: () => true,
  },
  {
    text: 'Workspace',
    icon: <SquareIcon className="fill-gray-300 stroke-none size-6" />,
    href: WORKSPACE_BASE_PATH,
    show: (_isSuperAdmin: boolean, canManage: boolean) => canManage,
  },
  {
    text: 'Logs',
    icon: <SquareIcon className="fill-gray-300 stroke-none size-6" />,
    href: LOGS_BASE_PATH,
    show: (_isSuperAdmin: boolean, _canManage: boolean, canReadLogs: boolean) =>
      canReadLogs,
  },
  {
    text: 'Public Explorer',
    icon: <SquareIcon className="fill-gray-300 stroke-none size-6" />,
    href: PUBLIC_EXPLORER_BASE_PATH,
    show: () => true,
  },
]

const ConsoleLayout: React.FC<{ children: React.ReactNode }> = async ({
  children,
}) => {
  const session = await getUserServerSession()
  const access = buildSessionAccess(session)
  const canManage = canManageWorkspace(access)
  const canReadLogs = canViewLogs(access)

  return (
    <>
      <main>
        <nav className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-gray-200 bg-white/90 px-10 backdrop-blur">
          <Link
            href="/console"
            className="block text-2xl font-mono font-semibold"
          >
            CSDR Cloud Spatial App
          </Link>
          <UserDropdown />
        </nav>
        <aside className="fixed bottom-0 left-0 top-20 w-64 border-r border-gray-200 bg-gray-50/60 px-8 py-6">
          <div className="mb-6 rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
            <div className="text-xs uppercase tracking-[0.25em] text-gray-500">
              Active Workspace
            </div>
            <div className="mt-2 text-lg font-medium">
              {session.activeOrganization?.name ?? 'No workspace selected'}
            </div>
            <div className="mt-1 text-sm text-gray-500">
              {access.organizationRole?.replace('org_', '').replace('_', ' ') ??
                'No active role'}
            </div>
          </div>
          <div className="grid gap-2">
            {SIDEBAR_CONFIG.map(({ href, text, show, icon }) =>
              show(access.isSuperAdmin, canManage, canReadLogs) ? (
                <Link
                  key={href}
                  className="rounded-xl px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-white hover:text-gray-950 data-[active=true]:bg-white data-[active=true]:text-gray-950 data-[active=true]:shadow-sm"
                  href={href}
                >
                  <div className="flex items-center gap-2">
                    {icon}
                    {text}
                  </div>
                </Link>
              ) : null,
            )}
          </div>
        </aside>
        <div className="fixed bottom-0 left-64 right-0 top-20 overflow-auto px-10 py-6">
          {children}
        </div>
      </main>
    </>
  )
}

export default ConsoleLayout
