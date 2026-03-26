'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { updateProductSchema } from '@repo/schemas/crud'
import { pluralize } from '@repo/ui/lib/utils'
import { ArrowUpRightIcon } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { CrudForm } from '../../../../components/form/crud-form'
import { CrudFormAction } from '../../../../components/form/crud-form-action'
import { useAccessControl } from '../../../../hooks/useAccessControl'
import { PRODUCTS_BASE_PATH } from '../../../../lib/paths'
import {
  canEditConsoleResource,
  getCreatedByUserId,
} from '../../../../utils/access-control'
import { DetailCard } from '../../_components/detail-cards'
import { DatasetButton } from '../../dataset/_components/dataset-button'
import { GeometriesButton } from '../../geometries/_components/geometries-button'
import { ProductRunSummaryCard } from '../_components/product-run-summary-card'
import { RefreshProductSummary } from '../_components/refresh-product-summary'
import {
  useDeleteProduct,
  useProduct,
  useProductRunsLink,
  useUpdateProduct,
} from '../_hooks'

const ProductDetails = () => {
  const { data: product } = useProduct()
  const updateProduct = useUpdateProduct()
  const deleteProduct = useDeleteProduct(undefined, PRODUCTS_BASE_PATH)
  const productRunsLink = useProductRunsLink()
  const { access } = useAccessControl()
  const canEdit = canEditConsoleResource({
    access,
    resource: 'product',
    createdByUserId: getCreatedByUserId(product),
  })

  const formActions: CrudFormAction[] = useMemo(
    () =>
      canEdit
        ? [
            {
              title: 'Refresh',
              description: 'Refresh the product main run summary',
              component: <RefreshProductSummary run={product?.mainRun} />,
            },
          ]
        : [],
    [canEdit, product?.mainRun],
  )

  const form = useForm({
    resolver: zodResolver(updateProductSchema),
  })

  useEffect(() => {
    if (product) {
      form.reset(product)
    }
  }, [product, form])

  return (
    <div className="w-[800px] max-w-full gap-8 flex flex-col">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ProductRunSummaryCard run={product?.mainRun} mainRun />
        <div className="grid grid-cols-1 grid-rows-3 gap-4">
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
        />
      )}
    </div>
  )
}

export default ProductDetails
