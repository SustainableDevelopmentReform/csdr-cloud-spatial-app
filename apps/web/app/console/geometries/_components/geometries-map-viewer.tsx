'use client'

import { OnSelectCallback } from '@repo/plot/types'
import { cn } from '@repo/ui/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { bbox as turfBbox } from '@turf/turf'
import {
  FillLayerSpecification,
  Layer,
  LineLayerSpecification,
  MapRef,
  Source,
} from '@vis.gl/react-maplibre'
import { interpolateYlOrRd } from 'd3-scale-chromatic'
import {
  ExpressionInputType,
  ExpressionSpecification,
  MapLayerMouseEvent,
} from 'maplibre-gl'
import { PMTiles, Header as PMTilesHeader } from 'pmtiles'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { EmptyCard } from '../../_components/empty-card'
import {
  GeometriesRunListItem,
  useGeometryOutputsExport,
} from '../../geometries/_hooks'
import {
  ProductOutputExportListItem,
  ProductRunDetail,
} from '../../product/_hooks'
import { VariableListItem } from '../../variable/_hooks'
import { MapViewer } from './map-viewer'

const NO_DATA_COLOR = '#eef'
const ID_PROPERTY = 'csdr-id'

const GeometriesMapViewer = ({
  geometriesRun,
  variable,
  productRun,
  productOutputs,
  zoomToGeometryOutputIds,
  onSelect,
  className,
}: {
  geometriesRun?: GeometriesRunListItem | null
  variable?: VariableListItem | null
  productRun?: ProductRunDetail | null
  productOutputs?: ProductOutputExportListItem[] | null
  zoomToGeometryOutputIds?: string[] | null
  onSelect?: OnSelectCallback<ProductOutputExportListItem>
  className?: string
}) => {
  const {
    data: geometryOutputsToZoomTo,
    isLoading: isLoadingGeometryOutputsToZoomTo,
    error: geometryOutputsToZoomToError,
  } = useGeometryOutputsExport(
    zoomToGeometryOutputIds ? geometriesRun?.id : undefined,
    {
      geometryOutputIds: zoomToGeometryOutputIds ?? undefined,
    },
  )

  const pmtilesUrl = useMemo(() => {
    if (!geometriesRun?.dataPmtilesUrl) return undefined

    if (geometriesRun.dataPmtilesUrl.startsWith('s3://')) {
      // Convert s3://bucket-name/path/to/file to https://bucket-name.s3.amazonaws.com/path/to/file
      const s3Url = geometriesRun.dataPmtilesUrl.replace('s3://', '')
      const [bucket, ...pathParts] = s3Url.split('/')
      const path = pathParts.join('/')
      return `https://${bucket}.s3.amazonaws.com/${path}`
    }

    return geometriesRun?.dataPmtilesUrl
  }, [geometriesRun?.dataPmtilesUrl])

  const {
    data: pmtilesHeader,
    isLoading: isLoadingPmtilesHeader,
    error: pmtilesHeaderError,
  } = useQuery<PMTilesHeader | null>({
    queryKey: ['pmtiles-header', pmtilesUrl],
    queryFn: async () => {
      if (!pmtilesUrl) return null
      const p = new PMTiles(pmtilesUrl)
      return p.getHeader()
    },
  })

  const mapBounds = useMemo(() => {
    if (isLoadingPmtilesHeader || isLoadingGeometryOutputsToZoomTo)
      return undefined

    if (
      geometryOutputsToZoomTo?.data?.length &&
      geometryOutputsToZoomTo.data.length > 0
    ) {
      return geometryOutputsToZoomTo.data.reduce<
        [number, number, number, number]
      >(
        (acc, output) => {
          const bbox = output.geometry?.bbox ?? turfBbox(output.geometry)
          return [
            Math.min(acc[0], bbox[0] ?? Infinity),
            Math.min(acc[1], bbox[1] ?? Infinity),
            Math.max(acc[2], bbox[2] ?? -Infinity),
            Math.max(acc[3], bbox[3] ?? -Infinity),
          ]
        },
        [Infinity, Infinity, -Infinity, -Infinity],
      ) as [number, number, number, number]
    }

    if (pmtilesHeader) {
      return [
        pmtilesHeader.minLon,
        pmtilesHeader.minLat,
        pmtilesHeader.maxLon,
        pmtilesHeader.maxLat,
      ] as [number, number, number, number]
    }

    return undefined
  }, [
    isLoadingPmtilesHeader,
    isLoadingGeometryOutputsToZoomTo,
    geometryOutputsToZoomTo?.data,
    pmtilesHeader,
  ])

  const { linePaint, fillPaint } = useMemo(() => {
    if (!variable)
      return {
        linePaint: {
          'line-color': 'black',
          'line-width': 2,
        },
        fillPaint: {
          'fill-color': 'black',
          'fill-opacity': 0.2,
        },
      }

    const variableSummary = productRun?.outputSummary?.variables.find(
      (v) => v.variable.id === variable.id,
    )

    const colorFn = (value: number | null) => {
      if (!value) return NO_DATA_COLOR
      const normalizedValue =
        (value - (variableSummary?.minValue ?? 0)) /
        ((variableSummary?.maxValue ?? 1) - (variableSummary?.minValue ?? 0))

      return interpolateYlOrRd(normalizedValue)
    }

    const fillColourEntries: [
      ExpressionSpecification,
      ExpressionInputType,
      ...(ExpressionInputType | ExpressionSpecification)[],
    ] = [['!', ['has', ID_PROPERTY]], NO_DATA_COLOR]

    productOutputs?.forEach((output) =>
      fillColourEntries.push(
        ['==', ['get', ID_PROPERTY], output.geometryOutputId],
        colorFn(output.value),
      ),
    )

    const selectedGeometriesLineWidth: [
      ExpressionSpecification,
      ExpressionInputType,
      ...(ExpressionInputType | ExpressionSpecification)[],
    ] = [['!', ['has', ID_PROPERTY]], 1]

    const selectedGeometriesLineOpacity: [
      ExpressionSpecification,
      ExpressionInputType,
      ...(ExpressionInputType | ExpressionSpecification)[],
    ] = [['!', ['has', ID_PROPERTY]], 0.1]

    geometryOutputsToZoomTo?.data?.forEach((output) => {
      selectedGeometriesLineWidth.push(
        ['==', ['get', ID_PROPERTY], output.id],
        zoomToGeometryOutputIds?.includes(output.id) ? 2 : 1,
      )
      selectedGeometriesLineOpacity.push(
        ['==', ['get', ID_PROPERTY], output.id],
        zoomToGeometryOutputIds?.includes(output.id) ? 1 : 0.1,
      )
    })

    const paint = {
      linePaint: {
        'line-color': 'black',
        'line-opacity': ['case', ...selectedGeometriesLineOpacity, 0.1],
        'line-width': ['case', ...selectedGeometriesLineWidth, 1],
      } satisfies LineLayerSpecification['paint'],
      fillPaint: {
        'fill-color': ['case', ...fillColourEntries, NO_DATA_COLOR],
        'fill-opacity': 0.7,
      } satisfies FillLayerSpecification['paint'],
    }

    return paint
  }, [
    variable,
    productRun?.outputSummary?.variables,
    productOutputs,
    geometryOutputsToZoomTo?.data,
    zoomToGeometryOutputIds,
  ])

  const mapRef = useRef<MapRef | null>(null)

  const onMouseClick = useCallback(
    (layer: MapLayerMouseEvent) => {
      const feature = layer.features?.[0]

      const output = productOutputs?.find(
        (output) =>
          output.geometryOutputId === feature?.properties?.[ID_PROPERTY],
      )

      onSelect?.({ dataPoint: output || null, event: layer.originalEvent })
    },
    [onSelect, productOutputs],
  )

  useEffect(() => {
    if (mapRef.current && mapBounds) {
      mapRef.current.fitBounds(mapBounds, { padding: 20 })
    }
  }, [mapBounds, mapRef])

  if (isLoadingPmtilesHeader || isLoadingGeometryOutputsToZoomTo)
    return <EmptyCard description="Loading" />
  if (pmtilesHeaderError || geometryOutputsToZoomToError)
    return (
      <EmptyCard
        description={`Error: ${pmtilesHeaderError?.message ?? geometryOutputsToZoomToError?.message}`}
      />
    )
  if (!pmtilesHeader)
    return (
      <EmptyCard description="Map data not available: No valid PMTiles URL provided" />
    )

  return (
    <div className={cn('rounded-lg overflow-hidden w-full h-full', className)}>
      <MapViewer
        ref={mapRef}
        initialViewState={{
          bounds: mapBounds,
          fitBoundsOptions: { padding: 20 },
        }}
        interactiveLayerIds={['geometries-fill']}
        onClick={onMouseClick}
      >
        <Source id="geometries" type="vector" url={`pmtiles://${pmtilesUrl}`} />
        <Layer
          id="geometries-fill"
          source="geometries"
          source-layer="data"
          type="fill"
          paint={fillPaint}
        />
        <Layer
          id="geometries-line"
          source="geometries"
          source-layer="data"
          type="line"
          paint={linePaint}
        />
      </MapViewer>
    </div>
  )
}

export default GeometriesMapViewer
