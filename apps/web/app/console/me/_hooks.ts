import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useState } from 'react'
import { QueryKey } from '~/utils/fetcher'
import { authClient } from '../../../utils/auth'

export type ApiKey = NonNullable<ReturnType<typeof useApiKeys>['data']>[0]

export const useApiKeys = () => {
  const [isOpen, setOpen] = useState(false)

  const { data } = useQuery({
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
    data,
    isOpen,
    setOpen,
  }
}

export const useDeleteApiKey = (apiKeyId: string) => {
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
