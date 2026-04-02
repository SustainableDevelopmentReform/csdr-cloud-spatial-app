import { SquareIcon } from 'lucide-react'
import React from 'react'
import Link from '~/components/link'
import {
  DASHBOARDS_BASE_PATH,
  DATASETS_BASE_PATH,
  GEOMETRIES_BASE_PATH,
  PRODUCTS_BASE_PATH,
  REPORTS_BASE_PATH,
  USERS_BASE_PATH,
  INDICATORS_BASE_PATH,
  LOGS_BASE_PATH,
  WORKSPACE_BASE_PATH,
} from '../../lib/paths'
import { getUserServerSession } from '../../utils/getUserServerSession'
import {
  buildSessionAccess,
  canManageWorkspace,
  canViewLogs,
} from '../../utils/access-control'
import { OrgSwitcher } from './_components/org-switcher'
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
        <nav className="flex items-center justify-between px-10 h-20 top-0 left-0 right-0">
          <Link
            href="/console"
            className="text-2xl font-mono font-semibold block"
          >
            CSDR Cloud Spatial App
          </Link>
          <div className="flex items-center gap-4">
            <OrgSwitcher />
            <UserDropdown />
          </div>
        </nav>
        <aside className="fixed top-20 bottom-0 left-0 w-60 px-10 py-6">
          <div className="grid gap-3">
            {SIDEBAR_CONFIG.map(({ href, text, show, icon }) =>
              show(access.isSuperAdmin, canManage, canReadLogs) ? (
                <Link
                  key={href}
                  className="text-lg hover:underline data-[active=true]:underline"
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
        <div className="fixed top-20 left-60 bottom-0 right-0 overflow-auto py-6 px-10">
          {children}
        </div>
      </main>
    </>
  )
}

export default ConsoleLayout
