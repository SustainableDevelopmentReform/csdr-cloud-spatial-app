'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { updateProductRunSchema } from '@repo/schemas/crud'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@repo/ui/components/ui/form'
import { Input } from '@repo/ui/components/ui/input'
import { formatDateTime } from '@repo/ui/lib/date'
import { pluralize } from '@repo/ui/lib/utils'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import {
  getEditModeHref,
  OverviewSection,
  OverviewText,
  ResourceHeaderActions,
  ResourceTitleBlock,
} from '~/app/console/_components/resource-detail-mode'
import { CrudForm } from '../../../../../components/form/crud-form'
import { CrudFormAction } from '../../../../../components/form/crud-form-action'
import { CrudFormRunFields } from '../../../../../components/form/crud-form-run-fields'
import { useAccessControl } from '../../../../../hooks/useAccessControl'
import { PRODUCTS_RUNS_BASE_PATH } from '../../../../../lib/paths'
import { DetailCard } from '../../../_components/detail-cards'
import { ResourcePageState } from '../../../_components/resource-page-state'
import { ResourceUsageDetailCards } from '../../../_components/resource-usage-detail-cards'
import { DatasetButton } from '../../../dataset/_components/dataset-button'
import { DatasetRunButton } from '../../../dataset/_components/dataset-run-button'
import { GeometriesButton } from '../../../geometries/_components/geometries-button'
import { GeometriesRunButton } from '../../../geometries/_components/geometries-run-button'
import { AssignDerivedIndicatorsDialog } from '../../_components/assign-derived-indicators'
import { ProductRunMapPreview } from '../../_components/product-run-map-preview'
import { ProductRunSummaryCard } from '../../_components/product-run-summary-card'
import { RefreshProductSummary } from '../../_components/refresh-product-summary'
import {
  type ProductRunDetail,
  type UpdateProductRunPayload,
  useProductRun,
  useProductRunOutputsLink,
  useSetProductMainRun,
  useUpdateProductRun,
} from '../../_hooks'
import { canManageConsoleChildResource } from '../../../../../utils/access-control'
import { WorkflowDagChart } from '../../../../../components/workflow-dag-chart'
import { SimpleWorkflowDagChart } from '../../../../../components/simple-workflow-dag-chart'
import { toastError } from '../../../../../utils/error-handling'

const formId = 'product-run-detail-form'

const getProductRunPath = (productRunId: string) =>
  `${PRODUCTS_RUNS_BASE_PATH}/${productRunId}`

const getProductRunFormValues = (
  productRun: ProductRunDetail,
): UpdateProductRunPayload => ({
  name: productRun.name,
  description: productRun.description,
})

