import {
  useRouter,
  useSearchParams as useSearchParamsNext,
} from 'next/navigation'
import { useCallback } from 'react'
import { z } from 'zod'
import { getSearchParams } from '../utils/browser'

export const useQueryWithSearchParams = <T extends z.ZodObject<any>>(
  schema: T,
  override?: Partial<z.infer<T>>,
) => {
  const router = useRouter()
  const searchParams = useSearchParamsNext()
  const parsedResult = schema.safeParse({
    ...Object.fromEntries(searchParams ?? []),
    ...override,
  })

  const setSearchParams = useCallback(
    (params: Partial<z.infer<T>>, replace = false) => {
      const searchParams = getSearchParams({
        ...(replace ? {} : parsedResult.data),
        ...params,
      })

      router.push(`?${searchParams}`)
    },
    [],
  )

  console.log({
    ...Object.fromEntries(searchParams ?? []),
    ...override,
  })
  console.log(parsedResult)

  return {
    query: parsedResult.data,
    error: parsedResult.error,
    setSearchParams,
  }
}
