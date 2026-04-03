'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { updateIndicatorSchema } from '@repo/schemas/crud'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { createResourceVisibilityAction } from '~/app/console/_components/resource-visibility-action'
import { CrudForm } from '../../../../../components/form/crud-form'
import { useAccessControl } from '../../../../../hooks/useAccessControl'
import { INDICATORS_BASE_PATH } from '../../../../../lib/paths'
import { ResourcePageState } from '../../../_components/resource-page-state'
import { ResourceUsageDetailCards } from '../../../_components/resource-usage-detail-cards'
import {
  canEditConsoleResource,
  getCreatedByUserId,
} from '../../../../../utils/access-control'
import {
  useDeleteMeasuredIndicator,
  usePreviewMeasuredIndicatorVisibility,
  useUpdateMeasuredIndicator,
  useUpdateMeasuredIndicatorVisibility,
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
  const indicatorQuery = useMeasuredIndicator()
  const indicator = indicatorQuery.data
  const updateIndicator = useUpdateMeasuredIndicator()
  const updateIndicatorVisibility = useUpdateMeasuredIndicatorVisibility()
  const previewIndicatorVisibility = usePreviewMeasuredIndicatorVisibility()
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
    resourceData: indicator,
  })

  const formActions = useMemo(() => {
    if (!indicator) {
      return []
    }

    const visibilityAction = createResourceVisibilityAction({
      access,
      mutation: updateIndicatorVisibility,
      previewMutation: previewIndicatorVisibility,
      resourceData: indicator,
      successMessage: 'Indicator visibility updated',
      visibility: indicator.visibility,
    })

    return visibilityAction ? [visibilityAction] : []
  }, [access, indicator, previewIndicatorVisibility, updateIndicatorVisibility])

  return (
    <ResourcePageState
      error={indicatorQuery.error}
      errorMessage="Failed to load indicator"
      isLoading={indicatorQuery.isLoading}
      loadingMessage="Loading indicator"
      notFoundMessage="Indicator not found"
    >
      <div className="w-[800px] max-w-full gap-8 flex flex-col">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <IndicatorProductUsageCard indicator={indicator} />
            {indicator && (
              <ResourceUsageDetailCards
                reportCount={indicator.reportCount}
                dashboardCount={indicator.dashboardCount}
                reportQuery={{ indicatorId: indicator.id }}
                dashboardQuery={{ indicatorId: indicator.id }}
              />
            )}
          </div>
        </div>
        <CrudForm
          form={form}
          mutation={updateIndicator}
          deleteMutation={deleteIndicator}
          actions={formActions}
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
    </ResourcePageState>
  )
}

export default IndicatorDetails
