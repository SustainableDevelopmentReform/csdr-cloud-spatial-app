'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { updateProductOutputSchema } from '@repo/schemas/crud'
import { bbox } from '@turf/turf'
import type { FeatureCollection, Geometry } from 'geojson'
import { Layer, Source } from '@vis.gl/react-maplibre'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { CrudForm } from '../../../../../components/form/crud-form'
import { MapViewer } from '../../../geometries/_components/map-viewer'
import { DerivedIndicatorSummaryCard } from '../../_components/derived-indicator-summary-card'
import { ProductOutputDependenciesCard } from '../../_components/product-output-dependencies-card'
import { ProductOutputDerivedDependenciesCard } from '../../_components/product-output-derived-dependencies-card'
import { ProductOutputSummaryCard } from '../../_components/product-output-summary-card'
import {
  type ProductOutputDetail,
  useProductOutput,
  useUpdateProductOutput,
} from '../../_hooks'

function toFeatureProperties(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null
  }

  return Object.fromEntries(Object.entries(value))
}

function createGeometryFeatureCollection(
  productOutput: ProductOutputDetail | null | undefined,
): FeatureCollection<Geometry, Record<string, unknown> | null> | null {
  const geometryOutput = productOutput?.geometryOutput

  if (!geometryOutput?.geometry) {
    return null
  }

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: geometryOutput.geometry,
        properties: toFeatureProperties(geometryOutput.properties),
      },
    ],
  }
}

const ProductRunDetails = () => {
  const { data: productOutput } = useProductOutput()
  const updateProductOutput = useUpdateProductOutput()

  const geometryData = useMemo(
    () => createGeometryFeatureCollection(productOutput),
    [productOutput],
  )

  const geometryBbox = useMemo<
    [number, number, number, number] | undefined
  >(() => {
    if (!geometryData) {
      return undefined
    }

    const [minLon, minLat, maxLon, maxLat] = bbox(geometryData)
    return [minLon, minLat, maxLon, maxLat]
  }, [geometryData])

  const form = useForm({
    resolver: zodResolver(updateProductOutputSchema),
  })

  useEffect(() => {
    if (productOutput) {
      form.reset(productOutput)
    }
  }, [productOutput, form])

  return (
    <div className="w-[800px] max-w-full gap-8 flex flex-col">
      <div className="rounded-lg overflow-hidden h-96">
        {geometryBbox && geometryData && (
          <MapViewer
            initialViewState={{
              bounds: geometryBbox,
              fitBoundsOptions: { padding: 100 },
            }}
          >
            <Source id="geojson" type="geojson" data={geometryData} />
            <Layer
              id="geojson-line"
              source="geojson"
              type="line"
              paint={{
                'line-color': 'black',
                'line-width': 2,
              }}
            />
            <Layer
              id="geojson-fill"
              source="geojson"
              type="fill"
              paint={{
                'fill-color': 'black',
                'fill-opacity': 0.2,
              }}
            />
          </MapViewer>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 grid-rows-1 gap-4">
          <ProductOutputSummaryCard productOutput={productOutput} />
          <ProductOutputDependenciesCard productOutput={productOutput} />
        </div>
        <div className="flex flex-col gap-4">
          <DerivedIndicatorSummaryCard productOutput={productOutput} />
          {productOutput?.dependencyProductOutputs.map(
            (dependencyProductOutput) => (
              <ProductOutputDerivedDependenciesCard
                key={dependencyProductOutput.id}
                productOutput={dependencyProductOutput}
                parentProductOutput={productOutput}
              />
            ),
          )}
        </div>
      </div>

      <CrudForm
        form={form}
        mutation={updateProductOutput}
        entityName="Product Output"
        entityNamePlural="product outputs"
        hiddenFields={['visibility']}
        successMessage="Updated Product Output"
      />
    </div>
  )
}

export default ProductRunDetails
