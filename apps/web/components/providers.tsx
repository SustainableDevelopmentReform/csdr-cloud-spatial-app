'use client'

import { ServerError } from '@repo/server/src/lib/error.js'
import { toast, Toaster } from '@repo/ui/components/ui/sonner'
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { NuqsAdapter } from 'nuqs/adapters/next/app'

function handleError(data: any) {
  if ('statusCode' in data) {
    const err = data as InstanceType<typeof ServerError>['response']
    toast.error(err.message, {
      description: err.description,
    })
    return
  }

  if (data instanceof Error) {
    // Handle better-auth error
    if (
      'error' in data &&
      typeof data.error === 'object' &&
      data.error &&
      'message' in data.error &&
      typeof data.error.message === 'string'
    ) {
      toast.error(data.message, {
        description: data.error.message,
      })
      return
    }

    toast.error(data.message, {
      description: data.cause?.toString() ?? 'Unknown error',
    })
  }
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 24 * 60 * 60 * 1000, // stale time 24 hours
    },
  },
  queryCache: new QueryCache({
    onError: handleError,
  }),
  mutationCache: new MutationCache({
    onError: handleError,
  }),
})

interface Props {
  children?: React.ReactNode
}

const Providers: React.FC<Props> = ({ children }) => {
  return (
    <NuqsAdapter>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster />
      </QueryClientProvider>
    </NuqsAdapter>
  )
}

export default Providers
