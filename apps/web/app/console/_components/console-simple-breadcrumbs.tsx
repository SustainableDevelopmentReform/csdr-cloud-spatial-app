import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@repo/ui/components/ui/breadcrumb'
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
            <BreadcrumbItem key={`${item.label}-${index}`}>
              {index > 0 ? <BreadcrumbSeparator /> : null}
              {isLastItem || !item.href ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={item.href}>{item.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
