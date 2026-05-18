'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { QueryKey } from '~/utils/api-client'
import { useAuthClient } from '~/hooks/use-auth-client'

export type ApiKey = NonNullable<
  ReturnType<typeof useApiKeys>['data']
>['apiKeys'][number]
export type ApiKeySort = 'name' | 'createdAt' | 'expiresAt'
export type ApiKeySortOrder = 'asc' | 'desc'

export const useApiKeys = () => {
  const authClient = useAuthClient()
  const [isOpen, setOpen] = useState(false)
  const [sort, setSort] = useState<ApiKeySort | undefined>()
  const [order, setOrder] = useState<ApiKeySortOrder | undefined>()

  const queryResult = useQuery({
    queryKey: [QueryKey.ApiKeys, sort, order],
    queryFn: async () => {
      const res = await authClient.apiKey.list({
        query: {
          sortBy: sort,
          sortDirection: order,
        },
      })

      if (res.error) {
        throw res.error
      }

      return res.data
    },
  })

  return {
    ...queryResult,
    isOpen,
    setOpen,
    sort,
    setSort,
    order,
    setOrder,
  }
}

export const useDeleteApiKey = (apiKeyId: string) => {
  const authClient = useAuthClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const res = await authClient.apiKey.delete({ keyId: apiKeyId })

      if (res.error) {
        throw res.error
      }

      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryKey.ApiKeys],
      })
    },
  })
}
