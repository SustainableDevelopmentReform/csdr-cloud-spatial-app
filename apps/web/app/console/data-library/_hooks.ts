'use client'

import { dataLibraryQuerySchema } from '@repo/schemas/crud'
import { useInfiniteQuery } from '@tanstack/react-query'
import { InferResponseType } from 'hono/client'
import { z } from 'zod'
import {
  getNextPaginatedPageParam,
  useMergedPaginatedInfiniteData,
} from '~/hooks/merge-paginated-infinite-data'
import { useApiClient } from '~/hooks/use-api-client'
import { useQueryWithSearchParams } from '~/hooks/use-search-params'
import { Client, unwrapResponse } from '~/utils/api-client'

export type DataLibraryQuery = z.infer<typeof dataLibraryQuerySchema>
export type DataLibraryListResponse = NonNullable<
  InferResponseType<Client['api']['v0']['data-library']['$get'], 200>['data']
>
export type DataLibraryListItem = DataLibraryListResponse['data'][0]
export type DataLibraryResourceType = DataLibraryListItem['resourceType']

export const dataLibraryQueryKeys = {
  all: ['data-library'] as const,
  list: (query: DataLibraryQuery | undefined) =>
    [...dataLibraryQueryKeys.all, 'list', { query }] as const,
}

export const useDataLibrary = (
  _query?: DataLibraryQuery,
  useSearchParams?: boolean,
) => {
  const client = useApiClient()
  const { query, setSearchParams } = useQueryWithSearchParams(
    dataLibraryQuerySchema,
    _query,
    useSearchParams,
  )

  const queryResult = useInfiniteQuery<DataLibraryListResponse>({
    queryKey: dataLibraryQueryKeys.list(query),
    queryFn: async ({ pageParam = 1 }) => {
      const res = client.api.v0['data-library'].$get({
        query: {
          ...query,
          page: pageParam,
        },
      })

      const json = await unwrapResponse(res)

      return json.data
    },
    initialPageParam: 1,
    getNextPageParam: getNextPaginatedPageParam,
  })

  const aggregatedData = useMergedPaginatedInfiniteData(queryResult.data)

  return {
    ...queryResult,
    data: aggregatedData,
    setSearchParams,
    query,
  }
}
