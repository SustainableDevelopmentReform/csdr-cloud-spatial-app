import { BadgeLink } from '../../../../components/badge-link'
import { ProductOutputLinkParams, useProductOutputLink } from '../_hooks'
import { Table2Icon } from 'lucide-react'

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
    <BadgeLink
      href={productOutputLink(productOutput)}
      variant="outline"
      className="border-product"
      icon={<Table2Icon />}
    >
      {productOutput.name}
    </BadgeLink>
  )
}
