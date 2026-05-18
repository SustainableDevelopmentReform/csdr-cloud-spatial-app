import type { RunStatus } from '@repo/schemas/crud'
import { cn } from '@repo/ui/lib/utils'

const statusClassName: Record<RunStatus, string> = {
  latest: 'outline-black text-black',
  draft: 'outline-stone-300 text-stone-300',
  previous: 'outline-stone-300 text-stone-300',
}

const statusLabel: Record<RunStatus, string> = {
  latest: 'Latest Version',
  draft: 'Draft Run',
  previous: 'Previous Run',
}

export const VersionStatusBadge = ({ status }: { status: RunStatus }) => (
  <span
    className={cn(
      'inline-flex max-w-full items-center justify-center gap-1 overflow-hidden rounded-lg px-2 py-0.5 outline outline-1 outline-offset-[-1px]',
      statusClassName[status],
    )}
  >
    <span className="truncate text-xs font-semibold leading-4">
      {statusLabel[status]}
    </span>
  </span>
)
