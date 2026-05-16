'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { ConsoleSimpleBreadcrumbs } from '../../_components/console-simple-breadcrumbs'
import {
  DATA_LIBRARY_BASE_PATH,
  DATA_LIBRARY_SOURCE_PARAM,
  PRODUCTS_BASE_PATH,
  PRODUCTS_RUNS_BASE_PATH,
  PRODUCTS_RUNS_OUTPUTS_BASE_PATH,
  isDataLibrarySource,
  withDataLibrarySource,
} from '../../../../lib/paths'
import {
  useProduct,
  useProductOutput,
  useProductRun,
  useProductRunOutputsLink,
} from '../_hooks'

type BreadcrumbItem = {
  href?: string
  label: string
}

export const ProductsBreadcrumbs = () => {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const fromLibrary = isDataLibrarySource(
    searchParams.get(DATA_LIBRARY_SOURCE_PARAM),
  )

  const { data: productFromUrl } = useProduct()
  const { data: productRunFromUrl } = useProductRun()
  const { data: productOutputFromUrl } = useProductOutput()

  const product =
    productFromUrl ??
    productRunFromUrl?.product ??
    productOutputFromUrl?.productRun?.product
  const productRun = productRunFromUrl ?? productOutputFromUrl?.productRun

  const productRunOutputsLink = useProductRunOutputsLink()

  const items: BreadcrumbItem[] = [
    fromLibrary
      ? { label: 'Data', href: DATA_LIBRARY_BASE_PATH }
      : { label: 'Admin' },
  ]

  if (product) {
    items.push({
      label: product.name,
      href: fromLibrary
        ? withDataLibrarySource(`${PRODUCTS_BASE_PATH}/${product.id}`)
        : `${PRODUCTS_BASE_PATH}/${product.id}`,
    })
  }

  if (productRun) {
    items.push({
      label: productRun.name,
      href: fromLibrary
        ? withDataLibrarySource(`${PRODUCTS_RUNS_BASE_PATH}/${productRun.id}`)
        : `${PRODUCTS_RUNS_BASE_PATH}/${productRun.id}`,
    })
  }

  if (productRun && (pathname?.includes('outputs') || productOutputFromUrl)) {
    items.push({
      label: 'Outputs',
      href: productRunOutputsLink(productRun),
    })
  }

  if (productOutputFromUrl) {
    items.push({
      label: productOutputFromUrl.name,
      href: fromLibrary
        ? withDataLibrarySource(
            `${PRODUCTS_RUNS_OUTPUTS_BASE_PATH}/${productOutputFromUrl.id}`,
          )
        : `${PRODUCTS_RUNS_OUTPUTS_BASE_PATH}/${productOutputFromUrl.id}`,
    })
  }

  return <ConsoleSimpleBreadcrumbs items={items} />
}
