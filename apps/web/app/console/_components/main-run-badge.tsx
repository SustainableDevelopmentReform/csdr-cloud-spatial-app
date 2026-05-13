import { Badge } from '@repo/ui/components/ui/badge'

export const MainRunBadge = ({ size = 'md' }: { size?: 'xs' | 'md' }) => {
  if (size === 'xs') {
    return (
      <Badge
        className="h-4 rounded-sm border-neutral-300 bg-neutral-100 px-1 py-1 font-mono text-[10px] text-neutral-700"
        variant="outline"
      >
        Main Run
      </Badge>
    )
  }
  return (
    <Badge
      className="h-5 rounded-md border-neutral-300 bg-neutral-100 px-2 py-1.5 font-mono text-[12px] text-neutral-700"
      variant="outline"
    >
      Main Run
    </Badge>
  )
}
