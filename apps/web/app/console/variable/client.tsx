'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { createVariableSchema } from '@repo/schemas/crud'
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
import { SelectWithSearchWithCreate } from '../../../components/form/select-with-search-with-create'
import { VariableButton } from './_components/variable-button'
import { VariableCategoryButton } from './_components/variable-category-button'
import {
  useCreateVariable,
  useCreateVariableCategory,
  useVariableCategories,
  useVariableLink,
  useVariables,
  VariableListItem,
} from './_hooks'

const VariableFeature = () => {
  const {
    data,
    query,
    setSearchParams,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useVariables(undefined, true)
  const { data: variableCategories } = useVariableCategories()
  const createVariable = useCreateVariable()
  const createVariableCategory = useCreateVariableCategory()

  const variableLink = useVariableLink()

  const baseColumns = useMemo(() => {
    return ['description', 'createdAt', 'updatedAt'] as const
  }, [])

  const columns = useMemo(() => {
    return [
      {
        header: 'Category',
        cell: ({ row }) => {
          return row.original.category ? (
            <VariableCategoryButton variableCategory={row.original.category} />
          ) : null
        },
      },
      {
        header: 'Unit',
        cell: ({ row }) => {
          return <div>{row.original.unit}</div>
        },
      },
    ] satisfies ColumnDef<VariableListItem>[]
  }, [])

  const form = useForm({
    resolver: zodResolver(createVariableSchema),
  })

  return (
    <div>
      <div className="flex justify-between">
        <h1 className="text-3xl font-medium mb-2">Variables</h1>
        <CrudFormDialog
          form={form}
          mutation={createVariable}
          buttonText="Add Variable"
          entityName="Variable"
          entityNamePlural="variables"
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
                  <FormLabel>Variable Category</FormLabel>
                  <FormControl>
                    <SelectWithSearchWithCreate
                      options={variableCategories?.data}
                      value={
                        variableCategories?.data.find(
                          (category) => category.id === field.value,
                        ) ?? null
                      }
                      onChange={(value) => field.onChange(value?.id)}
                      placeholder="Root Category"
                      onCreateOption={(input) => {
                        createVariableCategory.mutate(
                          {
                            name: input,
                          },
                          {
                            onSuccess: (variableCategory) => {
                              field.onChange(variableCategory?.id)
                            },
                          },
                        )
                      }}
                      isClearable
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
          placeholder="Search variables"
          value={query?.search ?? ''}
          onChange={(e) => setSearchParams({ search: e.target.value })}
        />
        <BaseCrudTable
          data={data?.data || []}
          baseColumns={baseColumns}
          extraColumns={columns}
          title="Variable"
          itemLink={variableLink}
          itemButton={(variable) => <VariableButton variable={variable} />}
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

export default VariableFeature
