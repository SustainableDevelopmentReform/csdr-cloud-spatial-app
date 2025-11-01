import { ArrowUpRightIcon } from 'lucide-react'
import { BadgeLink } from '../../../../components/badge-link'
import { ProductLinkParams, useProductLink } from '../_hooks'

export const ProductButtons = ({
  products,
}: {
  products: ProductLinkParams[] | undefined
}) => {
  return (
    <div className="flex flex-wrap gap-2">
      {products?.map((product) => (
        <ProductButton product={product} key={product.id} />
      ))}
    </div>
  )
}

export const ProductButton = ({ product }: { product: ProductLinkParams }) => {
  const productLink = useProductLink()

  return (
    <BadgeLink href={productLink(product)} variant="product">
      {product.name}
      <ArrowUpRightIcon className="size-4" />
    </BadgeLink>
  )
}
