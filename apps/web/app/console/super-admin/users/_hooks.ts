import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { z } from 'zod'
import { useAuthClient } from '~/hooks/useAuthClient'
import { QueryKey } from '~/utils/apiClient'

const adminUserSchema = z.object({
  banned: z.boolean().optional(),
  createdAt: z.union([z.string(), z.date()]).nullable().optional(),
  email: z.string(),
  emailVerified: z.boolean(),
  id: z.string(),
  image: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  // Better Auth's admin client types do not include this two-factor plugin field,
  // but the runtime admin response includes it.
  twoFactorEnabled: z.boolean(),
})

const listUsersResponseSchema = z.object({
  limit: z.number().optional(),
  offset: z.number().optional(),
  total: z.number(),
  users: z.array(adminUserSchema),
})

export type AdminUser = z.infer<typeof adminUserSchema>

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

      const parsed = listUsersResponseSchema.parse(res.data)

      return parsed.users[0] ?? null
    },
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

      return listUsersResponseSchema.parse(res.data)
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

export const useAdminUserSearch = (
  search: string,
  enabled = true,
  limit = 10,
) => {
  const authClient = useAuthClient()

  return useQuery({
    queryKey: [QueryKey.Users, 'search', search, limit],
    enabled,
    queryFn: async () => {
      const res = await authClient.admin.listUsers({
        query: {
          limit,
          offset: 0,
          searchValue: search,
        },
      })

      if (res.error) {
        throw res.error
      }

      return listUsersResponseSchema.parse(res.data).users
    },
  })
}
