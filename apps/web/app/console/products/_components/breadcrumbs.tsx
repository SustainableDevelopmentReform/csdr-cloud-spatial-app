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
import {
  useProduct,
  useProductOutput,
  useProductOutputLink,
  useProductRun,
  useProductRunLink,
  useProductRunsLink,
} from '../_hooks'
import { ProductButton } from './product-button'
import { ProductRunButton } from './product-run-button'
import { ProductOutputButton } from './product-output-button'

export const ProductsBreadcrumbs = () => {
  const pathname = usePathname()

  const { data: product } = useProduct()
  const { data: productRun } = useProductRun()
  const { data: productOutput } = useProductOutput()

  const productRunLink = useProductRunLink()
  const productOutputLink = useProductOutputLink()
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
            <Link href="/console/products">Products</Link>
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
        {pathname?.includes('runs') && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={productRunsLink(product ?? null)}>Runs</Link>
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
        {productRun && pathname?.includes('outputs') && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`${productRunLink(productRun)}/outputs`}>
                  Outputs
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}
        {productOutput && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <ProductOutputButton productOutput={productOutput} />
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
