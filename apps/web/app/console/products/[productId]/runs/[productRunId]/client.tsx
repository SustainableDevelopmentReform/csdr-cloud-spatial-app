'use client'

import { pluralize } from '@repo/ui/lib/utils'
import { ArrowUpRightIcon } from 'lucide-react'
import { z } from 'zod'
import {
  baseFormSchema,
  CrudForm,
} from '../../../../../../components/crud-form'
import { DetailCard } from '../../../../_components/detail-cards'
import { DatasetRunButton } from '../../../../datasets/_components/dataset-run-button'
import { useDatasetRunLink } from '../../../../datasets/_hooks'
import { GeometriesRunButton } from '../../../../geometries/_components/geometries-run-button'
import { useGeometriesLink } from '../../../../geometries/_hooks'
import { ProductRunSummaryCard } from '../../../_components/product-run-summary-card'
import {
  useDeleteProductRun,
  useProduct,
  useProductRun,
  useProductRunLink,
  useRefreshProductRunSummary,
  useSetProductMainRun,
  useUpdateProductRun,
} from '../../../_hooks'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo } from 'react'
import { DatasetButton } from '../../../../datasets/_components/dataset-button'
import { GeometriesButton } from '../../../../geometries/_components/geometries-button'
import { CrudFormAction } from '../../../../../../components/crud-form-action'

const ProductRunDetails = () => {
  const { data: productRun } = useProductRun()
  const updateProductRun = useUpdateProductRun()
  const deleteProductRun = useDeleteProductRun(
    undefined,
    '/console/productRuns',
  )
  const productRunLink = useProductRunLink()
  const refreshProductRunSummary = useRefreshProductRunSummary(productRun)
  const setProductMainRun = useSetProductMainRun(productRun)

  const { data: product } = useProduct()

  const form = useForm({
    resolver: zodResolver(baseFormSchema),
  })

  const formActions: CrudFormAction[] = useMemo(
    () => [
      {
        title: 'Refresh summary',
        description: 'Refresh the product run summary',
        buttonVariant: 'outline',
        buttonTitle: 'Refresh',
        mutation: refreshProductRunSummary,
      },
      {
        title: 'Set as Main Run',
        description: 'Set this as the main run for the product',
        buttonVariant: 'default',
        buttonTitle: 'Set as Main Run',
        mutation: setProductMainRun,
      },
    ],
    [refreshProductRunSummary],
  )

  useEffect(() => {
    if (productRun) {
      form.reset(productRun)
    }
  }, [productRun, form])

  return (
    <div className="max-w-2xl gap-8 flex flex-col">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ProductRunSummaryCard product={product} productRun={productRun} />
        <div className="grid grid-cols-1 grid-rows-3 gap-4">
          {productRun && (
            <DetailCard
              title={`${productRun?.outputSummary?.outputCount ?? 0} ${pluralize(productRun?.outputSummary?.outputCount, 'output', 'outputs')}`}
              description="Product Outputs"
              actionText="Open"
              actionLink={`${productRunLink(productRun)}/outputs`}
              actionIcon={<ArrowUpRightIcon />}
            />
          )}
          {productRun && (
            <DetailCard
              title={'Dependencies'}
              footer={
                <div className="flex flex-col gap-2">
                  <DatasetButton dataset={productRun?.datasetRun?.dataset} />
                  <DatasetRunButton datasetRun={productRun?.datasetRun} />
                  <GeometriesButton
                    geometries={productRun?.geometriesRun?.geometries}
                  />
                  <GeometriesRunButton
                    geometriesRun={productRun?.geometriesRun}
                  />
                </div>
              }
            />
          )}
        </div>
      </div>

      {productRun && (
        <CrudForm
          form={form}
          mutation={updateProductRun}
          deleteMutation={deleteProductRun}
          entityName="Product Run"
          entityNamePlural="product runs"
          actions={formActions}
        />
      )}
    </div>
  )
}

export default ProductRunDetails
