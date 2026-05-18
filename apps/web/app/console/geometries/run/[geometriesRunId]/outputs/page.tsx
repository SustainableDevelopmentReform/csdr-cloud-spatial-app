import { redirect } from 'next/navigation'
import {
  GEOMETRIES_RUNS_BASE_PATH,
  RESOURCE_SECTION_PARAM,
  RESOURCE_SUB_SECTION_PARAM,
  type PageSearchParams,
  withPageSearchParams,
} from '~/lib/paths'

export default async ({
  params,
  searchParams,
}: {
  params: Promise<{ geometriesRunId: string }>
  searchParams: Promise<PageSearchParams>
}) => {
  const { geometriesRunId } = await params

  redirect(
    withPageSearchParams(
      `${GEOMETRIES_RUNS_BASE_PATH}/${geometriesRunId}`,
      await searchParams,
      {
        [RESOURCE_SECTION_PARAM]: 'explore',
        [RESOURCE_SUB_SECTION_PARAM]: 'table',
      },
    ),
  )
}
