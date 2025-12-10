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
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { CrudForm } from '../../../../../components/form/crud-form'
import { INDICATORS_BASE_PATH } from '../../../../../lib/paths'
import { IndicatorCategorySelect } from '../../_components/indicator-category-select'
import {
  useDeleteDerivedIndicator,
  useDerivedIndicator,
  useUpdateDerivedIndicator,
} from '../../_hooks'
import { updateDerivedIndicatorSchema } from '@repo/schemas/crud'
import { Textarea } from '@repo/ui/components/ui/textarea'
import { IndicatorsSelect } from '../../_components/indicators-select'

const IndicatorDetails = () => {
  const { data: derivedIndicator } = useDerivedIndicator()
  const updateIndicator = useUpdateDerivedIndicator()
  const deleteIndicator = useDeleteDerivedIndicator(
    undefined,
    INDICATORS_BASE_PATH,
  )

  const form = useForm({
    resolver: zodResolver(updateDerivedIndicatorSchema),
  })

  useEffect(() => {
    if (derivedIndicator) {
      form.reset(derivedIndicator)
      form.setValue(
        'indicatorIds',
        derivedIndicator.indicators.map((i) => i.id),
      )
    }
  }, [derivedIndicator, form])

  return (
    <div className="w-[800px] max-w-full gap-8 flex flex-col">
      <CrudForm
        form={form}
        mutation={updateIndicator}
        deleteMutation={deleteIndicator}
        entityName="Derived Indicator"
        entityNamePlural="derived indicators"
        successMessage="Updated Derived Indicator"
      >
        <FormField
          control={form.control}
          name={'unit'}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Units</FormLabel>
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
                    onChange={(value) => field.onChange(value?.id ?? null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )
          }}
        />
        <FormField
          control={form.control}
          name="indicatorIds"
          render={({ field }) => (
            <FormItem>
              <IndicatorsSelect
                queryOptions={{ type: 'measure' }}
                value={
                  field.value ??
                  derivedIndicator?.indicators.map((i) => i.id) ??
                  []
                }
                onChange={(selectedIndicators) =>
                  field.onChange(selectedIndicators.map((i) => i.id))
                }
                isClearable
                isMulti
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={'expression'}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Expression</FormLabel>
              <FormControl>
                <Textarea {...field} className={'font-mono'} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CrudForm>
    </div>
  )
}

export default IndicatorDetails
