'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { updateProductSchema } from '@repo/schemas/crud'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@repo/ui/components/ui/form'
import { Input } from '@repo/ui/components/ui/input'
import { toast } from '@repo/ui/components/ui/sonner'
import { Textarea } from '@repo/ui/components/ui/textarea'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { ActiveOrganizationWriteWarning } from '~/app/console/_components/active-organization-write-warning'
import { ConsolePageHeader } from '~/app/console/_components/console-page-header'
import {
  getEditModeHref,
  getResourceVisibilityChangeSummary,
  OverviewSection,
  OverviewText,
  ResourceHeaderActions,
  ResourceTitleBlock,
  ResourceVisibilitySelect,
} from '~/app/console/_components/resource-detail-mode'
import {
  type VisibilityImpactDialogState,
  VisibilityImpactDialog,
} from '~/app/console/_components/resource-visibility-action'
import { CrudForm } from '../../../../components/form/crud-form'
import { WorkflowDagChart } from '../../../../components/workflow-dag-chart'
import {
  useAccessControl,
  useRequiresActiveOrganizationSwitchForWrite,
} from '../../../../hooks/use-access-control'
import { PRODUCTS_BASE_PATH } from '../../../../lib/paths'
import {
  canChangeConsoleResourceVisibility,
  canEditConsoleResource,
  formatVisibility,
  getConsoleResourceVisibilityOptions,
  getCreatedByUserId,
  type ResourceVisibility,
} from '../../../../utils/access-control'
import { toastError } from '../../../../utils/error-handling'
import { ResourceUsageDetailCards } from '../../_components/resource-usage-detail-cards'
import { ResourcePageState } from '../../_components/resource-page-state'
import {
  type LineageSubTab,
  ResourcePageTabs,
  type ResourceTab,
} from '../../_components/resource-page-tabs'
import { DatasetButton } from '../../dataset/_components/dataset-button'
import { DatasetRunButton } from '../../dataset/_components/dataset-run-button'
import { GeometriesButton } from '../../geometries/_components/geometries-button'
import { GeometriesRunButton } from '../../geometries/_components/geometries-run-button'
import { ProductOutputSummarySection } from '../_components/product-output-summary-section'
import { ProductMainRunOutputsTable } from '../_components/product-main-run-outputs-table'
import { ProductRunMapPreview } from '../_components/product-run-map-preview'
import ProductRunFeature from './runs/client'
import { ProductsBreadcrumbs } from '../_components/breadcrumbs'
import {
  type ProductDetail,
  type UpdateProductPayload,
  usePreviewProductVisibility,
  useProduct,
  useUpdateProduct,
  useUpdateProductVisibility,
} from '../_hooks'

type ProductVisibilityDialogState = VisibilityImpactDialogState & {
  nextVisibility: ResourceVisibility
}

const formId = 'product-detail-form'

const getProductPath = (productId: string) =>
  `${PRODUCTS_BASE_PATH}/${productId}`

const getProductFormValues = (
  product: ProductDetail,
): UpdateProductPayload => ({
  name: product.name,
  description: product.description,
  mainRunId: product.mainRunId,
})

