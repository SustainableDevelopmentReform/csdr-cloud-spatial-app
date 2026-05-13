import { BadgeLink } from '../../../../components/badge-link'
import { MainRunBadge } from '../../_components/main-run-badge'
import { ProductRunLinkParams, useProductRunLink } from '../_hooks'
import { SquareFunctionIcon } from 'lucide-react'

export const ProductRunButton = ({
  productRun,
}: {
  productRun: ProductRunLinkParams
}) => {
  const productRunLink = useProductRunLink()

  return (
    <BadgeLink href={productRunLink(productRun)} icon={<SquareFunctionIcon />}>
      {productRun.product.mainRunId === productRun.id && (
        <MainRunBadge size="xs" />
      )}
      {productRun.name}
    </BadgeLink>
  )
}
