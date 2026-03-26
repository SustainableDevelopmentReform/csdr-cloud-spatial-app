'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { updateIndicatorSchema } from '@repo/schemas/crud'
import { useEffect } from 'react'
import { Path, useForm } from 'react-hook-form'
import { CrudForm } from '../../../../../components/form/crud-form'
import { useAccessControl } from '../../../../../hooks/useAccessControl'
import { INDICATORS_BASE_PATH } from '../../../../../lib/paths'
import {
  canEditConsoleResource,
  getCreatedByUserId,
} from '../../../../../utils/access-control'
import {
  useDeleteMeasuredIndicator,
  useUpdateMeasuredIndicator,
  useMeasuredIndicator,
} from '../../_hooks'
import {
  FormControl,
  FormField,
  FormMessage,
  FormItem,
  FormLabel,
} from '@repo/ui/components/ui/form'
import { Input } from '@repo/ui/components/ui/input'
import { IndicatorCategorySelect } from '../../_components/indicator-category-select'
import { IndicatorProductUsageCard } from '../../_components/indicator-product-usage-card'

const IndicatorDetails = () => {
  const { data: indicator } = useMeasuredIndicator()
  const updateIndicator = useUpdateMeasuredIndicator()
  const deleteIndicator = useDeleteMeasuredIndicator(
    undefined,
    INDICATORS_BASE_PATH,
  )
  const { access } = useAccessControl()

  const form = useForm({
    resolver: zodResolver(updateIndicatorSchema),
  })

  useEffect(() => {
    if (indicator) {
      form.reset(indicator)
    }
  }, [indicator, form])
  const canEdit = canEditConsoleResource({
    access,
    resource: 'indicator',
    createdByUserId: getCreatedByUserId(indicator),
  })

  return (
    <div className="w-[800px] max-w-full gap-8 flex flex-col">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <IndicatorProductUsageCard indicator={indicator} />
        </div>
      </div>
      <CrudForm
        form={form}
        mutation={updateIndicator}
        deleteMutation={deleteIndicator}
        entityName="Indicator"
        entityNamePlural="indicators"
        readOnly={!canEdit}
        successMessage="Updated Indicator"
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
      </CrudForm>
    </div>
  )
}

export default IndicatorDetails
