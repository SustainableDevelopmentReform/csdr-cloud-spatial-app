import {
  useRouter,
  useSearchParams as useSearchParamsNext,
} from 'next/navigation'
import { useCallback } from 'react'
import { z } from 'zod'
import { getSearchParams } from '../utils/browser'

export const useQueryWithSearchParams = <T extends z.ZodObject<any>>(
  schema: T,
  override?: z.infer<T>,
) => {
  const router = useRouter()
  const searchParams = useSearchParamsNext()
  const searchParamsParsed = schema.parse(
    Object.fromEntries(searchParams ?? []),
  )

  const setSearchParams = useCallback((params: z.infer<T>) => {
    const searchParams = getSearchParams(params)

    router.push(`?${searchParams}`)
  }, [])

  return { query: { ...searchParamsParsed, ...override }, setSearchParams }
}
