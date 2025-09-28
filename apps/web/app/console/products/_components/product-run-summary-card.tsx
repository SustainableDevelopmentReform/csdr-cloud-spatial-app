import { LoadingIcon } from '@repo/ui/components/ui/loading-icon'
import { ArrowUpRightIcon, RefreshCwIcon } from 'lucide-react'
import { formatDate, formatDateTime } from '../../../../utils/date'
import { DetailCard } from '../../_components/detail-cards'
import { NoMainRunCard } from '../../_components/no-main-run-card'
import { VariableButton } from '../../variables/_components/variable-button'
import {
  ProductRunDetail,
  useProductRunLink,
  useRefreshProductRunSummary,
} from '../_hooks'

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
            {run?.outputSummary?.variables?.map((variable) => (
              <div className="flex flex-col gap-2" key={variable.variable.id}>
                <VariableButton variable={variable.variable} />
                <div className="flex flex-col gap-1">
                  <div>Count: {variable.count}</div>
                  <div>
                    Data range: {variable.minValue} to {variable.maxValue}
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
