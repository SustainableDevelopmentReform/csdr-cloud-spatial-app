'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/ui/form'
import { Textarea } from '@repo/ui/components/ui/textarea'
import { bbox } from '@turf/turf'
import { Layer, Map, Source } from '@vis.gl/react-maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useMemo } from 'react'
import { Path, useForm } from 'react-hook-form'
import {
  baseFormSchema,
  CrudForm,
} from '../../../../../../../../components/crud-form'
import { formatDateTime } from '../../../../../../../../utils/date'
import { DetailCard } from '../../../../../../_components/detail-cards'
import {
  useGeometries,
  useGeometriesRun,
  useGeometryOutput,
  useUpdateGeometryOutput,
} from '../../../../../_hooks'

const updateGeometryOutputSchema = baseFormSchema.omit({ name: true })

const GeometriesRunDetails = () => {
  const { data: geometries } = useGeometries()
  const { data: geometriesRun } = useGeometriesRun()
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
          <DetailCard
            title={`${geometries?.name} : ${geometryOutput?.name}`}
            description="Geometry"
            footer={`Created: ${formatDateTime(geometriesRun?.createdAt)}`}
            subFooter={geometriesRun?.id}
          />
        )}
      </div>

      <CrudForm
        form={form}
        mutation={updateGeometryOutput}
        hiddenFields={['id', 'createdAt', 'updatedAt']}
        entityName="Geometry Output"
        entityNamePlural="Geometry Outputs"
        readOnlyFields={['id', 'createdAt', 'updatedAt', 'metadata', 'name']}
      >
        <FormField
          control={form.control}
          name={'properties'}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Properties</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  className={'font-mono bg-gray-100'}
                  disabled={true}
                  value={
                    typeof field.value === 'object'
                      ? JSON.stringify(field.value, null, 2)
                      : field.value
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CrudForm>
    </div>
  )
}

export default GeometriesRunDetails
