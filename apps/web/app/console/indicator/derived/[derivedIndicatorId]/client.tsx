'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { updateDerivedIndicatorSchema } from '@repo/schemas/crud'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/ui/form'
import { Input } from '@repo/ui/components/ui/input'
import { Textarea } from '@repo/ui/components/ui/textarea'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { CrudForm } from '../../../../../components/form/crud-form'
import { useAccessControl } from '../../../../../hooks/useAccessControl'
import { INDICATORS_BASE_PATH } from '../../../../../lib/paths'
import {
  canEditConsoleResource,
  getCreatedByUserId,
} from '../../../../../utils/access-control'
import { IndicatorButton } from '../../_components/indicator-button'
import { IndicatorCategorySelect } from '../../_components/indicator-category-select'
import { IndicatorProductUsageCard } from '../../_components/indicator-product-usage-card'
import {
  useDeleteDerivedIndicator,
  useDerivedIndicator,
  useUpdateDerivedIndicator,
} from '../../_hooks'
import { ExpressionFieldDescription } from '../../client'

const IndicatorDetails = () => {
  const { data: derivedIndicator } = useDerivedIndicator()
  const updateIndicator = useUpdateDerivedIndicator()
  const deleteIndicator = useDeleteDerivedIndicator(
    undefined,
    INDICATORS_BASE_PATH,
  )
  const { access } = useAccessControl()

  const form = useForm({
    resolver: zodResolver(updateDerivedIndicatorSchema),
  })

  useEffect(() => {
    if (derivedIndicator) {
      form.reset(derivedIndicator)
    }
  }, [derivedIndicator, form])
  const canEdit = canEditConsoleResource({
    access,
    resource: 'indicator',
    createdByUserId: getCreatedByUserId(derivedIndicator),
  })

  return (
    <div className="w-[800px] max-w-full gap-8 flex flex-col">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <IndicatorProductUsageCard indicator={derivedIndicator} />
        </div>
      </div>
      <CrudForm
        form={form}
        mutation={updateIndicator}
        deleteMutation={deleteIndicator}
        entityName="Derived Indicator"
        entityNamePlural="derived indicators"
        readOnly={!canEdit}
        successMessage="Updated Derived Indicator"
      >
        <FormField
          control={form.control}
          name={'unit'}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Units</FormLabel>
              <FormControl>
                <Input {...field} disabled={!canEdit} />
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
                    disabled={!canEdit}
                    onChange={(value) => field.onChange(value?.id ?? null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )
          }}
        />

        <FormItem>
          <FormLabel>Indicators</FormLabel>
          {derivedIndicator?.indicators.map((indicator) => (
            <IndicatorButton key={indicator.id} indicator={indicator} />
          ))}
          <FormMessage />
        </FormItem>

        <FormItem>
          <FormLabel>Expression</FormLabel>
          <ExpressionFieldDescription
            indicators={derivedIndicator?.indicators ?? []}
          />
          <FormControl>
            <Textarea
              className={'font-mono'}
              disabled={true}
              value={derivedIndicator?.expression}
            />
          </FormControl>
        </FormItem>
      </CrudForm>
    </div>
  )
}

export default IndicatorDetails
