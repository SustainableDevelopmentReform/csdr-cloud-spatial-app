import { ArrowUpRightIcon } from 'lucide-react'
import { BadgeLink } from '../../../../components/badge-link'
import { ProductOutputLinkParams, useProductOutputLink } from '../_hooks'

export const ProductOutputButtons = ({
  productOutputs,
}: {
  productOutputs: ProductOutputLinkParams[]
}) => {
  return (
    <div className="flex flex-wrap gap-2">
      {productOutputs?.map((productOutput) => (
        <ProductOutputButton
          productOutput={productOutput}
          key={productOutput.id}
        />
      ))}
    </div>
  )
}

export const ProductOutputButton = ({
  productOutput,
}: {
  productOutput: ProductOutputLinkParams
}) => {
  const productOutputLink = useProductOutputLink()

  return (
    <BadgeLink href={productOutputLink(productOutput)} variant="outline">
      {productOutput.id}
      <ArrowUpRightIcon className="size-4" />
    </BadgeLink>
  )
}
