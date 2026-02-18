'use client'

import {
  useRouter,
  useSearchParams as useSearchParamsNext,
} from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import { z } from 'zod'
import { getSearchParams } from '../utils/browser'

export const useQueryWithSearchParams = <T extends z.ZodObject<any>>(
  schema: T,
  override?: Partial<z.infer<T>>,
  useSearchParams?: boolean,
) => {
  const router = useRouter()

  // If useSearchParams is true, use the search params from the URL
  // Otherwise, use the local query state
  const searchParams = useSearchParamsNext()
  const [localQueryState, setLocalQueryState] = useState<
    Record<string, unknown>
  >({})

  const parsedResult = useMemo(() => {
    const params = useSearchParams
      ? (() => {
          const next: Record<string, string | string[]> = {}
          if (!searchParams) return next

          const uniqueKeys = new Set(searchParams.keys())
          for (const key of uniqueKeys) {
            const values = searchParams.getAll(key)
            if (values.length === 1) {
              next[key] = values[0]!
            } else if (values.length > 1) {
              next[key] = values
            }
          }

          return next
        })()
      : localQueryState

    return schema.safeParse({
      ...params,
      ...override,
    })
  }, [schema, searchParams, override, localQueryState, useSearchParams])

  const setSearchParams = useCallback(
    (params: Partial<z.infer<T>>, replace = false) => {
      const newParams = {
        ...(replace ? {} : parsedResult.data),
        ...params,
      }

      // Delete empty search params
      Object.keys(newParams).forEach((key) => {
        const value = newParams[key]
        if (
          value === '' ||
          value === undefined ||
          value === null ||
          (Array.isArray(value) && value.length === 0)
        ) {
          delete newParams[key]
        }
      })

      const searchParams = getSearchParams(newParams)
      if (useSearchParams) router.push(`?${searchParams}`)
      else setLocalQueryState(newParams)
    },
    [parsedResult.data, router, useSearchParams],
  )

  return {
    query: parsedResult.data,
    error: parsedResult.error,
    setSearchParams,
  }
}
