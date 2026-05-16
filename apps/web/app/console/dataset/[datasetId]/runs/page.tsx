import PageAuthGuard from '~/components/page-auth-guard'
import ClientPage from './client'
import { redirect } from 'next/navigation'
import {
  DATASETS_BASE_PATH,
  RESOURCE_SECTION_PARAM,
  type PageSearchParams,
  withPageSearchParams,
} from '~/lib/paths'

export default async ({
  params,
  searchParams,
}: {
  params: Promise<{ datasetId: string }>
  searchParams: Promise<PageSearchParams>
}) => {
  const { datasetId } = await params

  if (datasetId !== '*') {
    redirect(
      withPageSearchParams(
        `${DATASETS_BASE_PATH}/${datasetId}`,
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