const ProductDetails = () => {
  const productQuery = useProduct()
  const product = productQuery.data
  const updateProduct = useUpdateProduct()
  const updateProductVisibility = useUpdateProductVisibility()
  const previewProductVisibility = usePreviewProductVisibility()
  const { access } = useAccessControl()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<ResourceTab>('overview')
  const [visibilityDialog, setVisibilityDialog] =
    useState<ProductVisibilityDialogState | null>(null)

  const requiresOrganizationSwitch =
    useRequiresActiveOrganizationSwitchForWrite({
      access,
      createdByUserId: getCreatedByUserId(product),
      resource: 'product',
      resourceData: product,
    })
  const canEdit =
    !!product &&
    canEditConsoleResource({
      access,
      resource: 'product',
      createdByUserId: getCreatedByUserId(product),
      resourceData: product,
    }) &&
    !requiresOrganizationSwitch
  const isEditMode = searchParams.get('mode') === 'edit' && canEdit
  const resourcePath = product ? getProductPath(product.id) : PRODUCTS_BASE_PATH

  const form = useForm<UpdateProductPayload>({
    resolver: zodResolver(updateProductSchema),
    defaultValues: {
      name: '',
      description: null,
      mainRunId: null,
    },
  })
  const isDirty = form.formState.isDirty

  useEffect(() => {
    if (product && !isDirty) {
      form.reset(getProductFormValues(product))
    }
  }, [form, isDirty, product])

  const visibilityOptions =
    product && canEdit
      ? getConsoleResourceVisibilityOptions({
          access,
          currentVisibility: product.visibility,
          resourceData: product,
        })
      : []
  const canChangeVisibility =
    product && canEdit
      ? canChangeConsoleResourceVisibility({
          access,
          currentVisibility: product.visibility,
          resourceData: product,
        })
      : false

  const discardEdits = useCallback(() => {
    if (!product) {
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

    form.reset(getProductFormValues(product))
    router.replace(resourcePath)
  }, [form, isDirty, product, resourcePath, router])

  const previewVisibilityChange = useCallback(
    async (nextVisibility: ResourceVisibility) => {
      if (!product || nextVisibility === product.visibility) {
        return
      }

      const preview = await previewProductVisibility
        .mutateAsync({ visibility: nextVisibility })
        .catch((error) => {
          toastError(error, 'Failed to preview visibility change')
          return null
        })

      if (!preview) {
        return
      }

      setVisibilityDialog({
        title: `Change visibility to ${formatVisibility(nextVisibility)}`,
        description: getResourceVisibilityChangeSummary(
          'product',
          nextVisibility,
        ),
        impact: preview,
        nextVisibility,
      })
    },
    [previewProductVisibility, product],
  )

  const confirmVisibilityChange = useCallback(() => {
    if (!product || !visibilityDialog) {
      return
    }

    updateProductVisibility.mutate(
      { visibility: visibilityDialog.nextVisibility },
      {
        onError: (error) => {
          toastError(error, 'Failed to update product visibility')
        },
        onSuccess: () => {
          setVisibilityDialog(null)
          toast.success('Product visibility updated')
        },
      },
    )
  }, [product, updateProductVisibility, visibilityDialog])

  const overview = product ? (
    isEditMode ? (
      <CrudForm
        form={form}
        formId={formId}
        mutation={updateProduct}
        entityName="Product"
        entityNamePlural="products"
        hiddenFields={['id', 'name', 'description', 'metadata']}
        showSubmitAction={false}
        successMessage="Product saved"
        onError={(error) => toastError(error, 'Failed to update product')}
        onSuccess={() => router.replace(resourcePath)}
      />
    ) : (
      <div className="flex w-full max-w-[720px] flex-col gap-4">
        <OverviewSection title="About">
          <OverviewText>
            {product.description ?? 'No description.'}
          </OverviewText>
        </OverviewSection>
        <ProductOutputSummarySection canEdit={canEdit} run={product.mainRun} />
      </div>
    )
  ) : null
  const hasLineage =
    !!product?.mainRun?.workflowDagSimple || !!product?.mainRun?.workflowDag
  const defaultLineageSubTab: LineageSubTab = hasLineage
    ? 'simple'
    : 'dependencies'
  const lineageDependencies =
    product && !isEditMode ? (
      <div className="flex w-full max-w-[720px] flex-col gap-4">
        <OverviewSection title="Dependencies">
          <div className="flex flex-col gap-2">
            {product.dataset ? (
              <DatasetButton dataset={product.dataset} />
            ) : null}
            {product.mainRun?.datasetRun ? (
              <DatasetRunButton datasetRun={product.mainRun.datasetRun} />
            ) : null}
            {product.geometries ? (
              <GeometriesButton geometries={product.geometries} />
            ) : null}
            {product.mainRun?.geometriesRun ? (
              <GeometriesRunButton
                geometriesRun={product.mainRun.geometriesRun}
              />
            ) : null}
          </div>
        </OverviewSection>
      </div>
    ) : null

  return (
    <div className="flex flex-col bg-neutral-100 text-foreground">
      <ConsolePageHeader
        actions={
          product ? (
            <ResourceHeaderActions
              canEdit={canEdit}
              editHref={getEditModeHref(resourcePath)}
              formId={formId}
              isEditMode={isEditMode}
              onDiscard={discardEdits}
              resourcePath={resourcePath}
              resourceTypeLabel="Product"
              savePending={updateProduct.isPending}
            />
          ) : null
        }
        breadcrumbs={<ProductsBreadcrumbs />}
        className="border-b border-border"
      />
      <ResourcePageState
        error={productQuery.error}
        errorMessage="Failed to load product"
        isLoading={productQuery.isLoading}
        loadingMessage="Loading product"
        notFoundMessage="Product not found"
      >
        {product ? (
          <Form {...form}>
            <div className="flex flex-col p-4">
              <div className="flex w-full flex-col gap-4 rounded-2xl px-4 pb-8 pt-6 sm:px-8">
                {requiresOrganizationSwitch ? (
                  <ActiveOrganizationWriteWarning
                    visibility={product.visibility}
                  />
                ) : null}

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
                                placeholder="Product name"
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
                              <Textarea
                                {...field}
                                className="min-h-24 resize-y rounded-lg border-input bg-transparent px-3 py-2 text-sm leading-5 shadow-none"
                                placeholder="Description"
                                rows={3}
                                value={field.value ?? ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <ResourceVisibilitySelect
                        canChange={canChangeVisibility}
                        currentVisibility={product.visibility}
                        isPending={
                          previewProductVisibility.isPending ||
                          updateProductVisibility.isPending
                        }
                        onPreviewChange={previewVisibilityChange}
                        options={visibilityOptions}
                      />
                    </div>
                  ) : (
                    <ResourceTitleBlock
                      title={product.name ?? 'Untitled product'}
                      description={product.description ?? 'No description'}
                      visibility={product.visibility}
                    />
                  )}
                </div>

                <ResourcePageTabs
                  defaultLineageSubTab={defaultLineageSubTab}
                  value={isEditMode ? 'overview' : activeTab}
                  onValueChange={setActiveTab}
                  hideTabs={isEditMode}
                  overview={overview}
                  exploreMap={
                    product.mainRun ? (
                      <ProductRunMapPreview
                        canEdit={canEdit}
                        run={product.mainRun}
                      />
                    ) : undefined
                  }
                  exploreTable={
                    product.mainRunId ? (
                      <ProductMainRunOutputsTable
                        canEdit={canEdit}
                        productRunId={product.mainRunId}
                      />
                    ) : undefined
                  }
                  lineage={
                    product.mainRun ? (
                      <WorkflowDagChart
                        workflowDag={product.mainRun.workflowDag}
                        runType="product"
                        isMainRoute
                      />
                    ) : undefined
                  }
                  lineageDependencies={lineageDependencies}
                  workflowDagSimple={product.mainRun?.workflowDagSimple}
                  versions={<ProductRunFeature embedded />}
                  usage={
                    <ResourceUsageDetailCards
                      reportCount={product.reportCount}
                      dashboardCount={product.dashboardCount}
                      reportQuery={{ productId: product.id }}
                      dashboardQuery={{ productId: product.id }}
                    />
                  }
                />
              </div>
            </div>
          </Form>
        ) : null}
        <VisibilityImpactDialog
          open={visibilityDialog !== null}
          onOpenChange={(open) => {
            if (!open) {
              setVisibilityDialog(null)
            }
          }}
          title={visibilityDialog?.title ?? 'Change visibility'}
          description={visibilityDialog?.description ?? ''}
          impact={visibilityDialog?.impact ?? null}
          closeLabel="Cancel"
          confirmLabel="Confirm"
          confirmDisabled={!visibilityDialog?.impact.canApply}
          confirmLoading={updateProductVisibility.isPending}
          onConfirm={confirmVisibilityChange}
        />
      </ResourcePageState>
    </div>
  )
}

export default ProductDetails
