'use client'

import {
  FillLayerSpecification,
  Layer,
  LineLayerSpecification,
  Source,
} from '@vis.gl/react-maplibre'
import { PMTiles, Header as PMTilesHeader } from 'pmtiles'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { MapViewer } from '../../../../components/map-viewer'
import { useConfig } from '../../../../components/providers'
import { GeometriesRunListItem } from '../../geometries/_hooks'
import {
  ProductOutputExportListItem,
  ProductRunDetail,
} from '../../products/_hooks'
import { VariableListItem } from '../../variables/_hooks'
import { interpolateYlOrRd } from 'd3-scale-chromatic'
import {
  ExpressionInputType,
  ExpressionSpecification,
  Feature,
  MapGeoJSONFeature,
  MapLayerMouseEvent,
} from 'maplibre-gl'
import { useQuery } from '@tanstack/react-query'
import { EmptyCard } from '../../_components/empty-card'

const NO_DATA_COLOR = '#eef'

const GeometriesMapViewer = ({
  geometriesRun,
  variable,
  productRun,
  productOutputs,
  onSelect,
}: {
  geometriesRun?: GeometriesRunListItem | null
  variable?: VariableListItem | null
  productRun?: ProductRunDetail | null
  productOutputs?: ProductOutputExportListItem[] | null
  onSelect?: (output: ProductOutputExportListItem | null) => void
}) => {
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

    const entries: [
      ExpressionSpecification,
      ExpressionInputType,
      ...(ExpressionInputType | ExpressionSpecification)[],
    ] = [['!', ['has', 'id']], NO_DATA_COLOR]

    productOutputs?.forEach((output) =>
      entries.push(
        ['==', ['get', 'id'], output.geometryOutputId],
        colorFn(output.value),
      ),
    )

    return {
      linePaint: {
        'line-color': 'black',
        'line-opacity': 0.1,
        'line-width': 1,
      } satisfies LineLayerSpecification['paint'],
      fillPaint: {
        'fill-color': ['case', ...entries, NO_DATA_COLOR],
        'fill-opacity': 0.7,
      } satisfies FillLayerSpecification['paint'],
    }
  }, [variable, productRun, productOutputs])

  const [clickedFeature, setClickedFeature] =
    useState<MapGeoJSONFeature | null>(null)

  const onMouseMove = useCallback(
    (layer: MapLayerMouseEvent) => {
      if (clickedFeature) return
      const feature = layer.features?.[0]
      const output = productOutputs?.find(
        (output) => output.geometryOutputId === feature?.properties?.id,
      )
      onSelect?.(output || null)
    },
    [onSelect, productOutputs, clickedFeature],
  )

  const onMouseClick = useCallback(
    (layer: MapLayerMouseEvent) => {
      const feature = layer.features?.[0]

      if (
        clickedFeature &&
        feature?.properties?.id === clickedFeature?.properties?.id
      ) {
        setClickedFeature(null)
        onSelect?.(null)
        return
      }

      const output = productOutputs?.find(
        (output) => output.geometryOutputId === feature?.properties?.id,
      )
      onSelect?.(output || null)
      setClickedFeature(feature || null)
    },
    [onSelect, clickedFeature, productOutputs],
  )

  if (isLoadingPmtilesHeader) return <EmptyCard description="Loading PMTiles" />
  if (pmtilesHeaderError)
    return <EmptyCard description={`Error: ${pmtilesHeaderError.message}`} />
  if (!pmtilesHeader)
    return (
      <EmptyCard description="Map data not available: No valid PMTiles URL provided" />
    )
  return (
    <div className="rounded-lg overflow-hidden w-full h-full">
      <MapViewer
        initialViewState={{
          bounds: [
            pmtilesHeader.minLon,
            pmtilesHeader.minLat,
            pmtilesHeader.maxLon,
            pmtilesHeader.maxLat,
          ],
          fitBoundsOptions: { padding: 20 },
        }}
        interactiveLayerIds={['geometries-fill']}
        onMouseMove={onMouseMove}
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
