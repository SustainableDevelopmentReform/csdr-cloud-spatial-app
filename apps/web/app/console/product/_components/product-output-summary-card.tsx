import { formatDateTime } from '@repo/ui/lib/date'
import { Value } from '../../../../components/value'
import { DetailCard } from '../../_components/detail-cards'
import { IndicatorButton } from '../../indicator/_components/indicator-button'
import { ProductOutputListItem } from '../_hooks'
import { ProductOutputButton } from './product-output-button'

type ProductOutputSummary = Pick<
  ProductOutputListItem,
  'id' | 'indicator' | 'name' | 'timePoint' | 'value'
>

export const ProductOutputSummaryCard = ({
  productOutput,
  showLink,
}: {
  productOutput: ProductOutputSummary | undefined | null
  showLink?: boolean
}) => {
  if (!productOutput) {
    return null
  }

  return (
    <DetailCard
      title={
        <Value
          value={productOutput.value}
          indicator={productOutput.indicator}
          large
        />
      }
      description="Output Value"
      footer={formatDateTime(productOutput.timePoint)}
      subFooter={
        productOutput.indicator && (
          <IndicatorButton indicator={productOutput.indicator} />
        )
      }
      actionButton={
        showLink ? (
          <ProductOutputButton productOutput={productOutput} />
        ) : undefined
      }
    />
  )
}
