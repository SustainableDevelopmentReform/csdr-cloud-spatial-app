'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { updateGeometryOutputSchema } from '@repo/server/schemas/zod'
import { FormItem, FormLabel, FormMessage } from '@repo/ui/components/ui/form'
import { Textarea } from '@repo/ui/components/ui/textarea'
import { bbox } from '@turf/turf'
import { Layer, Map, Source } from '@vis.gl/react-maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { CrudForm } from '../../../../components/crud-form'
import { GeometryOutputCard } from '../../_components/geometry-output-card'
import {
  useGeometryOutput,
  useUpdateGeometryOutput,
} from '../../geometries/_hooks'

const GeometriesRunDetails = () => {
  const { data: geometryOutput } = useGeometryOutput()
  const updateGeometryOutput = useUpdateGeometryOutput()

  const geometry = useMemo(() => {
    return (
      geometryOutput?.geometry ?? {
        type: 'FeatureCollection',
        features: [],
      }
    )
  }, [geometryOutput?.geometry])

  const geometryBbox = useMemo(() => {
    return geometryOutput?.geometry
      ? bbox(geometryOutput?.geometry as any)
      : undefined
  }, [geometryOutput?.geometry])

  const form = useForm({
    resolver: zodResolver(updateGeometryOutputSchema),
  })

  useEffect(() => {
    if (geometryOutput) {
      form.reset(geometryOutput)
    }
  }, [geometryOutput, form])

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
        {geometryOutput && (
          <GeometryOutputCard geometryOutput={geometryOutput} />
        )}
      </div>

      <CrudForm
        form={form}
        mutation={updateGeometryOutput}
        hiddenFields={['id']}
        entityName="Geometry Output"
        entityNamePlural="Geometry Outputs"
        readOnlyFields={['id', 'metadata', 'name']}
      >
        <FormItem>
          <FormLabel>Properties</FormLabel>
          <Textarea
            className={'font-mono bg-gray-100'}
            disabled={true}
            value={
              geometryOutput?.properties === 'object'
                ? JSON.stringify(geometryOutput?.properties, null, 2)
                : geometryOutput?.properties
            }
          />
          <FormMessage />
        </FormItem>
      </CrudForm>
    </div>
  )
}

export default GeometriesRunDetails
