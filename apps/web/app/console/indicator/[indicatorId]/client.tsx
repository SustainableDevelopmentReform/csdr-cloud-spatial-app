'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { updateIndicatorSchema } from '@repo/schemas/crud'
import { useEffect } from 'react'
import { Path, useForm } from 'react-hook-form'
import { CrudForm } from '../../../../components/form/crud-form'
import { INDICATORS_BASE_PATH } from '../../../../lib/paths'
import { useDeleteIndicator, useUpdateIndicator, useIndicator } from '../_hooks'
import {
  FormControl,
  FormField,
  FormMessage,
  FormItem,
  FormLabel,
} from '@repo/ui/components/ui/form'
import { Input } from '@repo/ui/components/ui/input'

const IndicatorDetails = () => {
  const { data: indicator } = useIndicator()
  const updateIndicator = useUpdateIndicator()
  const deleteIndicator = useDeleteIndicator(undefined, INDICATORS_BASE_PATH)

  const form = useForm({
    resolver: zodResolver(updateIndicatorSchema),
  })

  useEffect(() => {
    if (indicator) {
      form.reset(indicator)
    }
  }, [indicator, form])

  return (
    <div className="w-[800px] max-w-full gap-8 flex flex-col">
      <CrudForm
        form={form}
        mutation={updateIndicator}
        deleteMutation={deleteIndicator}
        entityName="Indicator"
        entityNamePlural="indicators"
        successMessage="Updated Indicator"
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
      </CrudForm>
    </div>
  )
}

export default IndicatorDetails
