'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { createIndicatorSchema } from '@repo/schemas/crud'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/ui/form'
import { Input } from '@repo/ui/components/ui/input'
import { ColumnDef } from '@tanstack/react-table'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import Pagination from '~/components/table/pagination'
import CrudFormDialog from '../../../components/form/crud-form-dialog'
import BaseCrudTable from '../../../components/table/crud-table'
import { SearchInput } from '../../../components/table/search-input'
import { IndicatorButton } from './_components/indicator-button'
import { IndicatorCategoryButton } from './_components/indicator-category-button'
import { IndicatorCategorySelect } from './_components/indicator-category-select'
import {
  IndicatorListItem,
  useCreateIndicator,
  useIndicatorLink,
  useIndicators,
} from './_hooks'

const IndicatorFeature = () => {
  const {
    data,
    query,
    setSearchParams,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useIndicators(undefined, true)
  const createIndicator = useCreateIndicator()
  const indicatorLink = useIndicatorLink()

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

  const form = useForm({
    resolver: zodResolver(createIndicatorSchema),
  })

  return (
    <div>
      <div className="flex justify-between">
        <h1 className="text-3xl font-medium mb-2">Indicators</h1>
        <CrudFormDialog
          form={form}
          mutation={createIndicator}
          buttonText="Add Indicator"
          entityName="Indicator"
          entityNamePlural="indicators"
        >
          <FormField
            control={form.control}
            name="unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => {
              return (
                <FormItem>
                  <FormLabel>Indicator Category</FormLabel>
                  <FormControl>
                    <IndicatorCategorySelect
                      value={field.value}
                      onChange={(value) => field.onChange(value?.id)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )
            }}
          />
        </CrudFormDialog>
      </div>
      <div>
        <SearchInput
          placeholder="Search indicators"
          value={query?.search ?? ''}
          onChange={(e) => setSearchParams({ search: e.target.value })}
        />
        <BaseCrudTable
          data={data?.data || []}
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
