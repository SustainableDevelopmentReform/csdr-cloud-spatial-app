'use client'

import {
  useRouter,
  useSearchParams as useSearchParamsNext,
} from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import { z } from 'zod'
import { getSearchParams } from '../utils/browser'

export const useQueryWithSearchParams = <
  Schema extends z.ZodObject<z.ZodRawShape>,
>(
  schema: Schema,
  override?: Partial<z.infer<Schema>>,
  syncWithUrl: boolean = false,
) => {
  const router = useRouter()
  const searchParams = useSearchParamsNext()
  const [localQueryState, setLocalQueryState] = useState<
    Record<string, unknown>
  >({})

  const parsedResult = useMemo(() => {
    const params = syncWithUrl
      ? (() => {
          const next: Record<string, string | string[]> = {}
          if (!searchParams) {
            return next
          }

          const uniqueKeys = new Set(searchParams.keys())
          for (const key of uniqueKeys) {
            const values = searchParams.getAll(key)
            if (values.length === 1) {
              const onlyValue = values[0]
              if (typeof onlyValue === 'string') {
                next[key] = onlyValue
              }
            } else if (values.length > 1) {
              next[key] = values
            }
          }

          return next
        })()
      : localQueryState

    return schema.safeParse({
      ...override,
      ...params,
    })
  }, [schema, searchParams, override, localQueryState, syncWithUrl])

  const setSearchParams = useCallback(
    (params: Partial<z.infer<Schema>>, replace = false) => {
      const nextParams: Record<string, unknown> = {
        ...(replace ? {} : (parsedResult.data ?? {})),
        ...params,
      }

      Object.keys(nextParams).forEach((key) => {
        const value = nextParams[key]
        if (
          value === '' ||
          value === undefined ||
          value === null ||
          (Array.isArray(value) && value.length === 0)
        ) {
          delete nextParams[key]
        }
      })

      const nextSearchParams = getSearchParams(nextParams)
      if (syncWithUrl) {
        router.push(`?${nextSearchParams}`)
        return
      }

      setLocalQueryState(nextParams)
    },
    [parsedResult.data, router, syncWithUrl],
  )

  return {
    query: parsedResult.data,
    error: parsedResult.error,
    setSearchParams,
  }
}
