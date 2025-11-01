'use client'

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useState } from 'react'
import { QueryKey } from '~/utils/apiClient'
import { useAuthClient } from '~/hooks/useAuthClient'

export type ApiKey = NonNullable<ReturnType<typeof useApiKeys>['data']>[0]

export const useApiKeys = () => {
  const authClient = useAuthClient()
  const [isOpen, setOpen] = useState(false)

  const queryResult = useQuery({
    queryKey: [QueryKey.ApiKeys],
    queryFn: async () => {
      const res = await authClient.apiKey.list()

      if (res.error) {
        throw res.error
      }

      return res.data
    },
    placeholderData: keepPreviousData,
  })

  return {
    ...queryResult,
    isOpen,
    setOpen,
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
