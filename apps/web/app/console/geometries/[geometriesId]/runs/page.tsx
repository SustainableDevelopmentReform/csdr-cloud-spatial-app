import PageAuthGuard from '~/components/page-auth-guard'
import ClientPage from './client'
import { redirect } from 'next/navigation'
import {
  GEOMETRIES_BASE_PATH,
  RESOURCE_SECTION_PARAM,
  type PageSearchParams,
  withPageSearchParams,
} from '~/lib/paths'

export default async ({
  params,
  searchParams,
}: {
  params: Promise<{ geometriesId: string }>
  searchParams: Promise<PageSearchParams>
}) => {
  const { geometriesId } = await params

  if (geometriesId !== '*') {
    redirect(
      withPageSearchParams(
        `${GEOMETRIES_BASE_PATH}/${geometriesId}`,
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
