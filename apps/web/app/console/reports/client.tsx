'use client'

import { LinePlot } from '@repo/plot/LinePlot'
import { SelectWithSearch } from '@repo/ui/components/ui/select-with-search'
import { useState } from 'react'
import { FieldGroup } from '../../../components/action'
import { formatDateTime } from '../../../utils/date'
import {
  GeometryOutputListItem,
  useGeometryOutputs,
} from '../geometries/_hooks'
import {
  ProductListItem,
  useProductOutputsExport,
  useProducts,
} from '../products/_hooks'
import { VariableListItem } from '../variables/_hooks'

const ProductFeature = () => {
  const { data: products } = useProducts()
  const [selectedProduct, setSelectedProduct] =
    useState<ProductListItem | null>(null)

  const [selectedVariable, setSelectedVariable] =
    useState<VariableListItem | null>(null)

  const { data: geometryOutputs } = useGeometryOutputs(
    selectedProduct?.mainRun?.geometriesRun.id,
  )
  const [selectedGeometry, setSelectedGeometry] =
    useState<GeometryOutputListItem | null>(null)

  const { data: productOutputs } = useProductOutputsExport(
    selectedProduct?.mainRun?.id,
    {
      variableId: selectedVariable?.id,
      geometryOutputId: selectedGeometry?.id,
    },
    !!(selectedProduct && selectedVariable && selectedGeometry),
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
        <FieldGroup
          title="Select Geometry"
          disabled={!selectedProduct || !selectedVariable}
        >
          <SelectWithSearch
            options={geometryOutputs?.data}
            value={selectedGeometry?.id ?? null}
            onSelect={(value) => {
              setSelectedGeometry(
                geometryOutputs?.data?.find(
                  (geometry) => geometry.id === value,
                ) ?? null,
              )
            }}
            onSearch={() => {}}
            disabled={!selectedProduct || !selectedVariable}
          />
        </FieldGroup>

        {productOutputs?.data.length && (
          <div className="mt-8">
            <LinePlot data={productOutputs?.data} x="timePoint" y="value" />
          </div>
        )}
      </div>
    </>
  )
}

export default ProductFeature
