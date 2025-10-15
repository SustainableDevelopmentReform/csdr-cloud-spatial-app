'use client'

import { getLinePlotCodeSnippet, LinePlot } from '@repo/plot/LinePlot'
import { CopyButton } from '@repo/ui/components/ui/copy-button'
import { SelectWithSearch } from '@repo/ui/components/ui/select-with-search'
import { Textarea } from '@repo/ui/components/ui/textarea'
import { useState } from 'react'
import { FieldGroup } from '../../../components/action'
import { formatDateTime } from '../../../utils/date'
import GeometriesMapViewer from '../geometries/_components/geometries-map-viewer'
import {
  GeometryOutputListItem,
  useGeometriesRun,
  useGeometryOutputs,
} from '../geometries/_hooks'
import { ProductOutputDependenciesCard } from '../products/_components/product-output-dependencies-card'
import { ProductOutputSummaryCard } from '../products/_components/product-output-summary-card'
import {
  ProductListItem,
  ProductOutputExportListItem,
  useProductOutput,
  useProductOutputsExport,
  useProductRun,
  useProducts,
} from '../products/_hooks'
import { VariableListItem } from '../variables/_hooks'
import { ObservableCellsCopy } from '@repo/ui/components/ui/observable-cells-copy'

const ProductFeature = () => {
  const { data: products } = useProducts()
  const [selectedProduct, setSelectedProduct] =
    useState<ProductListItem | null>(null)

  const { data: productRun } = useProductRun(selectedProduct?.mainRun?.id)

  const [selectedVariable, setSelectedVariable] =
    useState<VariableListItem | null>(null)

  const { data: geometriesRun } = useGeometriesRun(
    selectedProduct?.mainRun?.geometriesRun.id,
  )

  const { data: geometryOutputs } = useGeometryOutputs(
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
        <FieldGroup title="Select Product">
          <SelectWithSearch
            options={products?.data}
            value={selectedProduct?.id ?? null}
            onSelect={(value) => {
              setSelectedProduct(
                products?.data?.find((product) => product.id === value) ?? null,
              )
              setSelectedDataPoint(null)
              setSelectedVariable(null)
              setSelectedGeometry(null)
            }}
            onSearch={() => {}}
          />
        </FieldGroup>
        <FieldGroup title="Select Variable" disabled={!selectedProduct}>
          <SelectWithSearch
            options={selectedProduct?.mainRun?.outputSummary?.variables.map(
              (variable) => variable.variable,
            )}
            value={selectedVariable?.id ?? null}
            onSelect={(value) => {
              setSelectedDataPoint(null)
              setSelectedVariable(
                selectedProduct?.mainRun?.outputSummary?.variables.find(
                  (variable) => variable.variable.id === value,
                )?.variable ?? null,
              )
            }}
            onSearch={() => {}}
            disabled={!selectedProduct}
          />
        </FieldGroup>
        <div className="flex gap-3">
          <FieldGroup
            className="flex-1"
            title="Select Geometry"
            disabled={
              !!(!selectedProduct || !selectedVariable || selectedTimePoint)
            }
          >
            <SelectWithSearch
              options={geometryOutputs?.data}
              value={selectedGeometry?.id ?? null}
              onSelect={(value) => {
                setSelectedDataPoint(null)
                setSelectedGeometry(
                  geometryOutputs?.data?.find(
                    (geometry) => geometry.id === value,
                  ) ?? null,
                )
              }}
              onSearch={() => {}}
              disabled={
                !!(!selectedProduct || !selectedVariable || selectedTimePoint)
              }
            />
          </FieldGroup>
          <div className="flex items-center justify-center text-center">
            &emsp;OR&emsp;
          </div>
          <FieldGroup
            className="flex-1"
            title="Select Time Point"
            disabled={
              !!(!selectedProduct || !selectedVariable || selectedGeometry)
            }
          >
            <SelectWithSearch
              options={selectedProduct?.mainRun?.outputSummary?.timePoints?.map(
                (timePoint) => ({
                  id: timePoint,
                  name: formatDateTime(timePoint),
                }),
              )}
              value={selectedTimePoint ?? null}
              onSelect={(value) => {
                setSelectedDataPoint(null)
                setSelectedTimePoint(value || null)
              }}
              onSearch={() => {}}
              disabled={
                !!(!selectedProduct || !selectedVariable || selectedGeometry)
              }
            />
          </FieldGroup>
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
