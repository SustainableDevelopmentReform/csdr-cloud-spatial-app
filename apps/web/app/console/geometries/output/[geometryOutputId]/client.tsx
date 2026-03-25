'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { updateGeometryOutputSchema } from '@repo/schemas/crud'
import { FormItem, FormLabel, FormMessage } from '@repo/ui/components/ui/form'
import { Textarea } from '@repo/ui/components/ui/textarea'
import { bbox } from '@turf/turf'
import type { FeatureCollection, Geometry } from 'geojson'
import { Layer, Source } from '@vis.gl/react-maplibre'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { CrudForm } from '../../../../../components/form/crud-form'
import { MapViewer } from '../../_components/map-viewer'
import { GeometryOutputCard } from '../../_components/geometry-output-card'
import {
  type GeometryOutputDetail,
  useGeometryOutput,
  useUpdateGeometryOutput,
} from '../../_hooks'

function toFeatureProperties(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null
  }

  return Object.fromEntries(Object.entries(value))
}

function createGeometryFeatureCollection(
  geometryOutput: GeometryOutputDetail | null | undefined,
): FeatureCollection<Geometry, Record<string, unknown> | null> | null {
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

const GeometriesRunDetails = () => {
  const { data: geometryOutput } = useGeometryOutput()
  const updateGeometryOutput = useUpdateGeometryOutput()

  const geometryData = useMemo(
    () => createGeometryFeatureCollection(geometryOutput),
    [geometryOutput],
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
    resolver: zodResolver(updateGeometryOutputSchema),
  })

  useEffect(() => {
    if (geometryOutput) {
      form.reset(geometryOutput)
    }
  }, [geometryOutput, form])

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
            value={JSON.stringify(geometryOutput?.properties, null, 2)}
          />
          <FormMessage />
        </FormItem>
      </CrudForm>
    </div>
  )
}

export default GeometriesRunDetails
