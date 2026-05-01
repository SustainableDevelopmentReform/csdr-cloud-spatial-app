'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { updateProductSchema } from '@repo/schemas/crud'
import { pluralize } from '@repo/ui/lib/utils'
import { ArrowUpRightIcon } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { ActiveOrganizationWriteWarning } from '~/app/console/_components/active-organization-write-warning'
import { createResourceVisibilityAction } from '~/app/console/_components/resource-visibility-action'
import { CrudForm } from '../../../../components/form/crud-form'
import { CrudFormAction } from '../../../../components/form/crud-form-action'
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
import { DatasetButton } from '../../dataset/_components/dataset-button'
import { GeometriesButton } from '../../geometries/_components/geometries-button'
import { ProductRunSummaryCard } from '../_components/product-run-summary-card'
import { ProductRunMapPreview } from '../_components/product-run-map-preview'
import { RefreshProductSummary } from '../_components/refresh-product-summary'
import { WorkflowDagChart } from '../../../../components/workflow-dag-chart'
import {
  useDeleteProduct,
  usePreviewProductVisibility,
  useProduct,
  useProductRunsLink,
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
  const productRunsLink = useProductRunsLink()
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

    if (canEdit) {
      actions.push({
        title: 'Refresh',
        description: 'Refresh the product main run summary',
        component: <RefreshProductSummary run={product?.mainRun} />,
      })
    }

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

    return actions
  }, [
    access,
    canEdit,
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
        <div className="flex flex-col gap-4">
          <ProductRunMapPreview run={product?.mainRun} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ProductRunSummaryCard run={product?.mainRun} mainRun />
            <div className="grid grid-cols-1 gap-4">
              {product && (
                <DetailCard
                  title={`${product?.runCount} ${pluralize(product?.runCount, 'run', 'runs')}`}
                  description="Product Runs"
                  actionText="Open"
                  actionLink={productRunsLink(product)}
                  actionIcon={<ArrowUpRightIcon />}
                />
              )}
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
                <ResourceUsageDetailCards
                  reportCount={product.reportCount}
                  dashboardCount={product.dashboardCount}
                  reportQuery={{ productId: product.id }}
                  dashboardQuery={{ productId: product.id }}
                />
              )}
            </div>
          </div>
        </div>
        {product && (
          <CrudForm
            form={form}
            mutation={updateProduct}
            deleteMutation={deleteProduct}
            entityName="Product"
            entityNamePlural="products"
            actions={formActions}
            readOnly={!canEdit}
            successMessage="Updated Product"
          >
            {product?.mainRun && (
              <WorkflowDagChart
                workflowDag={product.mainRun.workflowDag}
                runType="product"
                isMainRoute
              />
            )}
          </CrudForm>
        )}
      </div>
    </ResourcePageState>
  )
}

export default ProductDetails
