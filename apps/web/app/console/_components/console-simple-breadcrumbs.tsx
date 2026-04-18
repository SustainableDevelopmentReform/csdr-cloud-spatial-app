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
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, index) => {
          const isLastItem = index === items.length - 1

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
