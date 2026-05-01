import { Button } from '@repo/ui/components/ui/button'
import { cn } from '@repo/ui/lib/utils'

interface LoadMoreProps {
  hasNextPage: boolean
  onLoadMore: () => void
  isLoading?: boolean
  className?: string
  label?: string
  loadedCount?: number
  totalCount?: number
}

const Pagination = ({
  hasNextPage,
  onLoadMore,
  isLoading = false,
  className,
  label = 'Load more',
  loadedCount,
  totalCount,
}: LoadMoreProps) => {
  const showCount = loadedCount !== undefined || totalCount !== undefined

  if (!hasNextPage && !isLoading && !showCount) {
    return null
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-center',
        showCount ? 'justify-between' : 'justify-center',
        className,
      )}
    >
      {showCount ? (
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {loadedCount ?? 0}
          </span>
          {totalCount !== undefined ? ` of ${totalCount}` : null}
        </div>
      ) : null}
      {hasNextPage || isLoading ? (
        <Button
          variant="outline"
          size="sm"
          disabled={!hasNextPage || isLoading}
          onClick={() => {
            if (!hasNextPage || isLoading) return
            onLoadMore()
          }}
        >
          {isLoading ? 'Loading...' : label}
        </Button>
      ) : null}
    </div>
  )
}

export default Pagination
