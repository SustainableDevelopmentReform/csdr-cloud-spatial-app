'use client'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@repo/ui/components/ui/breadcrumb'
import Link from '../../../../components/link'
import {
  useProduct,
  useProductLink,
  useProductOutput,
  useProductOutputLink,
  useProductRun,
  useProductRunLink,
} from '../_hooks'
import { usePathname } from 'next/navigation'

export const ProductsBreadcrumbs = () => {
  const pathname = usePathname()

  const { data: product } = useProduct()
  const { data: productRun } = useProductRun()
  const { data: productOutput } = useProductOutput()
  const productLink = useProductLink()
  const productRunLink = useProductRunLink()
  const productOutputLink = useProductOutputLink()

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
                <Link href={productLink(product)}>{product.name}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}
        {product && pathname?.includes('runs') && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`${productLink(product)}/runs`}>Runs</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}

        {productRun && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={productRunLink(productRun)}>{productRun.id}</Link>
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
                <Link href={productOutputLink(productOutput)}>
                  {productOutput.id}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
