import { Badge, BadgeProps } from '@repo/ui/components/ui/badge'
import Link from './link'
import { ArrowUpRightIcon } from 'lucide-react'

export const BadgeLink = ({
  children,
  href,
  ...props
}: { children: React.ReactNode; href: string } & BadgeProps) => {
  return (
    <Link
      href={href}
      className="flex items-center hover:translate-x-0.5 hover:-translate-y-0.5 transition-transform duration-100 ease-out"
    >
      <Badge {...props}>
        {children}
        <ArrowUpRightIcon className="size-4" />
      </Badge>
    </Link>
  )
}
