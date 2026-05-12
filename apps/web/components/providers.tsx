'use client'

import { Toaster } from '@repo/ui/components/ui/sonner'
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from '@tanstack/react-query'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { createContext, useContext, useEffect, useMemo, useRef } from 'react'
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
  mapStyleUrl: string | undefined
}>({
  appUrl: '',
  apiBaseUrl: '',
  mapStyleUrl: undefined,
})

export const AuthClientContext = createContext<AuthClient | null>(null)

export const useConfig = () => {
  return useContext(ConfigContext)
}

const AuthQueryInvalidator = ({ authClient }: { authClient: AuthClient }) => {
  const session = authClient.useSession()
  const queryClient = useQueryClient()
  const previousAuthKey = useRef<string | null>(null)

  useEffect(() => {
    if (session.data === undefined) {
      return
    }

    const currentAuthKey = session.data
      ? `${session.data.user.id}:${session.data.session.id}`
      : 'signed-out'

    if (previousAuthKey.current === null) {
      previousAuthKey.current = currentAuthKey
      return
    }

    if (previousAuthKey.current === currentAuthKey) {
      return
    }

    previousAuthKey.current = currentAuthKey
    void queryClient.invalidateQueries()
  }, [queryClient, session.data])

  return null
}

interface Props {
  children?: React.ReactNode
  appUrl: string
  apiBaseUrl: string
  mapStyleUrl?: string
}

const Providers: React.FC<Props> = ({
  children,
  appUrl,
  apiBaseUrl,
  mapStyleUrl,
}) => {
  const authClient = useMemo(() => createAuthClient(apiBaseUrl), [apiBaseUrl])

  return (
    <ConfigContext.Provider value={{ appUrl, apiBaseUrl, mapStyleUrl }}>
      <AuthClientContext.Provider value={authClient}>
        <NuqsAdapter>
          <QueryClientProvider client={queryClient}>
            <AuthQueryInvalidator authClient={authClient} />
            {children}
            <Toaster />
          </QueryClientProvider>
        </NuqsAdapter>
      </AuthClientContext.Provider>
    </ConfigContext.Provider>
  )
}

export default Providers
