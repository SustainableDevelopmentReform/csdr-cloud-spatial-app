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
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { ConsolePageHeader } from '~/app/console/_components/console-page-header'
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
import { ResourcePageState } from '../../../_components/resource-page-state'
import {
  type LineageSubTab,
  ResourcePageTabs,
  type ResourceTab,
} from '../../../_components/resource-page-tabs'
import { ResourceUsageDetailCards } from '../../../_components/resource-usage-detail-cards'
import { VersionStatusBadge } from '../../../_components/version-status-badge'
import { DatasetButton } from '../../../dataset/_components/dataset-button'
import { DatasetRunButton } from '../../../dataset/_components/dataset-run-button'
import { GeometriesButton } from '../../../geometries/_components/geometries-button'
import { GeometriesRunButton } from '../../../geometries/_components/geometries-run-button'
import { AssignDerivedIndicatorsDialog } from '../../_components/assign-derived-indicators'
import { ProductsBreadcrumbs } from '../../_components/breadcrumbs'
import { ProductMainRunOutputsTable } from '../../_components/product-main-run-outputs-table'
import { ProductOutputSummarySection } from '../../_components/product-output-summary-section'
import { ProductRunMapPreview } from '../../_components/product-run-map-preview'
import { RefreshProductSummary } from '../../_components/refresh-product-summary'
import {
  type ProductRunDetail,
  type UpdateProductRunPayload,
  useProductRun,
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
  const [activeTab, setActiveTab] = useState<ResourceTab>('overview')
  const isEditMode = searchParams.get('mode') === 'edit' && canEdit
  const resourcePath = productRun
    ? getProductRunPath(productRun.id)
    : PRODUCTS_RUNS_BASE_PATH

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
              title: 'Set as Latest Version',
              description: 'Set this as the latest version for the product',
              buttonVariant: 'default',
              buttonTitle: 'Set as Latest Version',
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

  const overview =
    productRun && !isEditMode ? (
      <div className="flex w-full max-w-[720px] flex-col gap-4">
        <OverviewSection title="About">
          <OverviewText>
            {productRun.description ?? 'No description.'}
          </OverviewText>
        </OverviewSection>
        <ProductOutputSummarySection canEdit={canEdit} run={productRun} />
        <OverviewSection title="Run details">
          <OverviewText>
            {`Product: ${productRun.product.name}
Created: ${formatDateTime(productRun.createdAt)}
Updated: ${formatDateTime(productRun.updatedAt)}
Outputs: ${productRun.outputSummary?.outputCount ?? 0}`}
          </OverviewText>
        </OverviewSection>
      </div>
    ) : null
  const hasLineage =
    !!productRun?.workflowDagSimple || !!productRun?.workflowDag
  const defaultLineageSubTab: LineageSubTab = hasLineage
    ? 'simple'
    : 'dependencies'
  const lineageDependencies =
    productRun && !isEditMode ? (
      <div className="flex w-full max-w-[720px] flex-col gap-4">
        <OverviewSection title="Dependencies">
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
              <GeometriesRunButton geometriesRun={productRun.geometriesRun} />
            ) : null}
          </div>
        </OverviewSection>
      </div>
    ) : null

  return (
    <div className="flex flex-col bg-neutral-100 text-foreground">
      <ConsolePageHeader
        actions={
          productRun ? (
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
          ) : null
        }
        breadcrumbs={<ProductsBreadcrumbs />}
        className="border-b border-border"
      />
      <ResourcePageState
        error={productRunQuery.error}
        errorMessage="Failed to load product run"
        isLoading={productRunQuery.isLoading}
        loadingMessage="Loading product run"
        notFoundMessage="Product run not found"
      >
        {productRun ? (
          <Form {...form}>
            <div className="flex flex-col p-4">
              <div className="flex w-full flex-col gap-4 rounded-2xl px-4 pb-8 pt-6 sm:px-8">
                <div className="flex items-start justify-between gap-4">
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
                      extra={
                        isMainRun ? (
                          <VersionStatusBadge status="latest" />
                        ) : null
                      }
                    />
                  )}
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
                  <ResourcePageTabs
                    defaultLineageSubTab={defaultLineageSubTab}
                    enabledTabs={['overview', 'explore', 'lineage', 'usage']}
                    value={activeTab}
                    onValueChange={setActiveTab}
                    overview={overview}
                    exploreMap={
                      <ProductRunMapPreview
                        canEdit={canEdit}
                        run={productRun}
                      />
                    }
                    exploreTable={
                      <ProductMainRunOutputsTable
                        canEdit={canEdit}
                        productRunId={productRun.id}
                        showManagementActions
                      />
                    }
                    lineage={
                      <WorkflowDagChart
                        workflowDag={productRun.workflowDag}
                        runType="product"
                      />
                    }
                    lineageDependencies={lineageDependencies}
                    workflowDagSimple={productRun.workflowDagSimple}
                    usage={
                      <ResourceUsageDetailCards
                        reportCount={productRun.reportCount}
                        dashboardCount={productRun.dashboardCount}
                        reportQuery={{ productRunId: productRun.id }}
                        dashboardQuery={{ productRunId: productRun.id }}
                      />
                    }
                  />
                )}
              </div>
            </div>
          </Form>
        ) : null}
      </ResourcePageState>
    </div>
  )
}

export default ProductRunDetails
