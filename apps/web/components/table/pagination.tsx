import { Button } from '@repo/ui/components/ui/button'
import { cn } from '@repo/ui/lib/utils'

interface LoadMoreProps {
  hasNextPage: boolean
  onLoadMore: () => void
  isLoading?: boolean
  className?: string
  label?: string
}

const Pagination = ({
  hasNextPage,
  onLoadMore,
  isLoading = false,
  className,
  label = 'Load more',
}: LoadMoreProps) => {
  if (!hasNextPage && !isLoading) {
    return null
  }

  return (
    <div className={cn('flex justify-center', className)}>
      <Button
        variant="outline"
        size="sm"
        disabled={!hasNextPage || isLoading}
        onClick={() => {
          if (!hasNextPage || isLoading) return
          onLoadMore()
        }}
      >
        {isLoading ? 'Loading…' : label}
      </Button>
    </div>
  )
}

export default Pagination
