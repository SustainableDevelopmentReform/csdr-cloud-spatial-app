'use client'

// import { ServerError } from '@repo/server/src/lib/error.js'
import { toast, Toaster } from '@repo/ui/components/ui/sonner'
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { createContext, useContext } from 'react'

function handleError(data: any) {
  if ('statusCode' in data) {
    // const err = data as InstanceType<typeof ServerError>['response']
    const err = data as any
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

  if (typeof data === 'string') {
    toast.error(data)
    return
  }

  // If object with message string
  if (
    typeof data === 'object' &&
    data &&
    'message' in data &&
    typeof data.message === 'string'
  ) {
    toast.error(data.message)
    return
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

export const ConfigContext = createContext<{
  appUrl: string
  apiBaseUrl: string
  dataBaseUrl: string | undefined
}>({
  appUrl: '',
  apiBaseUrl: '',
  dataBaseUrl: undefined,
})

export const useConfig = () => {
  return useContext(ConfigContext)
}

interface Props {
  children?: React.ReactNode
  appUrl: string
  apiBaseUrl: string
  dataBaseUrl: string | undefined
}

const Providers: React.FC<Props> = ({
  children,
  appUrl,
  apiBaseUrl,
  dataBaseUrl,
}) => {
  return (
    <ConfigContext.Provider value={{ appUrl, apiBaseUrl, dataBaseUrl }}>
      <NuqsAdapter>
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster />
        </QueryClientProvider>
      </NuqsAdapter>
    </ConfigContext.Provider>
  )
}

export default Providers
