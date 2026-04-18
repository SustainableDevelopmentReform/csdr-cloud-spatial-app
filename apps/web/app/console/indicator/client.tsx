'use client'

import { ColumnDef } from '@tanstack/react-table'
import { useMemo } from 'react'
import { normalizeFilterValues } from '~/utils'
import Pagination from '~/components/table/pagination'
import BaseCrudTable from '../../../components/table/crud-table'
import { SearchInput } from '../../../components/table/search-input'
import { ConsolePageHeader } from '../_components/console-page-header'
import { IndicatorButton } from './_components/indicator-button'
import { IndicatorCategoryButton } from './_components/indicator-category-button'
import { IndicatorCategorySelect } from './_components/indicator-category-select'
import { IndicatorHeaderActions } from './_components/indicator-header-actions'
import { IndicatorsBreadcrumbs } from './_components/breadcrumbs'
import { IndicatorListItem, useIndicatorLink, useIndicators } from './_hooks'

const IndicatorFeature = () => {
  const {
    data,
    query,
    setSearchParams,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
  } = useIndicators(undefined, true)
  const indicatorLink = useIndicatorLink()
  const selectedCategoryIds = useMemo(
    () => normalizeFilterValues(query?.categoryId),
    [query?.categoryId],
  )

  const baseColumns = useMemo(() => {
    return ['description', 'createdAt', 'updatedAt'] as const
  }, [])

  const columns = useMemo(() => {
    return [
      {
        header: 'Category',
        cell: ({ row }) => {
          return row.original.category ? (
            <IndicatorCategoryButton
              indicatorCategory={row.original.category}
            />
          ) : null
        },
      },
      {
        header: 'Unit',
        cell: ({ row }) => {
          return <div>{row.original.unit}</div>
        },
      },
    ] satisfies ColumnDef<IndicatorListItem>[]
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <ConsolePageHeader
        breadcrumbs={<IndicatorsBreadcrumbs />}
        actions={<IndicatorHeaderActions indicators={data?.data ?? []} />}
      />
      <div className="flex justify-between">
        <h1 className="text-3xl font-medium mb-2">Indicators</h1>
      </div>
      <div>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <SearchInput
            className="w-full md:max-w-md"
            placeholder="Search indicators"
            value={query?.search ?? ''}
            onChange={(event) =>
              setSearchParams({ search: event.target.value })
            }
          />
          <div className="flex flex-wrap justify-end gap-3">
            <div className="min-w-[220px] md:min-w-[260px]">
              <IndicatorCategorySelect
                value={selectedCategoryIds}
                onChange={(selected) =>
                  setSearchParams({
                    categoryId: selected.map((category) => category.id),
                  })
                }
                placeholder="Filter categories"
                isMulti
              />
            </div>
          </div>
        </div>
        <BaseCrudTable
          data={data?.data || []}
          isLoading={isLoading}
          baseColumns={baseColumns}
          extraColumns={columns}
          title="Indicator"
          itemLink={indicatorLink}
          itemButton={(indicator) => <IndicatorButton indicator={indicator} />}
          query={query}
          onSortChange={setSearchParams}
        />
        <Pagination
          className="justify-end mt-4"
          hasNextPage={!!hasNextPage}
          isLoading={isFetchingNextPage}
          onLoadMore={() => fetchNextPage()}
        />
      </div>
    </div>
  )
}

export default IndicatorFeature
