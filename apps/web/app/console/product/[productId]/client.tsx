'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { updateProductSchema } from '@repo/schemas/crud'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { ActiveOrganizationWriteWarning } from '~/app/console/_components/active-organization-write-warning'
import { createResourceVisibilityAction } from '~/app/console/_components/resource-visibility-action'
import { CrudForm } from '../../../../components/form/crud-form'
import {
  CrudFormAction,
  FormAction,
} from '../../../../components/form/crud-form-action'
import {
  useAccessControl,
  useRequiresActiveOrganizationSwitchForWrite,
} from '../../../../hooks/useAccessControl'
import { PRODUCTS_BASE_PATH } from '../../../../lib/paths'
import {
  canEditConsoleResource,
  getCreatedByUserId,
} from '../../../../utils/access-control'
import { DetailCard } from '../../_components/detail-cards'
import { ResourceUsageDetailCards } from '../../_components/resource-usage-detail-cards'
import { ResourcePageState } from '../../_components/resource-page-state'
import {
  ResourcePageTabs,
  type WorkflowDagSimple,
} from '../../_components/resource-page-tabs'
import { DatasetButton } from '../../dataset/_components/dataset-button'
import { GeometriesButton } from '../../geometries/_components/geometries-button'
import { ProductRunSummaryCard } from '../_components/product-run-summary-card'
import { ProductMainRunOutputsTable } from '../_components/product-main-run-outputs-table'
import { ProductExploreMap } from '../_components/product-explore-map'
import { RefreshProductSummary } from '../_components/refresh-product-summary'
import { WorkflowDagChart } from '../../../../components/workflow-dag-chart'
import ProductRunFeature from './runs/client'
import {
  useDeleteProduct,
  usePreviewProductVisibility,
  useProduct,
  useUpdateProduct,
  useUpdateProductVisibility,
} from '../_hooks'

const ProductDetails = () => {
  const productQuery = useProduct()
  const product = productQuery.data
  const updateProduct = useUpdateProduct()
  const updateProductVisibility = useUpdateProductVisibility()
  const previewProductVisibility = usePreviewProductVisibility()
  const deleteProduct = useDeleteProduct(undefined, PRODUCTS_BASE_PATH)
  const { access } = useAccessControl()
  const canEdit = canEditConsoleResource({
    access,
    resource: 'product',
    createdByUserId: getCreatedByUserId(product),
    resourceData: product,
  })
  const requiresOrganizationSwitch =
    useRequiresActiveOrganizationSwitchForWrite({
      access,
      createdByUserId: getCreatedByUserId(product),
      resource: 'product',
      resourceData: product,
    })

  const formActions: CrudFormAction[] = useMemo(() => {
    const actions: CrudFormAction[] = []

    if (product) {
      const visibilityAction = createResourceVisibilityAction({
        access,
        mutation: updateProductVisibility,
        previewMutation: previewProductVisibility,
        resourceData: product,
        successMessage: 'Product visibility updated',
        visibility: product.visibility,
      })

      if (visibilityAction) {
        actions.push(visibilityAction)
      }
    }

    if (canEdit) {
      actions.push({
        title: 'Delete Product',
        description:
          'Permanently remove the product, including all dependents.',
        buttonVariant: 'destructive',
        buttonTitle: 'Delete',
        mutation: deleteProduct,
        confirmDialog: {
          title: 'Are you sure?',
          description: `This action cannot be undone. This will permanently delete ${product?.name ?? 'this'} product and remove all dependents.`,
          buttonCancelTitle: 'Cancel',
        },
      })
    }

    return actions
  }, [
    access,
    canEdit,
    deleteProduct,
    previewProductVisibility,
    product,
    updateProductVisibility,
  ])

  const form = useForm({
    resolver: zodResolver(updateProductSchema),
  })

  useEffect(() => {
    if (product) {
      form.reset(product)
    }
  }, [product, form])

  return (
    <ResourcePageState
      error={productQuery.error}
      errorMessage="Failed to load product"
      isLoading={productQuery.isLoading}
      loadingMessage="Loading product"
      notFoundMessage="Product not found"
    >
      <div className="w-[800px] max-w-full gap-8 flex flex-col">
        {requiresOrganizationSwitch ? (
          <ActiveOrganizationWriteWarning visibility={product?.visibility} />
        ) : null}
        <ResourcePageTabs
          overview={
            <>
              <ProductRunSummaryCard run={product?.mainRun} mainRun />
              {product && (
                <DetailCard
                  title={'Dependencies'}
                  footer={
                    <div className="flex flex-col gap-2">
                      {product?.dataset && (
                        <DatasetButton dataset={product.dataset} />
                      )}
                      {product?.geometries && (
                        <GeometriesButton geometries={product.geometries} />
                      )}
                    </div>
                  }
                />
              )}
              {product && (
                <CrudForm
                  form={form}
                  mutation={updateProduct}
                  entityName="Product"
                  entityNamePlural="products"
                  actions={[]}
                  readOnly={!canEdit}
                  successMessage="Updated Product"
                />
              )}
            </>
          }
          exploreMap={
            product?.mainRunId ? (
              <ProductExploreMap productRunId={product.mainRunId} />
            ) : undefined
          }
          exploreTable={
            product?.mainRunId ? (
              <ProductMainRunOutputsTable productRunId={product.mainRunId} />
            ) : undefined
          }
          lineage={
            product?.mainRun ? (
              <WorkflowDagChart
                workflowDag={product.mainRun.workflowDag}
                runType="product"
                isMainRoute
              />
            ) : undefined
          }
          workflowDagSimple={
            product?.mainRun?.workflowDagSimple as WorkflowDagSimple | undefined
          }
          versions={<ProductRunFeature />}
          usage={
            product ? (
              <ResourceUsageDetailCards
                reportCount={product.reportCount}
                dashboardCount={product.dashboardCount}
                reportQuery={{ productId: product.id }}
                dashboardQuery={{ productId: product.id }}
              />
            ) : undefined
          }
          actions={
            product ? (
              <>
                {formActions.map((action, i) => (
                  <FormAction key={i} {...action} />
                ))}
              </>
            ) : undefined
          }
        />
      </div>
    </ResourcePageState>
  )
}

export default ProductDetails
