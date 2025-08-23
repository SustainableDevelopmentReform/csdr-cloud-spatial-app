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
  useUpdateProductRun,
} from '../../../_hooks'

const formSchema = z.object({
  id: z.string().readonly(),
  description: z.string().nullable().optional(),
  parameters: z.any().optional().readonly(),
})

type Data = z.infer<typeof formSchema>

const ProductRunDetails = () => {
  const { data: productRun } = useProductRun()
  const updateProductRun = useUpdateProductRun()
  const deleteProductRun = useDeleteProductRun('/console/productRuns')
  const productRunLink = useProductRunLink()
  const datasetRunLink = useDatasetRunLink()
  const geometriesLink = useGeometriesLink()
  const { data: product } = useProduct()

  return (
    <div className="max-w-2xl gap-8 flex flex-col">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ProductRunSummaryCard product={product} productRun={productRun} />
        <div className="grid grid-cols-1 grid-rows-3 gap-4">
          {productRun && (
            <DetailCard
              title={`${productRun?.outputSummary?.outputCount} ${pluralize(productRun?.outputSummary?.outputCount, 'output', 'outputs')}`}
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
                  <DatasetRunButton datasetRun={productRun?.datasetRun} />
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
          data={productRun}
          defaultValues={{
            name: productRun?.name,
            description: productRun?.description ?? undefined,
            metadata: productRun?.metadata ?? undefined,
          }}
          formSchema={baseFormSchema}
          updateMutation={updateProductRun}
          deleteMutation={deleteProductRun}
        />
      )}
    </div>
  )
}

export default ProductRunDetails
