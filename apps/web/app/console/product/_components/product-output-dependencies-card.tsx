import { DatasetButton } from '../../dataset/_components/dataset-button'
import { DetailCard } from '../../_components/detail-cards'
import { GeometriesButton } from '../../geometries/_components/geometries-button'
import { GeometriesRunButton } from '../../geometries/_components/geometries-run-button'
import { DatasetRunButton } from '../../dataset/_components/dataset-run-button'
import { ProductOutputDetail } from '../_hooks'
import { GeometryOutputButton } from '../../geometries/_components/geometry-output-button'
import { ProductButton } from './product-button'
import { ProductRunButton } from './product-run-button'

export const ProductOutputDependenciesCard = ({
  productOutput,
  showProduct,
  showProductRun,
}: {
  productOutput: ProductOutputDetail | undefined | null
  showProduct?: boolean
  showProductRun?: boolean
}) => {
  if (!productOutput) {
    return null
  }

  return (
    <DetailCard
      title={'Dependencies'}
      footer={
        <div className="flex flex-col gap-2">
          {showProduct && (
            <ProductButton product={productOutput.productRun?.product} />
          )}
          {showProductRun && (
            <ProductRunButton productRun={productOutput.productRun} />
          )}
          {productOutput.productRun?.datasetRun?.dataset && (
            <DatasetButton
              dataset={productOutput.productRun?.datasetRun?.dataset}
            />
          )}
          {productOutput.productRun?.datasetRun && (
            <DatasetRunButton
              datasetRun={productOutput.productRun?.datasetRun}
            />
          )}
          {productOutput.productRun?.geometriesRun?.geometries && (
            <GeometriesButton
              geometries={productOutput.productRun?.geometriesRun?.geometries}
            />
          )}
          {productOutput.productRun?.geometriesRun && (
            <GeometriesRunButton
              geometriesRun={productOutput.productRun?.geometriesRun}
            />
          )}
          {productOutput.geometryOutput && (
            <GeometryOutputButton
              geometryOutput={productOutput.geometryOutput}
            />
          )}
        </div>
      }
    />
  )
}
