import { Textarea } from '@repo/ui/components/ui/textarea'
import { DetailCard } from '../../_components/detail-cards'
import { useDerivedIndicator } from '../../indicator/_hooks'
import { IndicatorButton } from '../../indicator/_components/indicator-button'
import { ExpressionFieldDescription } from '../../indicator/client'
import { ProductOutputListItem } from '../_hooks'

export const DerivedIndicatorSummaryCard = ({
  productOutput,
}: {
  productOutput: ProductOutputListItem | undefined | null
}) => {
  const { data: derivedIndicator } = useDerivedIndicator(
    productOutput?.indicator?.type === 'derived'
      ? productOutput?.indicator?.id
      : undefined,
  )

  if (!derivedIndicator) {
    return null
  }

  return (
    <DetailCard
      title={derivedIndicator.name}
      description="Derived Indicator Summary"
      footer={
        <div className="flex flex-col gap-2">
          <ExpressionFieldDescription
            indicators={derivedIndicator.indicators}
          />
          <Textarea
            className={'font-mono'}
            disabled={true}
            value={derivedIndicator.expression}
          />
        </div>
      }
      actionButton={<IndicatorButton indicator={derivedIndicator} />}
    />
  )
}
