import { LoadingIcon } from '@repo/ui/components/ui/loading-icon'
import { ArrowUpRightIcon, RefreshCwIcon } from 'lucide-react'
import { formatDateTime, formatDate } from '@repo/ui/lib/date'
import { DetailCard } from '../../_components/detail-cards'
import { NoMainRunCard } from '../../_components/no-main-run-card'
import { IndicatorButton } from '../../indicator/_components/indicator-button'
import {
  ProductRunDetail,
  useProductRunLink,
  useRefreshProductRunSummary,
} from '../_hooks'
import { AssignDerivedIndicatorsDialog } from './assign-derived-indicators'
import { RefreshProductSummary } from './refresh-product-summary'

export const ProductRunSummaryCard = ({
  run,
  mainRun = false,
}: {
  run?: ProductRunDetail | undefined | null
  mainRun?: boolean
}) => {
  const productRunLink = useProductRunLink()
  const refreshProductRunSummary = useRefreshProductRunSummary(run)

  if (!run && mainRun) {
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
      description={mainRun ? 'Product Main Run Summary' : 'Product Run Summary'}
      actionText="Open"
      actionLink={run && mainRun ? productRunLink(run) : undefined}
      actionIcon={<ArrowUpRightIcon />}
      footer={`Data range: ${formatDate(run?.outputSummary?.startTime)} to ${formatDate(run?.outputSummary?.endTime)}`}
      subFooter={
        <div className="flex flex-col gap-4">
          {`${run?.outputSummary?.outputCount} outputs`}
          <div className="flex flex-col gap-4">
            {run?.outputSummary?.indicators?.map((indicator) => (
              <div
                className="flex flex-col gap-2"
                key={indicator.indicator?.id}
              >
                {indicator.indicator && (
                  <IndicatorButton indicator={indicator.indicator} />
                )}
                <div className="flex flex-col gap-1">
                  <div>Count: {indicator.count}</div>
                  <div>
                    Data range: {indicator.minValue} to {indicator.maxValue}
                  </div>
                  <div>Mean: {indicator.avgValue}</div>
                </div>
              </div>
            ))}
          </div>
          <AssignDerivedIndicatorsDialog run={run} />
          <RefreshProductSummary run={run} />
        </div>
      }
    />
  )
}
