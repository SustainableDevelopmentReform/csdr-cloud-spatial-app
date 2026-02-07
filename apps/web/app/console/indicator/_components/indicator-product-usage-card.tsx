import { pluralize } from '@repo/ui/lib/utils'
import { DetailCard } from '../../_components/detail-cards'
import { DerivedIndicatorDetail } from '../_hooks'
import { MeasuredIndicatorDetail } from '../_hooks'
import { useProductsLink } from '../../product/_hooks'
import { ArrowUpRightIcon } from 'lucide-react'

export const IndicatorProductUsageCard = ({
  indicator,
}: {
  indicator: DerivedIndicatorDetail | MeasuredIndicatorDetail | null | undefined
}) => {
  const productsLink = useProductsLink()
  return indicator ? (
    <DetailCard
      title={`${indicator.productCount} ${pluralize(indicator.productCount, 'product', 'products')}`}
      description="Used by Products"
      actionText="Open"
      actionLink={productsLink({
        indicatorId: indicator.id,
      })}
      actionIcon={<ArrowUpRightIcon />}
    />
  ) : null
}
