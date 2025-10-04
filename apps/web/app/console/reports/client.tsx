'use client'

import { SelectWithSearch } from '@repo/ui/components/ui/select-with-search'
import { useState } from 'react'
import {
  ProductListItem,
  useProductOutputs,
  useProducts,
} from '../products/_hooks'
import { VariableListItem } from '../variables/_hooks'
import { Action } from '../../../components/action'
import {
  GeometryOutputListItem,
  useGeometryOutputs,
} from '../geometries/_hooks'

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

  const { data: productOutputs } = useProductOutputs(
    selectedProduct?.mainRun?.id,
  )

  return (
    <>
      <div className="flex flex-col gap-3">
        <Action title="Select Product">
          <SelectWithSearch
            options={products?.data}
            value={selectedProduct?.id ?? null}
            onSelect={(value) => {
              setSelectedProduct(
                products?.data?.find((product) => product.id === value) ?? null,
              )
            }}
            onSearch={() => {}}
          />
        </Action>
        <Action title="Select Variable" disabled={!selectedProduct}>
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
        </Action>
        <Action
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
        </Action>
      </div>
    </>
  )
}

export default ProductFeature
