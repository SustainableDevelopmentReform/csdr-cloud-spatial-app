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
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { ActiveOrganizationWriteWarning } from '~/app/console/_components/active-organization-write-warning'
import { createResourceVisibilityAction } from '~/app/console/_components/resource-visibility-action'
import { CrudForm } from '../../../../../components/form/crud-form'
import {
  useAccessControl,
  useRequiresActiveOrganizationSwitchForWrite,
} from '../../../../../hooks/useAccessControl'
import { INDICATORS_BASE_PATH } from '../../../../../lib/paths'
import { ResourcePageState } from '../../../_components/resource-page-state'
import {
  canEditConsoleResource,
  getCreatedByUserId,
} from '../../../../../utils/access-control'
import { ResourceUsageDetailCards } from '../../../_components/resource-usage-detail-cards'
import { IndicatorButton } from '../../_components/indicator-button'
import { IndicatorCategorySelect } from '../../_components/indicator-category-select'
import { IndicatorProductUsageCard } from '../../_components/indicator-product-usage-card'
import {
  useDeleteDerivedIndicator,
  useDerivedIndicator,
  usePreviewDerivedIndicatorVisibility,
  useUpdateDerivedIndicator,
  useUpdateDerivedIndicatorVisibility,
} from '../../_hooks'
import { ExpressionFieldDescription } from '../../_components/expression-field'

const IndicatorDetails = () => {
  const derivedIndicatorQuery = useDerivedIndicator()
  const derivedIndicator = derivedIndicatorQuery.data
  const updateIndicator = useUpdateDerivedIndicator()
  const updateIndicatorVisibility = useUpdateDerivedIndicatorVisibility()
  const previewIndicatorVisibility = usePreviewDerivedIndicatorVisibility()
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
    resourceData: derivedIndicator,
  })
  const requiresOrganizationSwitch =
    useRequiresActiveOrganizationSwitchForWrite({
      access,
      createdByUserId: getCreatedByUserId(derivedIndicator),
      resource: 'indicator',
      resourceData: derivedIndicator,
    })

  const formActions = useMemo(() => {
    if (!derivedIndicator) {
      return []
    }

    const visibilityAction = createResourceVisibilityAction({
      access,
      mutation: updateIndicatorVisibility,
      previewMutation: previewIndicatorVisibility,
      resourceData: derivedIndicator,
      successMessage: 'Derived indicator visibility updated',
      visibility: derivedIndicator.visibility,
    })

    return visibilityAction ? [visibilityAction] : []
  }, [
    access,
    derivedIndicator,
    previewIndicatorVisibility,
    updateIndicatorVisibility,
  ])

  return (
    <ResourcePageState
      error={derivedIndicatorQuery.error}
      errorMessage="Failed to load derived indicator"
      isLoading={derivedIndicatorQuery.isLoading}
      loadingMessage="Loading derived indicator"
      notFoundMessage="Derived indicator not found"
    >
      <div className="w-[800px] max-w-full gap-8 flex flex-col">
        {requiresOrganizationSwitch ? (
          <ActiveOrganizationWriteWarning
            visibility={derivedIndicator?.visibility}
          />
        ) : null}
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <IndicatorProductUsageCard indicator={derivedIndicator} />
            {derivedIndicator && (
              <ResourceUsageDetailCards
                reportCount={derivedIndicator.reportCount}
                dashboardCount={derivedIndicator.dashboardCount}
                reportQuery={{ indicatorId: derivedIndicator.id }}
                dashboardQuery={{ indicatorId: derivedIndicator.id }}
              />
            )}
          </div>
        </div>
        <CrudForm
          form={form}
          mutation={updateIndicator}
          deleteMutation={deleteIndicator}
          actions={formActions}
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
                  <Input
                    {...field}
                    disabled={!canEdit}
                    value={field.value ?? ''}
                  />
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
    </ResourcePageState>
  )
}

export default IndicatorDetails
