import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@repo/ui/components/ui/breadcrumb'
import { Fragment } from 'react'
import Link from '~/components/link'

type ConsoleSimpleBreadcrumbsProps = {
  items: Array<{
    href?: string
    label: string
  }>
}

export const ConsoleSimpleBreadcrumbs = ({
  items,
}: ConsoleSimpleBreadcrumbsProps) => {
  const visibleItems =
    items.length > 1 &&
    items[0]?.href === '/console' &&
    items[0].label === 'Home'
      ? items.slice(1)
      : items

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {visibleItems.map((item, index) => {
          const isLastItem = index === visibleItems.length - 1

          return (
            <Fragment key={`${item.label}-${index}`}>
              {index > 0 ? <BreadcrumbSeparator /> : null}
              <BreadcrumbItem>
                {isLastItem || !item.href ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
