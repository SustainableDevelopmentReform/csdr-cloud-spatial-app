'use client'

import { bbox } from '@turf/turf'
import { Layer, Map, Source } from '@vis.gl/react-maplibre'
import { ArrowUpRightIcon } from 'lucide-react'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useMemo } from 'react'
import {
  baseFormSchema,
  CrudForm,
} from '../../../../../../../../components/crud-form'
import { formatDateTime } from '../../../../../../../../utils/date'
import { DetailCard } from '../../../../../../_components/detail-cards'
import { MainRunBadge } from '../../../../../../_components/main-run-badge'
import { useGeometriesLink } from '../../../../../../geometries/_hooks'
import { VariableButton } from '../../../../../../variables/_components/variable-button'
import {
  useProduct,
  useProductOutput,
  useProductRun,
  useUpdateProductOutput,
} from '../../../../../_hooks'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const ProductRunDetails = () => {
  const { data: product } = useProduct()
  const { data: productRun } = useProductRun()
  const { data: productOutput } = useProductOutput()
  const updateProductOutput = useUpdateProductOutput()
  const geometriesLink = useGeometriesLink()

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
    resolver: zodResolver(baseFormSchema),
  })

  useEffect(() => {
    if (productOutput) {
      form.reset(productOutput)
    }
  }, [productOutput, form])

  return (
    <div className="max-w-2xl gap-8 flex flex-col">
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

      <div className="grid grid-cols-2 grid-rows-1 gap-4">
        {productOutput && (
          <DetailCard
            title={productOutput.value}
            description="Output Value"
            footer={formatDateTime(productOutput.timePoint)}
            subFooter={<VariableButton variable={productOutput.variable} />}
          />
        )}
        {productOutput?.geometryOutput && (
          <DetailCard
            title={`${productOutput?.geometryOutput?.geometriesRun?.geometries?.name} : ${productOutput?.geometryOutput?.name}`}
            description="Geometry"
            footer={`Created: ${formatDateTime(productRun?.geometriesRun?.createdAt)}`}
            subFooter={productRun?.geometriesRun?.id}
            actionText="Open"
            actionLink={geometriesLink(
              productOutput?.geometryOutput?.geometriesRun?.geometries,
            )}
            actionIcon={<ArrowUpRightIcon />}
          />
        )}
      </div>

      <CrudForm form={form} mutation={updateProductOutput} />
    </div>
  )
}

export default ProductRunDetails
