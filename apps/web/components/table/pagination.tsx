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

  if (showCount) {
    return (
      <div
        className={cn(
          'grid grid-cols-1 items-center gap-3 sm:grid-cols-[1fr_auto_1fr]',
          className,
        )}
      >
        <div className="text-center text-sm text-muted-foreground sm:col-start-2">
          <span className="font-medium text-foreground">
            {loadedCount ?? 0}
          </span>
          {totalCount !== undefined ? ` of ${totalCount}` : null}
        </div>
        {hasNextPage || isLoading ? (
          <Button
            className="justify-self-center sm:col-start-3 sm:justify-self-end"
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

  return (
    <div
      className={cn(
        'flex flex-col justify-center gap-3 sm:flex-row sm:items-center',
        className,
      )}
    >
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
