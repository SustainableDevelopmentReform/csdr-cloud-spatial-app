'use client'

import { type AppearanceConfig, type OnSelectCallback } from '@repo/plot/types'
import { cn } from '@repo/ui/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { bbox as turfBbox } from '@turf/turf'
import {
  type FillLayerSpecification,
  Layer,
  type LineLayerSpecification,
  type MapRef,
  Source,
} from '@vis.gl/react-maplibre'
import {
  type ExpressionInputType,
  type ExpressionSpecification,
  type MapLayerMouseEvent,
  type RequestTransformFunction,
} from 'maplibre-gl'
import { PMTiles, type Header as PMTilesHeader } from 'pmtiles'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePrintRenderReadiness } from '~/components/print-readiness'
import { useConfig } from '../../../../components/providers'
import { useMapPreview } from './map-preview-context'
import {
  type GeometriesRunListItem,
  useGeometriesRun,
  useGeometryOutputsExport,
} from '../../geometries/_hooks'
import {
  type ProductOutputExportListItem,
  type ProductRunDetail,
} from '../../product/_hooks'
import { type IndicatorListItem } from '../../indicator/_hooks'
import { MapViewer } from './map-viewer'
import {
  buildColorScale,
  ID_PROPERTY,
  MapLegend,
  NO_DATA_COLOR,
} from './map-choropleth-style'

type MapBounds = [number, number, number, number]

function toMapBounds(
  minLon: number,
  minLat: number,
  maxLon: number,
  maxLat: number,
): MapBounds {
  return [minLon, minLat, maxLon, maxLat]
}

function boundsFromBbox(bbox: GeoJSON.BBox | undefined): MapBounds | null {
  if (!bbox || bbox.length < 4) return null

  const [minLon, minLat, maxLon, maxLat] = bbox
  if (
    typeof minLon !== 'number' ||
    typeof minLat !== 'number' ||
    typeof maxLon !== 'number' ||
    typeof maxLat !== 'number'
  ) {
    return null
  }

  return toMapBounds(minLon, minLat, maxLon, maxLat)
}

function expandBounds(current: MapBounds | null, next: MapBounds): MapBounds {
  if (!current) return next
  return [
    Math.min(current[0], next[0]),
    Math.min(current[1], next[1]),
    Math.max(current[2], next[2]),
    Math.max(current[3], next[3]),
  ]
}

function getS3HttpUrl(url: string) {
  const s3Url = url.replace('s3://', '')
  const [bucket, ...pathParts] = s3Url.split('/')
  if (!bucket) return null
  return `https://${bucket}.s3.amazonaws.com/${pathParts.join('/')}`
}

function resolvePmtilesUrl(url: string | null | undefined) {
  if (!url) return null
  return url.startsWith('s3://') ? getS3HttpUrl(url) : url
}

