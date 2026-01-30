import { Button } from '@repo/ui/components/ui/button'
import { ProductRunDetail, useRefreshProductRunSummary } from '../_hooks'
import { LoadingIcon } from '@repo/ui/components/ui/loading-icon'

export const RefreshProductSummary = ({
  run,
}: {
  run?: ProductRunDetail | null
}) => {
  const refreshProductSummary = useRefreshProductRunSummary(run)
  return (
    <Button
      onClick={() => refreshProductSummary.mutate()}
      disabled={!run?.id}
      variant="outline"
      className="w-fit text-primary"
    >
      {refreshProductSummary.isPending ? (
        <LoadingIcon>'Loading...'</LoadingIcon>
      ) : (
        'Refresh Product Summary'
      )}
    </Button>
  )
}
