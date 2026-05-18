'use client'

import { InfiniteData } from '@tanstack/react-query'
import { useMemo } from 'react'

type PaginatedShape<TItem> = {
  data: TItem[]
  pageCount: number
  totalCount: number
}

type PaginatedPage = {
  pageCount: number
}

export const getNextPaginatedPageParam = <TPage extends PaginatedPage>(
  lastPage: TPage | undefined,
  allPages: TPage[],
): number | undefined => {
  if (!lastPage) return undefined
  const nextPage = allPages.length + 1
  return nextPage <= lastPage.pageCount ? nextPage : undefined
}

/**
 * Flattens the pages returned from useInfiniteQuery into a single response
 * object that mirrors the API contract ({ data, pageCount, totalCount }).
 */
export const mergePaginatedInfiniteData = <
  TItem,
  TResponse extends PaginatedShape<TItem>,
>(
  infiniteData: InfiniteData<TResponse> | undefined,
): TResponse | undefined => {
  if (!infiniteData) return undefined

  return infiniteData.pages.reduce<TResponse | undefined>((acc, page) => {
    if (!page) return acc

    if (!acc) {
      return {
        ...page,
        data: [...page.data],
      }
    }

    return {
      ...acc,
      data: [...acc.data, ...page.data],
      pageCount: page.pageCount,
      totalCount: page.totalCount,
    }
  }, undefined)
}

export const useMergedPaginatedInfiniteData = <
  TItem,
  TResponse extends PaginatedShape<TItem>,
>(
  infiniteData: InfiniteData<TResponse> | undefined,
): TResponse | undefined =>
  useMemo(() => mergePaginatedInfiniteData(infiniteData), [infiniteData])
