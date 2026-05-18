import { redirect } from 'next/navigation'
import {
  PRODUCTS_RUNS_BASE_PATH,
  RESOURCE_SECTION_PARAM,
  RESOURCE_SUB_SECTION_PARAM,
  type PageSearchParams,
  withPageSearchParams,
} from '~/lib/paths'

export default async ({
  params,
  searchParams,
}: {
  params: Promise<{ productRunId: string }>
  searchParams: Promise<PageSearchParams>
}) => {
  const { productRunId } = await params

  redirect(
    withPageSearchParams(
      `${PRODUCTS_RUNS_BASE_PATH}/${productRunId}`,
      await searchParams,
      {
        [RESOURCE_SECTION_PARAM]: 'explore',
        [RESOURCE_SUB_SECTION_PARAM]: 'table',
      },
    ),
  )
}
