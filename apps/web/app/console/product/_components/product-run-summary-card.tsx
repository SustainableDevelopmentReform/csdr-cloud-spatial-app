import { LoadingIcon } from '@repo/ui/components/ui/loading-icon'
import { RefreshCwIcon } from 'lucide-react'
import { formatDateTime, formatDate } from '@repo/ui/lib/date'
import { DetailCard } from '../../_components/detail-cards'
import { NoMainRunCard } from '../../_components/no-main-run-card'
import { IndicatorButton } from '../../indicator/_components/indicator-button'
import {
  ProductRunDetail,
  useProductRunOutputsLink,
  useRefreshProductRunSummary,
} from '../_hooks'
import { AssignDerivedIndicatorsDialog } from './assign-derived-indicators'
import { RefreshProductSummary } from './refresh-product-summary'
import { BadgeLink } from '../../../../components/badge-link'
import { Value } from '../../../../components/value'
import { ProductRunButton } from './product-run-button'

export const ProductRunSummaryCard = ({
  run,
  mainRun = false,
}: {
  run?: ProductRunDetail | undefined | null
  mainRun?: boolean
}) => {
  const productRunOutputsLink = useProductRunOutputsLink()
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
      actionButton={
        run && mainRun ? <ProductRunButton productRun={run} /> : undefined
      }
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
                  <div className="flex items-center gap-2">
                    Count:{' '}
                    <BadgeLink
                      href={productRunOutputsLink(run, {
                        indicatorId: indicator.indicator?.id,
                      })}
                      variant="outline"
                    >
                      {indicator.count} outputs
                    </BadgeLink>
                  </div>
                  <div>
                    Data range:{' '}
                    {
                      <Value
                        value={indicator.minValue}
                        indicator={indicator.indicator}
                      />
                    }{' '}
                    to{' '}
                    {
                      <Value
                        value={indicator.maxValue}
                        indicator={indicator.indicator}
                      />
                    }
                  </div>
                  <div>
                    Mean:{' '}
                    {
                      <Value
                        value={indicator.avgValue}
                        indicator={indicator.indicator}
                      />
                    }
                  </div>
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
