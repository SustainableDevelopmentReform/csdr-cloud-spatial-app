'use client'

import { useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import {
  DATA_LIBRARY_SOURCE_PARAM,
  isDataLibrarySource,
  withDataLibrarySource,
} from '~/lib/paths'

export const useDataLibrarySourceHref = () => {
  const searchParams = useSearchParams()
  const fromLibrary = isDataLibrarySource(
    searchParams.get(DATA_LIBRARY_SOURCE_PARAM),
  )

  return useCallback(
    (href: string) => (fromLibrary ? withDataLibrarySource(href) : href),
    [fromLibrary],
  )
}
