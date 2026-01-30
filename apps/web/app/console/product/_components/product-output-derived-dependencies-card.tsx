import { ArrowUpRightIcon } from 'lucide-react'
import { DetailCard } from '../../_components/detail-cards'
import { DatasetButton } from '../../dataset/_components/dataset-button'
import { DatasetRunButton } from '../../dataset/_components/dataset-run-button'
import { IndicatorButton } from '../../indicator/_components/indicator-button'
import { ProductOutputListItem, useProductOutputLink } from '../_hooks'
import { ProductButton } from './product-button'
import { ProductRunButton } from './product-run-button'

export const ProductOutputDerivedDependenciesCard = ({
  parentProductOutput,
  productOutput,
}: {
  productOutput: ProductOutputListItem | undefined | null
  parentProductOutput: ProductOutputListItem | undefined | null
}) => {
  const productOutputLink = useProductOutputLink()

  if (!productOutput || !parentProductOutput) {
    return null
  }

  return (
    <DetailCard
      title={productOutput.value.toString()}
      description="Derived Indicator Dependency Value"
      footer={
        <div className="flex flex-col gap-4">
          {productOutput.indicator && (
            <IndicatorButton indicator={productOutput.indicator} />
          )}

          <div className="flex flex-col gap-2">
            {parentProductOutput.productRun?.id !==
              productOutput.productRun?.id && (
              <ProductButton product={productOutput.productRun?.product} />
            )}
            {parentProductOutput.productRun?.id !==
              productOutput.productRun?.id && (
              <ProductRunButton productRun={productOutput.productRun} />
            )}
            {parentProductOutput.productRun?.datasetRun?.id !==
              productOutput.productRun?.datasetRun?.id &&
              productOutput.productRun?.datasetRun?.dataset && (
                <DatasetButton
                  dataset={productOutput.productRun?.datasetRun?.dataset}
                />
              )}
            {parentProductOutput.productRun?.datasetRun?.id !==
              productOutput.productRun?.datasetRun?.id &&
              productOutput.productRun?.datasetRun && (
                <DatasetRunButton
                  datasetRun={productOutput.productRun?.datasetRun}
                />
              )}
          </div>
        </div>
      }
      actionText={'Open'}
      actionLink={productOutputLink(productOutput)}
      actionIcon={<ArrowUpRightIcon />}
    />
  )
}
