import { BadgeLink } from '../../../../components/badge-link'
import { GlobalVisibilityIndicator } from '~/app/console/_components/global-visibility-indicator'
import { ProductLinkParams, useProductLink } from '../_hooks'
import { Table2Icon } from 'lucide-react'

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
    <BadgeLink
      href={productLink(product)}
      variant="product"
      icon={<Table2Icon />}
      adornment={<GlobalVisibilityIndicator visibility={product.visibility} />}
    >
      {product.name}
    </BadgeLink>
  )
}
