import { Badge, BadgeProps } from '@repo/ui/components/ui/badge'
import { cn } from '@repo/ui/lib/utils'
import Link from './link'
import { SquareArrowOutUpRightIcon } from 'lucide-react'

export const BadgeLink = ({
  adornment,
  children,
  className,
  href,
  icon,
  ...props
}: {
  adornment?: React.ReactNode
  children: React.ReactNode
  href: string
  icon?: React.ReactNode
} & Omit<BadgeProps, 'variant'>) => {
  return (
    <Link
      href={href}
      className="inline-flex max-w-full items-center transition-transform duration-100 ease-out hover:-translate-y-0.5 hover:translate-x-0.5"
    >
      <Badge
        {...props}
        variant="outline"
        className={cn(
          className,
          'max-w-none border-neutral-300 bg-white text-stone-900 hover:bg-neutral-50 hover:text-stone-900 [&>svg]:text-stone-600',
        )}
      >
        {icon}
        {children}
        {adornment}
        <SquareArrowOutUpRightIcon className="size-4" />
      </Badge>
    </Link>
  )
}
