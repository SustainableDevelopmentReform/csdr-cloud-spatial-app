import { Badge, BadgeProps } from '@repo/ui/components/ui/badge'
import { cn } from '@repo/ui/lib/utils'
import Link from './link'
import type { MouseEventHandler } from 'react'

export const BadgeLink = ({
  adornment,
  children,
  className,
  href,
  icon,
  onClick,
  ...props
}: {
  adornment?: React.ReactNode
  children: React.ReactNode
  href: string
  icon?: React.ReactNode
  onClick?: MouseEventHandler<HTMLAnchorElement>
} & Omit<BadgeProps, 'variant'>) => {
  return (
    <Link
      href={href}
      className="inline-flex max-w-full items-center transition-transform duration-100 ease-out"
      onClick={onClick}
    >
      <Badge
        {...props}
        variant="outline"
        className={cn(
          className,
          'h-[22px] max-w-none border-neutral-300 bg-white text-stone-900 hover:bg-neutral-50 hover:text-stone-900 [&>svg]:text-stone-600',
        )}
      >
        {icon}
        {children}
        {adornment}
      </Badge>
    </Link>
  )
}
