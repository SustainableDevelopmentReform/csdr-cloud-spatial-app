import { DetailCard } from '../../_components/detail-cards'
import { DatasetButton } from '../../dataset/_components/dataset-button'
import { DatasetRunButton } from '../../dataset/_components/dataset-run-button'
import { IndicatorButton } from '../../indicator/_components/indicator-button'
import { ProductOutputDetail } from '../_hooks'
import { ProductButton } from './product-button'
import { ProductRunButton } from './product-run-button'
import { Value } from '../../../../components/value'
import { ProductOutputButton } from './product-output-button'

export const ProductOutputDerivedDependenciesCard = ({
  parentProductOutput,
  productOutput,
}: {
  productOutput:
    | ProductOutputDetail['dependencyProductOutputs'][number]
    | undefined
    | null
  parentProductOutput: ProductOutputDetail | undefined | null
}) => {
  if (!productOutput || !parentProductOutput) {
    return null
  }

  return (
    <DetailCard
      title={
        <Value
          value={productOutput.value}
          indicator={productOutput.indicator}
          large
        />
      }
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
      actionButton={<ProductOutputButton productOutput={productOutput} />}
    />
  )
}