const ProductRunDetails = () => {
  const productRunQuery = useProductRun()
  const productRun = productRunQuery.data
  const updateProductRun = useUpdateProductRun()
  const { access } = useAccessControl()
  const canEdit = canManageConsoleChildResource({
    access,
    resourceData: productRun,
  })
  const router = useRouter()
  const searchParams = useSearchParams()
  const isEditMode = searchParams.get('mode') === 'edit' && canEdit
  const resourcePath = productRun
    ? getProductRunPath(productRun.id)
    : PRODUCTS_RUNS_BASE_PATH

  const productRunOutputsLink = useProductRunOutputsLink()
  const setProductMainRun = useSetProductMainRun(productRun)
  const isMainRun = productRun?.id === productRun?.product.mainRunId

  const formActions: CrudFormAction[] = useMemo(
    () =>
      canEdit
        ? [
            {
              title: 'Assign Derived Indicators',
              description: 'Assign derived indicators to the product run',
              component: <AssignDerivedIndicatorsDialog run={productRun} />,
            },
            {
              title: 'Refresh Summary',
              description: 'Refresh the product run summary',
              component: <RefreshProductSummary run={productRun} />,
            },
            {
              title: 'Set as Main Run',
              description: 'Set this as the main run for the product',
              buttonVariant: 'default',
              buttonTitle: 'Set as Main Run',
              mutation: setProductMainRun,
              disabled: isMainRun,
            },
          ]
        : [],
    [canEdit, isMainRun, productRun, setProductMainRun],
  )

  const form = useForm<UpdateProductRunPayload>({
    resolver: zodResolver(updateProductRunSchema),
    defaultValues: {
      name: '',
      description: null,
    },
  })
  const isDirty = form.formState.isDirty

  useEffect(() => {
    if (productRun && !isDirty) {
      form.reset(getProductRunFormValues(productRun))
    }
  }, [form, isDirty, productRun])

  const discardEdits = useCallback(() => {
    if (!productRun) {
      return
    }

    if (
      isDirty &&
      !window.confirm(
        'You have unsaved changes. Are you sure you want to discard your edits?',
      )
    ) {
      return
    }

    form.reset(getProductRunFormValues(productRun))
    router.replace(resourcePath)
  }, [form, isDirty, productRun, resourcePath, router])

  const viewContent =
    productRun && !isEditMode ? (
      <>
        <div className="flex flex-col gap-4">
          <ProductRunMapPreview run={productRun} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ProductRunSummaryCard run={productRun} />
            <div className="grid grid-cols-1 gap-4">
              <DetailCard
                title={`${productRun.outputSummary?.outputCount ?? 0} ${pluralize(productRun.outputSummary?.outputCount, 'output', 'outputs')}`}
                description="Product Outputs"
                actionText="Open"
                actionLink={productRunOutputsLink(productRun)}
              />
              <DetailCard
                title="Dependencies"
                footer={
                  <div className="flex flex-col gap-2">
                    {productRun.datasetRun?.dataset ? (
                      <DatasetButton dataset={productRun.datasetRun.dataset} />
                    ) : null}
                    {productRun.datasetRun ? (
                      <DatasetRunButton datasetRun={productRun.datasetRun} />
                    ) : null}
                    {productRun.geometriesRun?.geometries ? (
                      <GeometriesButton
                        geometries={productRun.geometriesRun.geometries}
                      />
                    ) : null}
                    {productRun.geometriesRun ? (
                      <GeometriesRunButton
                        geometriesRun={productRun.geometriesRun}
                      />
                    ) : null}
                  </div>
                }
              />
              <ResourceUsageDetailCards
                reportCount={productRun.reportCount}
                dashboardCount={productRun.dashboardCount}
                reportQuery={{ productRunId: productRun.id }}
                dashboardQuery={{ productRunId: productRun.id }}
              />
            </div>
          </div>
        </div>
        <div className="flex w-full max-w-[720px] flex-col gap-4">
          <OverviewSection title="About">
            <OverviewText>
              {productRun.description ?? 'No description.'}
            </OverviewText>
          </OverviewSection>
          <OverviewSection title="Run details">
            <OverviewText>
              {`Product: ${productRun.product.name}
Created: ${formatDateTime(productRun.createdAt)}
Updated: ${formatDateTime(productRun.updatedAt)}
Outputs: ${productRun.outputSummary?.outputCount ?? 0}`}
            </OverviewText>
          </OverviewSection>
        </div>
      </>
    ) : null

  return (
    <ResourcePageState
      error={productRunQuery.error}
      errorMessage="Failed to load product run"
      isLoading={productRunQuery.isLoading}
      loadingMessage="Loading product run"
      notFoundMessage="Product run not found"
    >
      {productRun ? (
        <Form {...form}>
          <div className="flex w-full max-w-[1000px] flex-col gap-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              {isEditMode ? (
                <div className="flex w-full max-w-[462px] flex-col items-start gap-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormControl>
                          <Input
                            {...field}
                            className="h-9 rounded-lg border-input bg-transparent px-3 py-1 text-xl font-semibold leading-7 shadow-none"
                            placeholder="Product run name"
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormControl>
                          <Input
                            {...field}
                            className="h-9 rounded-lg border-input bg-transparent px-3 py-1 text-sm leading-5 shadow-none"
                            placeholder="Description"
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ) : (
                <ResourceTitleBlock
                  title={productRun.name ?? 'Untitled product run'}
                  description={productRun.description ?? 'No description'}
                  extra={isMainRun ? <span>Latest run</span> : null}
                />
              )}
              <ResourceHeaderActions
                canEdit={canEdit}
                editHref={getEditModeHref(resourcePath)}
                formId={formId}
                isEditMode={isEditMode}
                onDiscard={discardEdits}
                resourcePath={resourcePath}
                resourceTypeLabel="Product run"
                savePending={updateProductRun.isPending}
              />
            </div>

            {isEditMode ? (
              <CrudForm
                form={form}
                formId={formId}
                mutation={updateProductRun}
                entityName="Product Run"
                entityNamePlural="product runs"
                actions={formActions}
                hiddenFields={[
                  'id',
                  'name',
                  'description',
                  'metadata',
                  'visibility',
                ]}
                showSubmitAction={false}
                successMessage="Product run saved"
                onError={(error) =>
                  toastError(error, 'Failed to update product run')
                }
                onSuccess={() => router.replace(resourcePath)}
              >
                <CrudFormRunFields form={form} readOnlyFields="all" />
                <WorkflowDagChart
                  workflowDag={productRun.workflowDag}
                  runType="product"
                />
                {productRun.workflowDagSimple ? (
                  <SimpleWorkflowDagChart
                    workflowDagSimple={productRun.workflowDagSimple}
                  />
                ) : null}
              </CrudForm>
            ) : (
              viewContent
            )}
          </div>
        </Form>
      ) : null}
    </ResourcePageState>
  )
}

export default ProductRunDetails
