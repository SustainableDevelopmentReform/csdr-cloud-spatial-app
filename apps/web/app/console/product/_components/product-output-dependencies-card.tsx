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
          <DatasetButton
            dataset={productOutput.productRun?.datasetRun?.dataset}
          />
          <DatasetRunButton datasetRun={productOutput.productRun?.datasetRun} />
          <GeometriesButton
            geometries={productOutput.productRun?.geometriesRun?.geometries}
          />
          <GeometriesRunButton
            geometriesRun={productOutput.productRun?.geometriesRun}
          />
          <GeometryOutputButton geometryOutput={productOutput.geometryOutput} />
        </div>
      }
    />
  )
}
