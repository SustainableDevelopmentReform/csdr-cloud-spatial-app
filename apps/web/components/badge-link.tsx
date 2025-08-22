import { Badge, BadgeProps } from '@repo/ui/components/ui/badge'
import Link from './link'

export const BadgeLink = ({
  children,
  href,
  ...props
}: { children: React.ReactNode; href: string } & BadgeProps) => {
  return (
    <Link href={href} className="flex items-center">
      <Badge {...props}>{children}</Badge>
    </Link>
  )
}
