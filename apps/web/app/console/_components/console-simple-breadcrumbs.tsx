import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@repo/ui/components/ui/breadcrumb'
import { cn } from '@repo/ui/lib/utils'
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
                {isLastItem ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : !item.href ? (
                  <span
                    className={cn(
                      'inline-flex items-center gap-2.5 text-sm font-normal leading-5',
                      index === 0 ? 'text-stone-900' : 'text-muted-foreground',
                    )}
                  >
                    {item.label}
                  </span>
                ) : (
                  <BreadcrumbLink
                    asChild
                    className={
                      index === 0 ? undefined : 'text-muted-foreground'
                    }
                  >
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
