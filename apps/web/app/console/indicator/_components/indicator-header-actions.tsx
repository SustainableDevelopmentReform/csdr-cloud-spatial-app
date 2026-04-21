'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  createDerivedIndicatorSchema,
  createIndicatorSchema,
} from '@repo/schemas/crud'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/ui/form'
import { Input } from '@repo/ui/components/ui/input'
import { useForm } from 'react-hook-form'
import CrudFormDialog from '~/components/form/crud-form-dialog'
import { useAccessControl } from '~/hooks/useAccessControl'
import { canCreateConsoleResource } from '~/utils/access-control'
import {
  IndicatorListItem,
  useCreateDerivedIndicator,
  useCreateMeasuredIndicator,
} from '../_hooks'
import { IndicatorCategorySelect } from './indicator-category-select'
import { IndicatorsSelect } from './indicators-select'
import { DerivedIndicatorFormValues, ExpressionField } from './expression-field'

export const IndicatorHeaderActions = ({
  indicators,
}: {
  indicators: IndicatorListItem[]
}) => {
  const createIndicator = useCreateMeasuredIndicator()
  const createDerivedIndicator = useCreateDerivedIndicator()
  const { access } = useAccessControl()
  const canCreate = canCreateConsoleResource(access, 'indicator')

  const indicatorForm = useForm({
    resolver: zodResolver(createIndicatorSchema),
  })

  const derivedIndicatorForm = useForm<DerivedIndicatorFormValues>({
    resolver: zodResolver(createDerivedIndicatorSchema),
  })

  return (
    <div className="flex flex-wrap gap-2">
      <CrudFormDialog
        form={indicatorForm}
        mutation={createIndicator}
        buttonText="Add Indicator"
        entityName="Indicator"
        entityNamePlural="indicators"
        hideTrigger={!canCreate}
      >
        <FormField
          control={indicatorForm.control}
          name="unit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unit</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={indicatorForm.control}
          name="categoryId"
          render={({ field }) => (
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
          )}
        />
      </CrudFormDialog>
      <CrudFormDialog
        form={derivedIndicatorForm}
        mutation={createDerivedIndicator}
        buttonText="Add Derived Indicator"
        entityName="Derived Indicator"
        entityNamePlural="derived indicators"
        hideTrigger={!canCreate}
      >
        <FormField
          control={derivedIndicatorForm.control}
          name="unit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unit</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={derivedIndicatorForm.control}
          name="categoryId"
          render={({ field }) => (
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
          )}
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
                  field.onChange(
                    selectedIndicators.map((indicator) => indicator.id),
                  )
                }
                queryOptions={{ type: 'measure' }}
                isClearable
                isMulti
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <ExpressionField form={derivedIndicatorForm} indicators={indicators} />
      </CrudFormDialog>
    </div>
  )
}
