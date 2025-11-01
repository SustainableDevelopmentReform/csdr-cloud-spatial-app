'use client'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@repo/ui/components/ui/breadcrumb'
import { usePathname } from 'next/navigation'
import Link from '../../../../components/link'
import { PRODUCTS_BASE_PATH } from '../../../../lib/paths'
import {
  useProduct,
  useProductOutput,
  useProductRun,
  useProductRunOutputsLink,
  useProductRunsLink,
} from '../_hooks'
import { ProductButton } from './product-button'
import { ProductOutputButton } from './product-output-button'
import { ProductRunButton } from './product-run-button'

export const ProductsBreadcrumbs = () => {
  const pathname = usePathname()

  const { data: productFromUrl } = useProduct()
  const { data: productRunFromUrl } = useProductRun()
  const { data: productOutputFromUrl } = useProductOutput()

  const product =
    productFromUrl ??
    productRunFromUrl?.product ??
    productOutputFromUrl?.productRun?.product
  const productRun = productRunFromUrl ?? productOutputFromUrl?.productRun

  const productRunOutputsLink = useProductRunOutputsLink()
  const productRunsLink = useProductRunsLink()
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/">Home</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href={PRODUCTS_BASE_PATH}>Products</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {product && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <ProductButton product={product} />
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}
        {product &&
          (pathname?.includes('runs') ||
            productRunFromUrl ||
            productOutputFromUrl) && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={productRunsLink(product)}>Runs</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
            </>
          )}

        {productRun && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <div className="flex items-center gap-1">
                  <ProductRunButton productRun={productRun} />
                </div>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}
        {productRun &&
          (pathname?.includes('outputs') || productOutputFromUrl) && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={`${productRunOutputsLink(productRun)}`}>
                    Outputs
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
            </>
          )}
        {productOutputFromUrl && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <ProductOutputButton productOutput={productOutputFromUrl} />
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
