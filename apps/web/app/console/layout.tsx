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
import { SquareIcon } from 'lucide-react'
import React from 'react'
import Link from '~/components/link'
import { SignOutButton } from '../../components/sign-out-button'
import { getUserServerSession } from '../../utils/getUserServerSession'
import AccountSettingsButton from './_components/account-settings-button'

const SIDEBAR_CONFIG = [
  {
    text: 'Users',
    icon: <SquareIcon className="fill-gray-300 stroke-none size-6" />,
    href: '/console/users',
    roles: ['admin'],
  },
  {
    text: 'Datasets',
    icon: <SquareIcon className="fill-dataset stroke-none size-6" />,
    href: '/console/datasets',
    roles: ['admin', 'user'],
  },
  {
    text: 'Geometries',
    icon: <SquareIcon className="fill-geometry stroke-none size-6" />,
    href: '/console/geometries',
    roles: ['admin', 'user'],
  },
  {
    text: 'Products',
    icon: <SquareIcon className="fill-product stroke-none size-6" />,
    href: '/console/products',
    roles: ['admin', 'user'],
  },
  {
    text: 'Variables',
    icon: <SquareIcon className="fill-variable stroke-none size-6" />,
    href: '/console/variables',
    roles: ['admin', 'user'],
  },

  // {
  //   text: 'Organizations',
  //   href: '/console/organizations',
  //   permissions: somePermissions(['read:organizations', 'write:organizations']),
  // },
  // {
  //   text: 'Roles',
  //   href: '/console/roles',
  //   permissions: somePermissions(['read:roles', 'write:roles']),
  // },
  // {
  //   text: 'Permissions',
  //   href: '/console/permissions',
  //   permissions: somePermissions(['read:permissions', 'write:permissions']),
  // },
  // {
  //   text: 'Feature Flags',
  //   href: '/console/feature-flags',
  //   permissions: somePermissions(['read:feature-flags', 'write:feature-flags']),
  // },
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
          <Popover>
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
            <PopoverContent
              align="end"
              side="bottom"
              className="px-0 py-4 w-52"
            >
              <div className="px-4">
                <div className="line-clamp-1">{user?.name}</div>
                <div className="text-sm text-gray-400 line-clamp-1">
                  {user?.email}
                </div>
              </div>
              <div className="pt-2 mt-2 border-t border-gray-200 px-4 flex flex-col gap-1">
                <AccountSettingsButton />
                <Link
                  className="mb-2 block w-full text-left"
                  href="/console/me/api-keys"
                >
                  API Keys
                </Link>
                <Link
                  className="mb-2 block w-full text-left"
                  href="/api/v1/scalar"
                >
                  API Docs
                </Link>
                <SignOutButton />
              </div>
            </PopoverContent>
          </Popover>
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
