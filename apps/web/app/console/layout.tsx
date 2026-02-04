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
} from '../../lib/paths'
import { getUserServerSession } from '../../utils/getUserServerSession'
import { UserDropdown } from './_components/user-dropdown'

const SIDEBAR_CONFIG = [
  {
    text: 'Users',
    icon: <SquareIcon className="fill-gray-300 stroke-none size-6" />,
    href: USERS_BASE_PATH,
    roles: ['admin'],
  },
  {
    text: 'Datasets',
    icon: <SquareIcon className="fill-dataset stroke-none size-6" />,
    href: DATASETS_BASE_PATH,
    roles: ['admin', 'user'],
  },
  {
    text: 'Geometries',
    icon: <SquareIcon className="fill-geometry stroke-none size-6" />,
    href: GEOMETRIES_BASE_PATH,
    roles: ['admin', 'user'],
  },
  {
    text: 'Products',
    icon: <SquareIcon className="fill-product stroke-none size-6" />,
    href: PRODUCTS_BASE_PATH,
    roles: ['admin', 'user'],
  },
  {
    text: 'Indicators',
    icon: <SquareIcon className="fill-indicator stroke-none size-6" />,
    href: INDICATORS_BASE_PATH,
    roles: ['admin', 'user'],
  },
  {
    text: 'Dashboards',
    icon: <SquareIcon className="fill-gray-300 stroke-none size-6" />,
    href: DASHBOARDS_BASE_PATH,
    roles: ['admin', 'user'],
  },
  {
    text: 'Data Explorer',
    icon: <SquareIcon className="fill-gray-300 stroke-none size-6" />,
    href: '/console/data-explorer',
    roles: ['admin', 'user'],
  },
  {
    text: 'Reports',
    icon: <SquareIcon className="fill-gray-300 stroke-none size-6" />,
    href: REPORTS_BASE_PATH,
    roles: ['admin', 'user'],
  },
]

const ConsoleLayout: React.FC<{ children: React.ReactNode }> = async ({
  children,
}) => {
  const { user } = await getUserServerSession()

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
          <UserDropdown />
        </nav>
        <aside className="fixed top-20 bottom-0 left-0 w-60 px-10 py-6">
          <div className="grid gap-3">
            {SIDEBAR_CONFIG.map(({ href, text, roles, icon }) =>
              roles.includes(user?.role ?? 'user') ? (
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
