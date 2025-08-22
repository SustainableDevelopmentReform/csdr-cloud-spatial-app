import { ArrowUpRightIcon } from 'lucide-react'
import { BadgeLink } from '../../../../components/badge-link'
import { ProductRun } from '../_hooks'
import { useProductRunLink } from '../_hooks'
import { MainRunBadge } from '../../_components/main-run-badge'

export const ProductRunButtons = ({
  productRuns,
}: {
  productRuns: ProductRun[]
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
  isMainRun,
}: {
  productRun: ProductRun
  isMainRun?: boolean
}) => {
  const productRunLink = useProductRunLink()

  return (
    <BadgeLink href={productRunLink(productRun)} variant="productRun">
      {productRun.id}
      {isMainRun && <MainRunBadge size="xs" variant="product" />}
      <ArrowUpRightIcon className="size-4" />
    </BadgeLink>
  )
}
