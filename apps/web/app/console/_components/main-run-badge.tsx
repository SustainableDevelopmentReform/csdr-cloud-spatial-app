import { Badge, BadgeProps } from '@repo/ui/components/ui/badge'

export const MainRunBadge = ({
  size = 'md',
  variant,
}: {
  size?: 'xs' | 'md'
  variant: BadgeProps['variant']
}) => {
  if (size === 'xs') {
    return (
      <Badge
        className="text-[10px] h-4 py-1 px-1  rounded-sm font-mono"
        variant={variant}
      >
        Main Run
      </Badge>
    )
  }
  return (
    <Badge
      className="text-[12px] h-5 py-1.5 px-2 rounded-md font-mono"
      variant={variant}
    >
      Main Run
    </Badge>
  )
}
