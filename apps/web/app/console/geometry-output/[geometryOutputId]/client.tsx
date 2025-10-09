'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { updateGeometryOutputSchema } from '@repo/schemas/crud'
import { FormItem, FormLabel, FormMessage } from '@repo/ui/components/ui/form'
import { Textarea } from '@repo/ui/components/ui/textarea'
import { bbox } from '@turf/turf'
import { Layer, Source } from '@vis.gl/react-maplibre'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { CrudForm } from '../../../../components/crud-form'
import { MapViewer } from '../../../../components/map-viewer'
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
    <div className="w-[800px] max-w-full gap-8 flex flex-col">
      <div className="rounded-lg overflow-hidden">
        {geometryBbox && (
          <MapViewer
            initialViewState={{
              bounds: geometryBbox as [number, number, number, number],
              fitBoundsOptions: { padding: 100 },
            }}
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
          </MapViewer>
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
        entityName="Geometry Output"
        entityNamePlural="Geometry Outputs"
        readOnlyFields={['id', 'metadata', 'name']}
        successMessage="Updated Geometry Output"
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
