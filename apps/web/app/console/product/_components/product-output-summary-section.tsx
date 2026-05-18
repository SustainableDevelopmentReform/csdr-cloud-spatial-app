import { formatDate, formatDateTime } from '@repo/ui/lib/date'
import {
  OverviewSection,
  OverviewText,
} from '../../_components/resource-detail-mode'
import { BadgeLink } from '../../../../components/badge-link'
import { Value } from '../../../../components/value'
import { IndicatorButton } from '../../indicator/_components/indicator-button'
import {
  type ProductDetail,
  type ProductRunDetail,
  useProductRunOutputsLink,
} from '../_hooks'
import { AssignDerivedIndicatorsDialog } from './assign-derived-indicators'
import { RefreshProductSummary } from './refresh-product-summary'

export const ProductOutputSummarySection = ({
  canEdit,
  run,
}: {
  canEdit: boolean
  run?: ProductRunDetail | ProductDetail['mainRun'] | null
}) => {
  const productRunOutputsLink = useProductRunOutputsLink()

  if (!run) {
    return (
      <OverviewSection title="Output summary">
        <OverviewText>
          No latest version. Set a version as latest to see the summary here.
        </OverviewText>
      </OverviewSection>
    )
  }

  if (!run.outputSummary) {
    return (
      <OverviewSection title="Output summary">
        <div className="flex flex-col gap-3">
          <OverviewText>No summary.</OverviewText>
          {canEdit ? <RefreshProductSummary run={run} /> : null}
        </div>
      </OverviewSection>
    )
  }

  return (
    <OverviewSection title="Output summary">
      <div className="flex flex-col gap-4">
        <OverviewText>
          {`Created: ${formatDateTime(run.createdAt)}
Outputs: ${run.outputSummary.outputCount}
Data range: ${formatDate(run.outputSummary.startTime)} to ${formatDate(run.outputSummary.endTime)}
Time points: ${run.outputSummary.timePoints?.length ?? 0}`}
        </OverviewText>
        <div className="flex flex-col gap-4">
          {run.outputSummary.indicators.length > 0 ? (
            run.outputSummary.indicators.map((indicatorSummary, index) => {
              const indicator = indicatorSummary.indicator
              const key = indicator?.id ?? `indicator-${index}`

              return (
                <div className="flex flex-col gap-2" key={key}>
                  {indicator ? <IndicatorButton indicator={indicator} /> : null}
                  <div className="flex flex-col gap-1 text-sm leading-5 text-muted-foreground">
                    <div className="flex flex-wrap items-center gap-2">
                      Count:
                      {indicator?.id ? (
                        <BadgeLink
                          href={productRunOutputsLink(run, {
                            indicatorId: indicator.id,
                          })}
                        >
                          {indicatorSummary.count} outputs
                        </BadgeLink>
                      ) : (
                        <span>{indicatorSummary.count} outputs</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      Data range:
                      <Value
                        value={indicatorSummary.minValue}
                        indicator={indicator}
                      />
                      to
                      <Value
                        value={indicatorSummary.maxValue}
                        indicator={indicator}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      Mean:
                      <Value
                        value={indicatorSummary.avgValue}
                        indicator={indicator}
                      />
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <OverviewText>No indicators.</OverviewText>
          )}
        </div>
        {canEdit ? (
          <div className="flex flex-wrap items-center gap-2">
            <AssignDerivedIndicatorsDialog run={run} />
            <RefreshProductSummary run={run} />
          </div>
        ) : null}
      </div>
    </OverviewSection>
  )
}
