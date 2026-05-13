import { BadgeLink } from '../../../../components/badge-link'
import { withDataLibrarySource } from '~/lib/paths'
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

export const ProductButton = ({
  fromLibrary = false,
  product,
}: {
  fromLibrary?: boolean
  product: ProductLinkParams
}) => {
  const productLink = useProductLink()
  const href = productLink(product)

  return (
    <BadgeLink
      href={fromLibrary ? withDataLibrarySource(href) : href}
      icon={<Table2Icon />}
      adornment={<GlobalVisibilityIndicator visibility={product.visibility} />}
    >
      {product.name}
    </BadgeLink>
  )
}
