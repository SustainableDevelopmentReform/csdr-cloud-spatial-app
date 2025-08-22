import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { QueryKey } from '~/utils/fetcher'
import { authClient, User } from '../../../utils/auth'
import { useState } from 'react'
import { useParams } from 'next/navigation'
import { z } from 'zod'

const userIdSchema = z.object({
  userId: z.string().optional(),
})

export const useUser = (id?: string) => {
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
  const [isOpen, setOpen] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [search, setSearch] = useState('')
  // const [selectedOrgId, setSelectedOrgId] = useState<string | undefined>(
  //   undefined,
  // )

  const { data } = useQuery({
    queryKey: [QueryKey.Users, page, search],
    queryFn: async () => {
      const res = await authClient.admin.listUsers({
        query: {
          searchValue: search,
          limit: pageSize,
          offset: (page - 1) * pageSize,
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
    placeholderData: keepPreviousData,
  })

  return {
    data,
    isOpen,
    setOpen,
    page,
    setPage,
    search,
    setSearch,
    pageSize,
  }
}
