import { BadgeLink } from '../../../../components/badge-link'
import { MainRunBadge } from '../../_components/main-run-badge'
import { ProductRunLinkParams, useProductRunLink } from '../_hooks'
import { Table2Icon } from 'lucide-react'

export const ProductRunButtons = ({
  productRuns,
}: {
  productRuns: ProductRunLinkParams[]
}) => {
  return (
    <div className="flex flex-wrap gap-2">
      {productRuns?.map((productRun) => (
        <ProductRunButton productRun={productRun} key={productRun.id} />
      ))}
    </div>
  )
}

export const ProductRunButton = ({
  productRun,
}: {
  productRun: ProductRunLinkParams
}) => {
  const productRunLink = useProductRunLink()

  return (
    <BadgeLink
      href={productRunLink(productRun)}
      variant="productRun"
      icon={<Table2Icon />}
    >
      {productRun.product.mainRunId === productRun.id && (
        <MainRunBadge size="xs" variant="product" />
      )}
      {productRun.name}
    </BadgeLink>
  )
}
