'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { updateProductOutputSchema } from '@repo/schemas/crud'
import { bbox } from '@turf/turf'
import { Layer, Map, Source } from '@vis.gl/react-maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { CrudForm } from '../../../../../components/form/crud-form'
import { useGeometryOutputLink } from '../../../geometries/_hooks'
import { ProductOutputDependenciesCard } from '../../_components/product-output-dependencies-card'
import { ProductOutputSummaryCard } from '../../_components/product-output-summary-card'
import { useProductOutput, useUpdateProductOutput } from '../../_hooks'
import { ProductOutputDerivedDependenciesCard } from '../../_components/product-output-derived-dependencies-card'

const ProductRunDetails = () => {
  const { data: productOutput } = useProductOutput()
  const updateProductOutput = useUpdateProductOutput()
  const geometryOutputLink = useGeometryOutputLink()

  const geometry = useMemo(() => {
    return (
      productOutput?.geometryOutput?.geometry ?? {
        type: 'FeatureCollection',
        features: [],
      }
    )
  }, [productOutput?.geometryOutput?.geometry])

  const geometryBbox = useMemo(() => {
    return productOutput?.geometryOutput?.geometry
      ? bbox(productOutput?.geometryOutput?.geometry as any)
      : undefined
  }, [productOutput?.geometryOutput?.geometry])

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
      <div className="rounded-lg overflow-hidden">
        {geometryBbox && (
          <Map
            initialViewState={{
              bounds: geometryBbox as [number, number, number, number],
              fitBoundsOptions: { padding: 100 },
            }}
            style={{ width: '100%', height: '400px' }}
            mapStyle="https://api.protomaps.com/styles/v5/white/en.json?key=51cf1275231eb004"
          >
            <Source id="geojson" type="geojson" data={geometry as any} />
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
          </Map>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 grid-rows-1 gap-4">
          <ProductOutputSummaryCard productOutput={productOutput} />
          <ProductOutputDependenciesCard productOutput={productOutput} />
        </div>
        <div className="flex flex-col gap-4">
          {productOutput?.dependencyProductOutputs.map(
            (dependencyProductOutput) => (
              <ProductOutputDerivedDependenciesCard
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
        successMessage="Updated Product Output"
      />
    </div>
  )
}

export default ProductRunDetails
