'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  createDerivedIndicatorSchema,
  createIndicatorSchema,
} from '@repo/schemas/crud'
import { Badge } from '@repo/ui/components/ui/badge'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/ui/form'
import { Input } from '@repo/ui/components/ui/input'
import { Textarea } from '@repo/ui/components/ui/textarea'
import { ColumnDef } from '@tanstack/react-table'
import { StatusMessage } from '../../../components/status-message'
import { parse } from 'mathjs'
import { useMemo } from 'react'
import { useForm, UseFormReturn } from 'react-hook-form'
import { z } from 'zod'
import Pagination from '~/components/table/pagination'
import CrudFormDialog from '../../../components/form/crud-form-dialog'
import BaseCrudTable from '../../../components/table/crud-table'
import { SearchInput } from '../../../components/table/search-input'
import { IndicatorButton } from './_components/indicator-button'
import { IndicatorCategoryButton } from './_components/indicator-category-button'
import { IndicatorCategorySelect } from './_components/indicator-category-select'
import { IndicatorsSelect } from './_components/indicators-select'
import {
  IndicatorListItem,
  useCreateDerivedIndicator,
  useCreateIndicator,
  useIndicatorLink,
  useIndicators,
} from './_hooks'

function validateExpression(expression: string | undefined): string | null {
  if (!expression || expression.trim() === '') {
    return null
  }

  try {
    parse(expression)
    return null
  } catch (error) {
    return error instanceof Error ? error.message : 'Invalid expression syntax'
  }
}

type DerivedIndicatorFormValues = z.infer<typeof createDerivedIndicatorSchema>

export const ExpressionFieldDescription = ({
  indicatorIds,
  indicators,
}: {
  indicatorIds?: string[]
  indicators: IndicatorListItem[]
}) => {
  const selectedIndicatorIds =
    indicatorIds ?? indicators.map((indicator) => indicator.id)
  return (
    <FormDescription>
      See{' '}
      <a
        href="https://mathjs.org/docs/expressions/syntax.html"
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 hover:text-blue-600"
      >
        the Math.js syntax
      </a>{' '}
      for more information. The expression cannot be changed after creation.
      {selectedIndicatorIds.length > 0 && (
        <>
          <div className="mt-2">
            You can reference the indicators using the following variables:
          </div>
          <div className="my-2 flex flex-wrap gap-2">
            {selectedIndicatorIds.map((indicatorId: string, index: number) => {
              const indicator = indicators.find(
                (indicator) => indicator.id === indicatorId,
              )
              return (
                <Badge key={indicatorId} variant="secondary">
                  ${index + 1}={indicator?.name}
                </Badge>
              )
            })}
          </div>
        </>
      )}
    </FormDescription>
  )
}

export const ExpressionField = ({
  form,
  indicators,
  disabled,
}: {
  form: UseFormReturn<DerivedIndicatorFormValues>
  indicators: IndicatorListItem[]
  disabled?: boolean
}) => {
  const expression = form.watch('expression')
  const indicatorIds = form.watch('indicatorIds') ?? []

  const error = useMemo(() => validateExpression(expression), [expression])

  return (
    <FormField
      control={form.control}
      name={'expression'}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Expression</FormLabel>
          <ExpressionFieldDescription
            indicatorIds={indicatorIds}
            indicators={indicators}
          />
          <FormControl>
            <Textarea {...field} className={'font-mono'} disabled={disabled} />
          </FormControl>
          <FormMessage />
          {error && (
            <StatusMessage variant="error" className="mt-2">
              {error}
            </StatusMessage>
          )}
          {!error && expression && expression.trim() !== '' && (
            <StatusMessage variant="primary" className="mt-2">
              Expression is valid
            </StatusMessage>
          )}
        </FormItem>
      )}
    />
  )
}

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
  const createDerivedIndicator = useCreateDerivedIndicator()
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

  const indicatorForm = useForm({
    resolver: zodResolver(createIndicatorSchema),
  })

  const derivedIndicatorForm = useForm<DerivedIndicatorFormValues>({
    resolver: zodResolver(createDerivedIndicatorSchema),
  })

  return (
    <div>
      <div className="flex justify-between">
        <h1 className="text-3xl font-medium mb-2">Indicators</h1>
        <div className="flex gap-2">
          <CrudFormDialog
            form={indicatorForm}
            mutation={createIndicator}
            buttonText="Add Indicator"
            entityName="Indicator"
            entityNamePlural="indicators"
          >
            <FormField
              control={indicatorForm.control}
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
              control={indicatorForm.control}
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
          <CrudFormDialog
            form={derivedIndicatorForm}
            mutation={createDerivedIndicator}
            buttonText="Add Derived Indicator"
            entityName="Derived Indicator"
            entityNamePlural="derived indicators"
          >
            <FormField
              control={derivedIndicatorForm.control}
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
              control={derivedIndicatorForm.control}
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

            <FormField
              control={derivedIndicatorForm.control}
              name="indicatorIds"
              render={({ field }) => (
                <FormItem>
                  <IndicatorsSelect
                    description="The indicators that are used to compute the derived indicator. This cannot be changed after creation."
                    value={field.value ?? []}
                    onChange={(selectedIndicators) =>
                      field.onChange(selectedIndicators.map((i) => i.id))
                    }
                    queryOptions={{ type: 'measure' }}
                    isClearable
                    isMulti
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <ExpressionField
              form={derivedIndicatorForm}
              indicators={data?.data ?? []}
            />
          </CrudFormDialog>
        </div>
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
