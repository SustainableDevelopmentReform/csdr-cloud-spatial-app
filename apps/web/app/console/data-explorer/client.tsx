'use client'

import { getLinePlotCodeSnippet, LinePlot } from '@repo/plot/LinePlot'
import { ObservableCellsCopy } from '@repo/ui/components/ui/observable-cells-copy'
import { useState } from 'react'
import GeometriesMapViewer from '../geometries/_components/geometries-map-viewer'
import { GeometryOutputListItem, useGeometriesRun } from '../geometries/_hooks'
import { ProductGeometryOutputSelect } from '../products/_components/product-geometry-output-select'
import { ProductOutputDependenciesCard } from '../products/_components/product-output-dependencies-card'
import { ProductOutputSummaryCard } from '../products/_components/product-output-summary-card'
import { ProductOutputTimeSelect } from '../products/_components/product-output-time-select'
import { ProductSelect } from '../products/_components/product-select'
import {
  ProductListItem,
  ProductOutputExportListItem,
  useProductOutput,
  useProductOutputsExport,
  useProductRun,
} from '../products/_hooks'
import { VariablesSelect } from '../variables/_components/variables-select'
import { VariableListItem } from '../variables/_hooks'

const ProductFeature = () => {
  const [selectedProduct, setSelectedProduct] =
    useState<ProductListItem | null>(null)

  const { data: productRun } = useProductRun(selectedProduct?.mainRun?.id)

  const [selectedVariable, setSelectedVariable] =
    useState<VariableListItem | null>(null)

  const { data: geometriesRun } = useGeometriesRun(
    selectedProduct?.mainRun?.geometriesRun.id,
  )

  const [selectedGeometry, setSelectedGeometry] =
    useState<GeometryOutputListItem | null>(null)

  const [selectedTimePoint, setSelectedTimePoint] = useState<string | null>(
    null,
  )

  const { data: productOutputs } = useProductOutputsExport(
    selectedProduct?.mainRun?.id,
    {
      variableId: selectedVariable?.id,
      geometryOutputId: selectedGeometry?.id,
      timePoint: selectedTimePoint ?? undefined,
    },
    !!(
      selectedProduct &&
      selectedVariable &&
      (selectedGeometry || selectedTimePoint)
    ),
  )

  const [selectedDataPoint, setSelectedDataPoint] =
    useState<ProductOutputExportListItem | null>(null)

  const { data: selectedProductOutput } = useProductOutput(
    selectedDataPoint?.id,
  )

  return (
    <>
      <div className="flex flex-col gap-3">
        <ProductSelect
          value={selectedProduct?.id}
          onChange={(id, product) => {
            setSelectedProduct(product)
            setSelectedDataPoint(null)
            setSelectedVariable(null)
            setSelectedGeometry(null)
          }}
        />
        <VariablesSelect
          productRunId={selectedProduct?.mainRunId}
          value={selectedVariable?.id}
          onChange={(id, variable) => {
            setSelectedVariable(variable)
          }}
        />
        <div className="flex gap-3">
          <ProductGeometryOutputSelect
            productRunId={selectedProduct?.mainRunId}
            value={selectedGeometry?.id}
            onChange={(id, geometry) => {
              setSelectedDataPoint(null)
              setSelectedGeometry(geometry)
            }}
            disabled={
              !!(!selectedProduct || !selectedVariable || selectedTimePoint)
            }
          />

          <div className="flex items-center justify-center text-center">
            &emsp;OR&emsp;
          </div>
          <ProductOutputTimeSelect
            productRunId={selectedProduct?.mainRunId}
            value={selectedTimePoint}
            onChange={(value) => {
              setSelectedDataPoint(null)
              setSelectedTimePoint(value)
            }}
            disabled={
              !!(!selectedProduct || !selectedVariable || selectedGeometry)
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {productOutputs?.data.length && selectedGeometry && (
            <div className="mt-8">
              <LinePlot<ProductOutputExportListItem>
                data={productOutputs?.data}
                x="timePoint"
                y="value"
                onSelect={setSelectedDataPoint}
              />
            </div>
          )}

          {productOutputs?.data.length && selectedTimePoint && (
            <GeometriesMapViewer
              geometriesRun={geometriesRun}
              variable={selectedVariable}
              productRun={productRun}
              productOutputs={productOutputs?.data}
              onSelect={setSelectedDataPoint}
            />
          )}

          <div className="grid grid-cols-2 grid-rows-1 gap-4">
            {selectedProductOutput && (
              <>
                <ProductOutputSummaryCard
                  productOutput={selectedProductOutput}
                  showLink
                />
                <ProductOutputDependenciesCard
                  productOutput={selectedProductOutput}
                  showProduct
                  showProductRun
                />
              </>
            )}
          </div>
        </div>

        {productOutputs?.data.length && selectedGeometry && (
          <ObservableCellsCopy
            cells={getLinePlotCodeSnippet({
              data: productOutputs.data,
              x: 'timePoint',
              y: 'value',
            })}
          />
        )}
      </div>
    </>
  )
}

export default ProductFeature
