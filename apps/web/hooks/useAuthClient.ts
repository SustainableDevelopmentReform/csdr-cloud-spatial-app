'use client'

import { useContext } from 'react'
import { AuthClientContext, ConfigContext } from '../components/providers'
import type { AuthClient } from '../utils/authClient'

export const useAuthClient = (): AuthClient => {
  const { apiBaseUrl } = useContext(ConfigContext)
  const authClient = useContext(AuthClientContext)

  if (authClient === null) {
    throw new Error(`Auth client is not available for base URL ${apiBaseUrl}`)
  }

  return authClient
}
