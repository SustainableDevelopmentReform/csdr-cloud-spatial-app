import PageAuthGuard from '~/components/page-auth-guard'
import ClientPage from './client'
import { redirect } from 'next/navigation'
import {
  PRODUCTS_BASE_PATH,
  RESOURCE_SECTION_PARAM,
  type PageSearchParams,
  withPageSearchParams,
} from '~/lib/paths'

export default async ({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>
  searchParams: Promise<PageSearchParams>
}) => {
  const { productId } = await params

  if (productId !== '*') {
    redirect(
      withPageSearchParams(
        `${PRODUCTS_BASE_PATH}/${productId}`,
        await searchParams,
        {
          [RESOURCE_SECTION_PARAM]: 'versions',
        },
      ),
    )
  }

  return (
    <PageAuthGuard allowAnonymous>
      <ClientPage />
    </PageAuthGuard>
  )
}
