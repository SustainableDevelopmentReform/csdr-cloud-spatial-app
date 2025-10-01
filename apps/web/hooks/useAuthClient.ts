'use client'

import { createAuthClient } from '../utils/authClient'
import { useContext, useMemo } from 'react'
import { ConfigContext } from '../components/providers'

export const useAuthClient = () => {
  const { apiBaseUrl } = useContext(ConfigContext)

  return useMemo(() => createAuthClient(apiBaseUrl), [apiBaseUrl])
}
