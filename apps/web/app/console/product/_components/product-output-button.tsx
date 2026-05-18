import { BadgeLink } from '../../../../components/badge-link'
import { ProductOutputLinkParams, useProductOutputLink } from '../_hooks'
import { Table2Icon } from 'lucide-react'

export const ProductOutputButton = ({
  productOutput,
}: {
  productOutput: ProductOutputLinkParams
}) => {
  const productOutputLink = useProductOutputLink()

  return (
    <BadgeLink href={productOutputLink(productOutput)} icon={<Table2Icon />}>
      {productOutput.name}
    </BadgeLink>
  )
}
