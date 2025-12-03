import { formatDateTime } from '@repo/ui/lib/date'
import { ProductOutputDetail, useProductOutputLink } from '../_hooks'
import { VariableButton } from '../../variable/_components/variable-button'
import { DetailCard } from '../../_components/detail-cards'
import { ArrowUpRightIcon } from 'lucide-react'

export const ProductOutputSummaryCard = ({
  productOutput,
  showLink,
}: {
  productOutput: ProductOutputDetail | undefined | null
  showLink?: boolean
}) => {
  const productOutputLink = useProductOutputLink()
  if (!productOutput) {
    return null
  }

  return (
    <DetailCard
      title={productOutput.value.toString()}
      description="Output Value"
      footer={formatDateTime(productOutput.timePoint)}
      subFooter={<VariableButton variable={productOutput.variable} />}
      actionText={showLink ? 'Open' : undefined}
      actionLink={showLink ? productOutputLink(productOutput) : undefined}
      actionIcon={showLink ? <ArrowUpRightIcon /> : undefined}
    />
  )
}
