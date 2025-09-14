import { LoadingIcon } from '@repo/ui/components/ui/loading-icon'
import { ArrowUpRightIcon, RefreshCwIcon } from 'lucide-react'
import { formatDate, formatDateTime } from '../../../../utils/date'
import { DetailCard } from '../../_components/detail-cards'
import { NoMainRunCard } from '../../_components/no-main-run-card'
import { VariableButton } from '../../variables/_components/variable-button'
import {
  ProductDetail,
  ProductRunDetail,
  useProductRunLink,
  useRefreshProductRunSummary,
} from '../_hooks'

export const ProductRunSummaryCard = ({
  product,
  productRun,
}: {
  product: ProductDetail | undefined | null
  productRun?: ProductRunDetail | undefined | null
}) => {
  const productRunLink = useProductRunLink()
  const run = productRun ?? product?.mainRun ?? undefined
  const refreshProductRunSummary = useRefreshProductRunSummary(run)

  if (!run) {
    return <NoMainRunCard />
  }

  if (!run?.outputSummary) {
    return (
      <DetailCard
        title={`No summary`}
        description="Main Run"
        actionText="Refresh"
        actionOnClick={() => {
          refreshProductRunSummary.mutate()
        }}
        actionIcon={
          refreshProductRunSummary.isPending ? (
            <LoadingIcon />
          ) : (
            <RefreshCwIcon />
          )
        }
      />
    )
  }

  return (
    <DetailCard
      title={`Created at ${formatDateTime(run?.createdAt)}`}
      description={
        productRun ? 'Product Run Summary' : 'Product Main Run Summary'
      }
      actionText="Open"
      actionLink={!productRun ? productRunLink(run) : undefined}
      actionIcon={<ArrowUpRightIcon />}
      footer={`Data range: ${formatDate(run?.outputSummary?.startTime)} to ${formatDate(run?.outputSummary?.endTime)}`}
      subFooter={
        <div className="flex flex-col gap-4">
          {`${run?.outputSummary?.outputCount} outputs`}
          <div className="flex flex-col gap-4">
            {run?.outputSummary?.variables?.map((variable) => (
              <div className="flex flex-col gap-2" key={variable.variable.id}>
                <VariableButton variable={variable.variable} />
                <div className="flex flex-col gap-1">
                  <div>
                    Data range: {variable.minValue} to {variable.maxValue} over{' '}
                    {variable.count} outputs
                  </div>
                  <div>Mean: {variable.avgValue}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      }
    />
  )
}
