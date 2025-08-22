'use client'

import { Button } from '@repo/ui/components/ui/button'
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/ui/card'
import { bbox } from '@turf/turf'
import { Layer, Map, Source } from '@vis.gl/react-maplibre'
import { ArrowUpRightIcon } from 'lucide-react'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useMemo } from 'react'
import Link from '../../../../../../../../components/link'
import { formatDateTime } from '../../../../../../../../utils/date'
import { MainRunBadge } from '../../../../../../_components/main-run-badge'
import { useGeometriesLink } from '../../../../../_hooks'
import { VariableButton } from '../../../../../../variables/_components/variable-button'
import {
  useGeometries,
  useGeometryOutput,
  useGeometriesRun,
} from '../../../../../_hooks'
import { DetailCard } from '../../../../../../_components/detail-cards'

const GeometriesRunDetails = () => {
  const { data: geometries } = useGeometries()
  const { data: geometriesRun } = useGeometriesRun()
  const { data: geometryOutput } = useGeometryOutput()

  const geometriesLink = useGeometriesLink()

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

  return (
    <div className="max-w-2xl gap-8 flex flex-col">
      <div className="text-2xl font-medium flex items-center gap-2">
        Geometries Run Output Details
        {geometries?.mainRun &&
          geometriesRun?.id === geometries?.mainRun?.id && (
            <MainRunBadge variant="geometries" />
          )}
      </div>
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
            title={`${geometryOutput?.name} : ${geometryOutput?.name}`}
            description="Geometry"
            footer={`Created: ${formatDateTime(geometriesRun?.createdAt)}`}
            subFooter={geometriesRun?.id}
          />
        )}
      </div>
    </div>
  )
}

export default GeometriesRunDetails
