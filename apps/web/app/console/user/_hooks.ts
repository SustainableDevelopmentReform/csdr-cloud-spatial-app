import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { z } from 'zod'
import { useAuthClient } from '~/hooks/useAuthClient'
import { QueryKey } from '~/utils/apiClient'
import { User } from '../../../utils/authClient'

export const userIdSchema = z.object({
  userId: z.string().optional(),
})

export const useUser = (id?: string) => {
  const authClient = useAuthClient()
  const params = useParams()
  const { userId } = id ? { userId: id } : userIdSchema.parse(params)

  return useQuery({
    queryKey: [QueryKey.UserProfile, userId],
    queryFn: async () => {
      if (!userId) return null
      const res = await authClient.admin.listUsers({
        query: {
          filterValue: userId,
          filterField: 'id',
          filterOperator: 'eq',
        },
      })

      if (res.error) {
        throw res.error
      }

      // Note we have to add type hint here due to better-auth type issues
      return res.data.users[0] as User | null
    },
    placeholderData: keepPreviousData,
  })
}

export const useUsers = () => {
  const authClient = useAuthClient()
  const [isOpen, setOpen] = useState(false)
  const pageSize = 10
  const [search, setSearch] = useState('')
  // const [selectedOrgId, setSelectedOrgId] = useState<string | undefined>(
  //   undefined,
  // )

  const queryResult = useInfiniteQuery({
    queryKey: [QueryKey.Users, search],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await authClient.admin.listUsers({
        query: {
          searchValue: search,
          limit: pageSize,
          offset: pageParam,
          // organizationId: selectedOrgId,
        },
      })

      if (res.error) {
        throw res.error
      }

      // Note we have to add type hint here due to better-auth type issues
      return res.data as {
        users: User[]
        total: number
        limit: number | undefined
        offset: number | undefined
      }
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce(
        (count, page) => count + page.users.length,
        0,
      )
      if (loaded >= lastPage.total) {
        return undefined
      }
      return loaded
    },
  })

  const aggregatedData = useMemo(() => {
    const pages = queryResult.data?.pages ?? []
    const users = pages.flatMap((page) => page.users)
    const total = pages[0]?.total ?? 0

    return {
      users,
      total,
    }
  }, [queryResult.data])

  return {
    ...queryResult,
    isOpen,
    setOpen,
    search,
    setSearch,
    pageSize,
    data: aggregatedData,
  }
}
