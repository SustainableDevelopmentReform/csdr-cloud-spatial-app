'use client'

import { Toaster } from '@repo/ui/components/ui/sonner'
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { createContext, useContext, useMemo } from 'react'
import { createAuthClient, type AuthClient } from '~/utils/authClient'
import { toastError } from '~/utils/error-handling'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 24 * 60 * 60 * 1000, // stale time 24 hours
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      toastError(error)
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.meta?.suppressGlobalErrorToast === true) {
        return
      }

      toastError(error)
    },
  }),
})

export const ConfigContext = createContext<{
  appUrl: string
  apiBaseUrl: string
}>({
  appUrl: '',
  apiBaseUrl: '',
})

export const AuthClientContext = createContext<AuthClient | null>(null)

export const useConfig = () => {
  return useContext(ConfigContext)
}

interface Props {
  children?: React.ReactNode
  appUrl: string
  apiBaseUrl: string
}

const Providers: React.FC<Props> = ({ children, appUrl, apiBaseUrl }) => {
  const authClient = useMemo(() => createAuthClient(apiBaseUrl), [apiBaseUrl])

  return (
    <ConfigContext.Provider value={{ appUrl, apiBaseUrl }}>
      <AuthClientContext.Provider value={authClient}>
        <NuqsAdapter>
          <QueryClientProvider client={queryClient}>
            {children}
            <Toaster />
          </QueryClientProvider>
        </NuqsAdapter>
      </AuthClientContext.Provider>
    </ConfigContext.Provider>
  )
}

export default Providers
