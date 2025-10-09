'use client'

import { zodResolver } from '@hookform/resolvers/zod'
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
import { z } from 'zod'
import Pagination from '~/components/pagination'
import CrudFormDialog from '../../../components/crud-form-dialog'
import BaseCrudTable from '../../../components/crud-table'
import { SelectWithSearchWithCreate } from '../../../components/select-with-search-with-create'
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
import { createVariableSchema } from '@repo/schemas/crud'

const VariableFeature = () => {
  const { data, query, setSearchParams } = useVariables()
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
            render={({ field }) => (
              <FormItem>
                <FormLabel>Variable Category</FormLabel>
                <FormControl>
                  <SelectWithSearchWithCreate
                    options={variableCategories?.data}
                    value={field.value ?? null}
                    onSelect={field.onChange}
                    onSearch={() => {}}
                    placeholder="Root Category"
                    entityName="Variable Category"
                    createMutation={createVariableCategory}
                    allowUndefined
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CrudFormDialog>
      </div>
      <div className="mt-8">
        <BaseCrudTable
          data={data?.data || []}
          baseColumns={baseColumns}
          extraColumns={columns}
          title="Variable"
          itemLink={variableLink}
          itemButton={(variable) => <VariableButton variable={variable} />}
        />
        <Pagination
          className="justify-end mt-4"
          totalPages={data?.pageCount ?? 1}
          currentPage={query?.page ?? 1}
          onPageChange={(page) => setSearchParams({ page })}
        />
      </div>
    </div>
  )
}

export default VariableFeature