const ChoroplethMapViewer = ({
  geometriesRun: geometriesRunProp,
  indicator,
  productRun,
  productOutputs,
  zoomToGeometryOutputIds,
  appearance,
  onSelect,
  scrollZoom = true,
  className,
}: {
  geometriesRun?: GeometriesRunListItem | null
  indicator?: IndicatorListItem | null
  productRun?: ProductRunDetail | null
  productOutputs?: ProductOutputExportListItem[] | null
  zoomToGeometryOutputIds?: string[] | null
  appearance?: AppearanceConfig
  onSelect?: OnSelectCallback<ProductOutputExportListItem>
  scrollZoom?: boolean
  className?: string
}) => {
  const config = useConfig()

  const {
    data: geometriesRun,
    isLoading: isLoadingGeometriesRun,
    error: geometriesRunError,
  } = useGeometriesRun(geometriesRunProp?.id, !!geometriesRunProp?.id)

  const fetchGeometryOutputsToZoomTo = !!(
    zoomToGeometryOutputIds && zoomToGeometryOutputIds.length > 0
  )

  const {
    data: geometryOutputsToZoomTo,
    isLoading: isLoadingGeometryOutputsToZoomTo,
    error: geometryOutputsToZoomToError,
  } = useGeometryOutputsExport(
    fetchGeometryOutputsToZoomTo ? geometriesRun?.id : undefined,
    {
      geometryOutputIds: fetchGeometryOutputsToZoomTo
        ? zoomToGeometryOutputIds
        : undefined,
    },
    false,
    fetchGeometryOutputsToZoomTo && !!geometriesRun?.id,
  )

  const pmtilesUrl = resolvePmtilesUrl(geometriesRun?.dataPmtilesUrl)
  const { data: pmtilesHeader, isLoading: isLoadingPmtilesHeader } =
    useQuery<PMTilesHeader | null>({
      queryKey: ['pmtiles-header', pmtilesUrl],
      queryFn: async () => {
        if (!pmtilesUrl) return null

        const p = new PMTiles(pmtilesUrl)
        return p.getHeader()
      },
      enabled: !!pmtilesUrl,
    })
  const outputSummaryBounds = productRun?.outputSummary?.bounds

  const mapBounds = useMemo(() => {
    if (
      appearance?.mapBbox &&
      typeof appearance.mapBbox.minLon === 'number' &&
      typeof appearance.mapBbox.minLat === 'number' &&
      typeof appearance.mapBbox.maxLon === 'number' &&
      typeof appearance.mapBbox.maxLat === 'number'
    ) {
      const { minLon, minLat, maxLon, maxLat } = appearance.mapBbox
      return toMapBounds(minLon, minLat, maxLon, maxLat)
    }

    if (
      isLoadingPmtilesHeader ||
      isLoadingGeometryOutputsToZoomTo ||
      isLoadingGeometriesRun
    )
      return undefined

    if (
      geometryOutputsToZoomTo?.data?.length &&
      geometryOutputsToZoomTo.data.length > 0
    ) {
      return geometryOutputsToZoomTo.data.reduce<MapBounds | null>(
        (currentBounds, output) => {
          const geometry = output.geometry
          if (!geometry) return currentBounds
          const outputBounds =
            boundsFromBbox(geometry.bbox) ?? boundsFromBbox(turfBbox(geometry))
          return outputBounds
            ? expandBounds(currentBounds, outputBounds)
            : currentBounds
        },
        null,
      )
    }

    if (pmtilesHeader) {
      return toMapBounds(
        pmtilesHeader.minLon,
        pmtilesHeader.minLat,
        pmtilesHeader.maxLon,
        pmtilesHeader.maxLat,
      )
    }

    if (outputSummaryBounds) {
      return toMapBounds(
        outputSummaryBounds.minX,
        outputSummaryBounds.minY,
        outputSummaryBounds.maxX,
        outputSummaryBounds.maxY,
      )
    }

    if (geometriesRun) {
      return toMapBounds(
        geometriesRun.bounds.minX,
        geometriesRun.bounds.minY,
        geometriesRun.bounds.maxX,
        geometriesRun.bounds.maxY,
      )
    }

    return undefined
  }, [
    appearance?.mapBbox,
    isLoadingPmtilesHeader,
    isLoadingGeometryOutputsToZoomTo,
    isLoadingGeometriesRun,
    geometryOutputsToZoomTo,
    pmtilesHeader,
    outputSummaryBounds,
    geometriesRun,
  ])

  // Derive colour-scale info so both the paint memo and the legend can use it.
  const colorScaleInfo = useMemo(() => {
    if (!indicator) return null
    const indicatorSummary = productRun?.outputSummary?.indicators.find(
      (v) => v.indicator?.id === indicator.id,
    )
    const minVal = appearance?.colorScaleMin ?? indicatorSummary?.minValue ?? 0
    const maxVal = appearance?.colorScaleMax ?? indicatorSummary?.maxValue ?? 1
    const scale = buildColorScale(
      indicatorSummary?.minValue ?? 0,
      indicatorSummary?.maxValue ?? 1,
      appearance,
    )
    return { min: minVal, max: maxVal, scale }
  }, [indicator, productRun?.outputSummary?.indicators, appearance])

  const { linePaint, fillPaint } = useMemo(() => {
    if (!indicator || !colorScaleInfo)
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

    const { scale } = colorScaleInfo

    const colorFn = (value: number | null) => {
      if (value === null || value === undefined) return NO_DATA_COLOR
      return scale(value)
    }

    const fillColourEntries: [
      ExpressionSpecification,
      ExpressionInputType,
      ...(ExpressionInputType | ExpressionSpecification)[],
    ] = [['!', ['has', ID_PROPERTY]], NO_DATA_COLOR]

    const lineColourEntries: [
      ExpressionSpecification,
      ExpressionInputType,
      ...(ExpressionInputType | ExpressionSpecification)[],
    ] = [['!', ['has', ID_PROPERTY]], NO_DATA_COLOR]

    productOutputs?.forEach((output) => {
      if (output.geometryOutputId) {
        if (zoomToGeometryOutputIds?.includes(output.geometryOutputId)) {
          lineColourEntries.push(
            ['==', ['get', ID_PROPERTY], output.geometryOutputId],
            '#000000',
          )
        } else {
          lineColourEntries.push(
            ['==', ['get', ID_PROPERTY], output.geometryOutputId],
            colorFn(output.value),
          )
        }
        fillColourEntries.push(
          ['==', ['get', ID_PROPERTY], output.geometryOutputId],
          colorFn(output.value),
        )
      }
    })

    const selectedGeometriesLineWidth: [
      ExpressionSpecification,
      ExpressionInputType,
      ...(ExpressionInputType | ExpressionSpecification)[],
    ] = [['!', ['has', ID_PROPERTY]], 1]

    geometryOutputsToZoomTo?.data?.forEach((output) => {
      selectedGeometriesLineWidth.push(
        ['==', ['get', ID_PROPERTY], output.id],
        zoomToGeometryOutputIds?.includes(output.id) ? 2 : 1,
      )
    })

    const paint = {
      linePaint: {
        'line-color': ['case', ...lineColourEntries, NO_DATA_COLOR],
        'line-width': ['case', ...selectedGeometriesLineWidth, 1],
        'line-offset': 1,
      } satisfies LineLayerSpecification['paint'],
      fillPaint: {
        'fill-color': ['case', ...fillColourEntries, NO_DATA_COLOR],
        'fill-opacity': 0.7,
      } satisfies FillLayerSpecification['paint'],
    }

    return paint
  }, [
    indicator,
    colorScaleInfo,
    productOutputs,
    geometryOutputsToZoomTo?.data,
    zoomToGeometryOutputIds,
  ])

  const mapRef = useRef<MapRef | null>(null)
  const mapPreview = useMapPreview()
  const [lastIdleToken, setLastIdleToken] = useState<string | null>(null)
  const isMapLoading =
    isLoadingGeometriesRun ||
    isLoadingGeometryOutputsToZoomTo ||
    isLoadingPmtilesHeader
  const hasMapError = Boolean(
    geometriesRunError || geometryOutputsToZoomToError,
  )
  const mapRenderToken = useMemo(
    () =>
      [
        geometriesRun?.id ?? '',
        mapBounds?.join(',') ?? '',
        productOutputs
          ?.map(
            (output) =>
              `${output.geometryOutputId ?? ''}:${output.value}:${output.timePoint.toISOString()}`,
          )
          .join('|') ?? '',
        geometryOutputsToZoomTo?.data?.map((output) => output.id).join('|') ??
          '',
        zoomToGeometryOutputIds?.join('|') ?? '',
        isMapLoading ? 'loading' : 'loaded',
        hasMapError ? 'error' : 'ok',
      ].join('::'),
    [
      geometriesRun?.id,
      mapBounds,
      productOutputs,
      geometryOutputsToZoomTo?.data,
      zoomToGeometryOutputIds,
      isMapLoading,
      hasMapError,
    ],
  )
  const isMapIdle =
    !isMapLoading && !hasMapError && lastIdleToken === mapRenderToken

  // Callback ref that sets the internal ref and registers with the context
  const mapRefCallback = useCallback(
    (instance: MapRef | null) => {
      mapRef.current = instance
      mapPreview?.setMapInstance(instance)
    },
    [mapPreview],
  )

  const onMouseClick = useCallback(
    (layer: MapLayerMouseEvent) => {
      const feature = layer.features?.[0]

      const output = productOutputs?.find(
        (output) =>
          output.geometryOutputId === feature?.properties?.[ID_PROPERTY] ||
          output.geometryOutputId === feature?.id,
      )

      onSelect?.({ dataPoint: output || null, event: layer.originalEvent })
    },
    [onSelect, productOutputs],
  )

  const transformRequest: RequestTransformFunction = useCallback(
    (url: string) => {
      if (url.startsWith(config.apiBaseUrl)) {
        return {
          url: url,
          credentials: 'include',
        }
      }

      return { url }
    },
    [config.apiBaseUrl],
  )

  useEffect(() => {
    if (mapRef.current && mapBounds) {
      mapRef.current.fitBounds(mapBounds, { padding: 20 })
    }
  }, [mapBounds])

  usePrintRenderReadiness({
    isReady: !isMapLoading && (hasMapError || isMapIdle),
  })

  if (isLoadingGeometriesRun || isLoadingGeometryOutputsToZoomTo) {
    return (
      <div
        className={cn(
          'relative flex h-full w-full items-center justify-center overflow-hidden rounded-lg',
          className,
        )}
      >
        <div className="px-4 text-center text-sm text-muted-foreground">
          Loading map...
        </div>
      </div>
    )
  }

  if (geometriesRunError || geometryOutputsToZoomToError) {
    return (
      <div
        className={cn(
          'relative flex h-full w-full items-center justify-center overflow-hidden rounded-lg',
          className,
        )}
      >
        <div className="px-4 text-center text-sm text-muted-foreground">
          Error:{' '}
          {geometriesRunError?.message ?? geometryOutputsToZoomToError?.message}
        </div>
      </div>
    )
  }

  if (!geometriesRun?.id) {
    return (
      <div
        className={cn(
          'relative flex h-full w-full items-center justify-center overflow-hidden rounded-lg',
          className,
        )}
      >
        <div className="px-4 text-center text-sm text-muted-foreground">
          Map data is unavailable.
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative rounded-lg overflow-hidden w-full h-full',
        className,
      )}
    >
      <MapViewer
        ref={mapRefCallback}
        interactiveLayerIds={['geometries-fill']}
        initialViewState={
          mapBounds
            ? { bounds: mapBounds, fitBoundsOptions: { padding: 20 } }
            : undefined
        }
        onClick={onMouseClick}
        onIdle={() => {
          setLastIdleToken(mapRenderToken)
        }}
        scrollZoom={scrollZoom}
        transformRequest={transformRequest}
      >
        <Source
          id="geometries"
          type="vector"
          minzoom={0}
          maxzoom={22}
          tiles={[
            `${config.apiBaseUrl}/api/v0/geometries-run/${geometriesRun.id}/outputs/mvt/{z}/{x}/{y}`,
          ]}
        />
        <Layer
          id="geometries-fill"
          source="geometries"
          source-layer="data"
          type="fill"
          paint={fillPaint}
        />
        {(appearance?.showOutlines ?? true) && (
          <Layer
            id="geometries-line"
            source="geometries"
            source-layer="data"
            type="line"
            paint={linePaint}
          />
        )}
      </MapViewer>
      {colorScaleInfo && (
        <MapLegend
          min={colorScaleInfo.min}
          max={colorScaleInfo.max}
          scale={colorScaleInfo.scale}
          label={indicator?.name}
          unit={indicator?.unit}
          position={appearance?.legendPosition ?? 'bottom'}
          compactNumbers={appearance?.compactNumbers}
          decimalPlaces={appearance?.decimalPlaces}
        />
      )}
    </div>
  )
}

export default ChoroplethMapViewer
