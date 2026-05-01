'use client'

import { ColumnDef } from '@tanstack/react-table'
import { useMemo } from 'react'
import { normalizeFilterValues } from '~/utils'
import Pagination from '~/components/table/pagination'
import {
  ActiveTableFilter,
  TableFilterPopover,
} from '~/components/table/filter-popover'
import BaseCrudTable from '../../../components/table/crud-table'
import { SearchInput } from '../../../components/table/search-input'
import { useAccessControl } from '../../../hooks/useAccessControl'
import { canEditConsoleResource } from '../../../utils/access-control'
import { ConsoleCrudListFrame } from '../_components/console-crud-list-frame'
import { ConsolePageHeader } from '../_components/console-page-header'
import { IndicatorCategoryButton } from './_components/indicator-category-button'
import { IndicatorCategorySelect } from './_components/indicator-category-select'
import { IndicatorHeaderActions } from './_components/indicator-header-actions'
import { IndicatorsBreadcrumbs } from './_components/breadcrumbs'
import { IndicatorListItem, useIndicatorLink, useIndicators } from './_hooks'

const IndicatorFeature = () => {
  const { access } = useAccessControl()
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
    return ['description', 'updatedAt'] as const
  }, [])
  const activeFilters = useMemo<ActiveTableFilter[]>(() => {
    if (selectedCategoryIds.length === 0) {
      return []
    }

    return [
      {
        id: 'categories',
        label: 'Categories',
        value: `${selectedCategoryIds.length} selected`,
        onClear: () => setSearchParams({ categoryId: undefined }),
      },
    ]
  }, [selectedCategoryIds.length, setSearchParams])

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
      <ConsolePageHeader breadcrumbs={<IndicatorsBreadcrumbs />} />
      <ConsoleCrudListFrame
        title="Indicators"
        description="Create and manage indicators in the system."
        actions={<IndicatorHeaderActions indicators={data?.data ?? []} />}
        footer={
          <Pagination
            hasNextPage={!!hasNextPage}
            isLoading={isFetchingNextPage}
            loadedCount={data?.data.length}
            totalCount={data?.totalCount}
            onLoadMore={() => fetchNextPage()}
          />
        }
        toolbar={
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <SearchInput
              className="w-full md:w-72"
              placeholder="Search indicators"
              value={query?.search ?? ''}
              onChange={(event) =>
                setSearchParams({ search: event.target.value })
              }
            />
            <TableFilterPopover activeFilters={activeFilters}>
              <div>
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
            </TableFilterPopover>
          </div>
        }
      >
        <BaseCrudTable
          data={data?.data || []}
          isLoading={isLoading}
          baseColumns={baseColumns}
          extraColumns={columns}
          sortOptions={['name', 'createdAt', 'updatedAt']}
          title="Indicator"
          itemLink={indicatorLink}
          canModifyItem={(indicator) =>
            canEditConsoleResource({
              access,
              resource: 'indicator',
              resourceData: indicator,
            })
          }
          query={query}
          onSortChange={setSearchParams}
        />
      </ConsoleCrudListFrame>
    </div>
  )
}

export default IndicatorFeature
