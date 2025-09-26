'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { updateProductSchema } from '@repo/server/schemas/zod'
import { pluralize } from '@repo/ui/lib/utils'
import { ArrowUpRightIcon } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { CrudForm } from '../../../../components/crud-form'
import { CrudFormAction } from '../../../../components/crud-form-action'
import { DetailCard } from '../../_components/detail-cards'
import { DatasetButton } from '../../datasets/_components/dataset-button'
import { GeometriesButton } from '../../geometries/_components/geometries-button'
import { ProductRunSummaryCard } from '../_components/product-run-summary-card'
import {
  useDeleteProduct,
  useProduct,
  useProductRunsLink,
  useRefreshProductRunSummary,
  useUpdateProduct,
} from '../_hooks'

const ProductDetails = () => {
  const { data: product } = useProduct()
  const updateProduct = useUpdateProduct()
  const deleteProduct = useDeleteProduct(undefined, '/console/products')
  const productRunsLink = useProductRunsLink()

  const refreshProductRunSummary = useRefreshProductRunSummary(product?.mainRun)
  const formActions: CrudFormAction[] = useMemo(
    () => [
      {
        title: 'Refresh',
        description: 'Refresh the product main run summary',
        buttonVariant: 'outline',
        buttonTitle: 'Refresh',
        mutation: refreshProductRunSummary,
      },
    ],
    [refreshProductRunSummary],
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
    <div className="max-w-2xl gap-8 flex flex-col">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ProductRunSummaryCard product={product} />
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
                  <DatasetButton dataset={product?.dataset} />
                  <GeometriesButton geometries={product?.geometries} />
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
        />
      )}
    </div>
  )
}

export default ProductDetails
