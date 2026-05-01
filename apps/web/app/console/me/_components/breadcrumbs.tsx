'use client'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@repo/ui/components/ui/breadcrumb'
import Link from '../../../../components/link'
import { usePathname } from 'next/navigation'
import {
  ACCOUNT_DETAILS_BASE_PATH,
  API_KEYS_BASE_PATH,
  TWO_FACTOR_BASE_PATH,
} from '~/lib/paths'

const getCurrentPage = (pathname: string | null) => {
  if (pathname === ACCOUNT_DETAILS_BASE_PATH) {
    return {
      href: ACCOUNT_DETAILS_BASE_PATH,
      label: 'Account Details',
    }
  }

  if (pathname === TWO_FACTOR_BASE_PATH) {
    return {
      href: TWO_FACTOR_BASE_PATH,
      label: 'Two-factor Authentication',
    }
  }

  if (pathname === API_KEYS_BASE_PATH) {
    return {
      href: API_KEYS_BASE_PATH,
      label: 'API Keys',
    }
  }

  return null
}

export const MeBreadcrumbs = () => {
  const pathname = usePathname()
  const currentPage = getCurrentPage(pathname)

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild className="hover:text-inherit">
            <span>Me</span>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {currentPage ? (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={currentPage.href}>{currentPage.label}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        ) : null}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
