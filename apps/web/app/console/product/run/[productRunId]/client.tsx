'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { updateProductRunSchema } from '@repo/schemas/crud'
import { pluralize } from '@repo/ui/lib/utils'
import { ArrowUpRightIcon } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { CrudForm } from '../../../../../components/form/crud-form'
import { CrudFormAction } from '../../../../../components/form/crud-form-action'
import { CrudFormRunFields } from '../../../../../components/form/crud-form-run-fields'
import { DetailCard } from '../../../_components/detail-cards'
import { DatasetButton } from '../../../dataset/_components/dataset-button'
import { DatasetRunButton } from '../../../dataset/_components/dataset-run-button'
import { GeometriesButton } from '../../../geometries/_components/geometries-button'
import { GeometriesRunButton } from '../../../geometries/_components/geometries-run-button'
import { AssignDerivedIndicatorsDialog } from '../../_components/assign-derived-indicators'
import { ProductRunSummaryCard } from '../../_components/product-run-summary-card'
import { RefreshProductSummary } from '../../_components/refresh-product-summary'
import {
  useDeleteProductRun,
  useProductRun,
  useProductRunLink,
  useProductRunOutputsLink,
  useProductRunsLink,
  useSetProductMainRun,
  useUpdateProductRun,
} from '../../_hooks'

const ProductRunDetails = () => {
  const { data: productRun } = useProductRun()
  const updateProductRun = useUpdateProductRun()
  const productRunsLink = useProductRunsLink()
  const deleteProductRun = useDeleteProductRun(
    undefined,
    productRun?.product ? productRunsLink(productRun?.product) : undefined,
  )
  const productRunLink = useProductRunLink()
  const productRunOutputsLink = useProductRunOutputsLink()
  const setProductMainRun = useSetProductMainRun(productRun)

  const form = useForm({
    resolver: zodResolver(updateProductRunSchema),
  })

  const formActions: CrudFormAction[] = useMemo(
    () => [
      {
        title: 'Assign Derived Indicators',
        description: 'Assign derived indicators to the product run',
        component: <AssignDerivedIndicatorsDialog run={productRun} />,
      },
      {
        title: 'Refresh summary',
        description: 'Refresh the product run summary',
        component: <RefreshProductSummary run={productRun} />,
      },
      {
        title: 'Set as Main Run',
        description: 'Set this as the main run for the product',
        buttonVariant: 'default',
        buttonTitle: 'Set as Main Run',
        mutation: setProductMainRun,
        disabled: productRun?.id === productRun?.product.mainRunId,
      },
    ],
    [setProductMainRun, productRun],
  )

  useEffect(() => {
    if (productRun) {
      form.reset(productRun)
    }
  }, [productRun, form])

  return (
    <div className="w-[800px] max-w-full gap-8 flex flex-col">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ProductRunSummaryCard run={productRun} />
        <div className="grid grid-cols-1 grid-rows-3 gap-4">
          {productRun && (
            <DetailCard
              title={`${productRun?.outputSummary?.outputCount ?? 0} ${pluralize(productRun?.outputSummary?.outputCount, 'output', 'outputs')}`}
              description="Product Outputs"
              actionText="Open"
              actionLink={productRunOutputsLink(productRun)}
              actionIcon={<ArrowUpRightIcon />}
            />
          )}
          {productRun && (
            <DetailCard
              title={'Dependencies'}
              footer={
                <div className="flex flex-col gap-2">
                  {productRun?.datasetRun?.dataset && (
                    <DatasetButton dataset={productRun?.datasetRun?.dataset} />
                  )}
                  {productRun?.datasetRun && (
                    <DatasetRunButton datasetRun={productRun?.datasetRun} />
                  )}
                  {productRun?.geometriesRun?.geometries && (
                    <GeometriesButton
                      geometries={productRun?.geometriesRun?.geometries}
                    />
                  )}
                  {productRun?.geometriesRun && (
                    <GeometriesRunButton
                      geometriesRun={productRun?.geometriesRun}
                    />
                  )}
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
          successMessage="Updated Product Run"
        >
          <CrudFormRunFields form={form} readOnlyFields={'all'} />
        </CrudForm>
      )}
    </div>
  )
}

export default ProductRunDetails
