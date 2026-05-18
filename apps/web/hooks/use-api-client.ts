'use client'

import { createApiClient } from '../utils/api-client'
import { useContext, useMemo } from 'react'
import { ConfigContext } from '../components/providers'

export const useApiClient = () => {
  const { apiBaseUrl } = useContext(ConfigContext)

  return useMemo(() => createApiClient(apiBaseUrl), [apiBaseUrl])
}
