'use client'

import {
  type AppearanceConfig,
  type DivergingColorScheme,
  type LegendPosition,
  type OnSelectCallback,
  type SequentialColorScheme,
} from '@repo/plot/types'
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
import {
  interpolateBrBG,
  interpolateBlues,
  interpolateBuPu,
  interpolateGreens,
  interpolateInferno,
  interpolateOranges,
  interpolatePiYG,
  interpolatePlasma,
  interpolatePRGn,
  interpolateRdBu,
  interpolateRdYlGn,
  interpolateViridis,
  interpolateYlGnBu,
  interpolateYlOrRd,
} from 'd3-scale-chromatic'
import { scaleDiverging, scaleSequential } from 'd3-scale'
import {
  ExpressionInputType,
  ExpressionSpecification,
  MapLayerMouseEvent,
  RequestTransformFunction,
} from 'maplibre-gl'
import { PMTiles, Header as PMTilesHeader } from 'pmtiles'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useConfig } from '../../../../components/providers'
import { useMapPreview } from './map-preview-context'
import {
  GeometriesRunListItem,
  useGeometriesRun,
  useGeometryOutputsExport,
} from '../../geometries/_hooks'
import {
  ProductOutputExportListItem,
  ProductRunDetail,
} from '../../product/_hooks'
import { IndicatorListItem } from '../../indicator/_hooks'
import { MapViewer } from './map-viewer'
import { EmptyCard } from '../../_components/empty-card'

const NO_DATA_COLOR = '#eef'
const ID_PROPERTY = 'id'
const LEGEND_STOPS = 10

const SEQUENTIAL_INTERPOLATORS: Record<
  SequentialColorScheme,
  (t: number) => string
> = {
  ylOrRd: interpolateYlOrRd,
  viridis: interpolateViridis,
  plasma: interpolatePlasma,
  inferno: interpolateInferno,
  blues: interpolateBlues,
  greens: interpolateGreens,
  oranges: interpolateOranges,
  ylGnBu: interpolateYlGnBu,
  buPu: interpolateBuPu,
}

const DIVERGING_INTERPOLATORS: Record<
  DivergingColorScheme,
  (t: number) => string
> = {
  rdBu: interpolateRdBu,
  brBG: interpolateBrBG,
  piYG: interpolatePiYG,
  prGn: interpolatePRGn,
  rdYlGn: interpolateRdYlGn,
}

function buildColorScale(
  autoMin: number,
  autoMax: number,
  appearance?: AppearanceConfig,
): (value: number) => string {
  const min = appearance?.colorScaleMin ?? autoMin
  const max = appearance?.colorScaleMax ?? autoMax
  const reverse = appearance?.reverseColorScale ?? false
  const isDiverging = appearance?.colorScaleType === 'diverging'

  if (isDiverging) {
    const baseInterpolator =
      DIVERGING_INTERPOLATORS[appearance?.divergingScheme ?? 'rdBu'] ??
      interpolateRdBu
    const interpolator = reverse
      ? (t: number) => baseInterpolator(1 - t)
      : baseInterpolator
    const mid = appearance?.divergingMidpoint ?? (min + max) / 2
    if (min === max) {
      const c = interpolator(0.5)
      return () => c
    }
    const scale = scaleDiverging(interpolator).domain([min, mid, max])
    return (v: number) => scale(v)
  }

  const baseInterpolator =
    SEQUENTIAL_INTERPOLATORS[appearance?.sequentialScheme ?? 'ylOrRd'] ??
    interpolateYlOrRd
  const interpolator = reverse
    ? (t: number) => baseInterpolator(1 - t)
    : baseInterpolator
  if (min === max) {
    const c = interpolator(0.5)
    return () => c
  }
  const scale = scaleSequential(interpolator).domain([min, max])
  return (v: number) => scale(v)
}

// ---------------------------------------------------------------------------
// Continuous colour-scale legend
// ---------------------------------------------------------------------------

function MapLegend({
  min,
  max,
  scale,
  label,
  unit,
  position = 'bottom',
  compactNumbers,
  decimalPlaces,
}: {
  min: number
  max: number
  scale: (value: number) => string
  label?: string
  unit?: string
  position?: LegendPosition
  compactNumbers?: boolean
  decimalPlaces?: number
}) {
  // Build a set of colour stops for the gradient bar
  const stops = useMemo(() => {
    const result: string[] = []
    for (let i = 0; i <= LEGEND_STOPS; i++) {
      const t = i / LEGEND_STOPS
      const value = min + t * (max - min)
      result.push(scale(value))
    }
    return result
  }, [min, max, scale])

  const fmt = useMemo(() => {
    const opts: Intl.NumberFormatOptions = {
      notation: compactNumbers ? 'compact' : 'standard',
    }
    // Only set maximumFractionDigits when explicitly configured — compact
    // notation picks sensible defaults on its own.
    if (decimalPlaces !== undefined) {
      opts.maximumFractionDigits = decimalPlaces
    } else if (!compactNumbers) {
      opts.maximumFractionDigits = 2
    }
    const nf = new Intl.NumberFormat(undefined, opts)
    return (v: number) => nf.format(v)
  }, [compactNumbers, decimalPlaces])

  if (position === 'none') return null

  const positionClasses =
    position === 'top' ? 'top-3 left-3' : 'bottom-3 left-3'

  return (
    <div
      className={`pointer-events-auto absolute ${positionClasses} z-10 flex flex-col gap-1 rounded-md bg-background/90 px-3 py-2 text-xs shadow-md backdrop-blur-sm`}
    >
      {label && (
        <span className="font-medium text-foreground">
          {label}
          {unit ? ` (${unit})` : ''}
        </span>
      )}
      <div
        className="h-3 w-48 rounded-sm"
        style={{
          background: `linear-gradient(to right, ${stops.join(', ')})`,
        }}
      />
      <div className="flex justify-between text-muted-foreground">
        <span>{fmt(min)}</span>
        <span>{fmt(max)}</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const GeometriesMapViewer = ({
  geometriesRun: geometriesRunProp,
  indicator,
  productRun,
  productOutputs,
  zoomToGeometryOutputIds,
  appearance,
  onSelect,
  className,
}: {
  geometriesRun?: GeometriesRunListItem | null
  indicator?: IndicatorListItem | null
  productRun?: ProductRunDetail | null
  productOutputs?: ProductOutputExportListItem[] | null
  zoomToGeometryOutputIds?: string[] | null
  appearance?: AppearanceConfig
  onSelect?: OnSelectCallback<ProductOutputExportListItem>
  className?: string
}) => {
  const config = useConfig()

  const {
    data: geometriesRun,
    isLoading: isLoadingGeometriesRun,
    error: geometriesRunError,
  } = useGeometriesRun(geometriesRunProp?.id)

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
    fetchGeometryOutputsToZoomTo,
  )

  const {
    data: pmtilesHeader,
    isLoading: isLoadingPmtilesHeader,
    error: pmtilesHeaderError,
  } = useQuery<PMTilesHeader | null>({
    queryKey: ['pmtiles-header', geometriesRun?.dataPmtilesUrl],
    queryFn: async () => {
      let pmtilesUrl = geometriesRun?.dataPmtilesUrl

      if (!pmtilesUrl) return null

      if (pmtilesUrl.startsWith('s3://')) {
        // Convert s3://bucket-name/path/to/file to https://bucket-name.s3.amazonaws.com/path/to/file
        const s3Url = pmtilesUrl.replace('s3://', '')
        const [bucket, ...pathParts] = s3Url.split('/')
        const path = pathParts.join('/')
        pmtilesUrl = `https://${bucket}.s3.amazonaws.com/${path}`
      }

      const p = new PMTiles(pmtilesUrl)
      return p.getHeader()
    },
    enabled: !!geometriesRun?.dataPmtilesUrl,
  })

  const mapBounds = useMemo(() => {
    // If appearance has a complete explicit bounding box, use it as override
    if (
      appearance?.mapBbox &&
      typeof appearance.mapBbox.minLon === 'number' &&
      typeof appearance.mapBbox.minLat === 'number' &&
      typeof appearance.mapBbox.maxLon === 'number' &&
      typeof appearance.mapBbox.maxLat === 'number'
    ) {
      const { minLon, minLat, maxLon, maxLat } = appearance.mapBbox
      return [minLon, minLat, maxLon, maxLat] as [
        number,
        number,
        number,
        number,
      ]
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

    if (geometriesRun) {
      return [
        geometriesRun.bounds.minX,
        geometriesRun.bounds.minY,
        geometriesRun.bounds.maxX,
        geometriesRun.bounds.maxY,
      ] as [number, number, number, number]
    }

    return undefined
  }, [
    appearance?.mapBbox,
    isLoadingPmtilesHeader,
    isLoadingGeometryOutputsToZoomTo,
    isLoadingGeometriesRun,
    geometryOutputsToZoomTo,
    pmtilesHeader,
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
      console.log('fitBounds', mapBounds)
      mapRef.current.fitBounds(mapBounds, { padding: 20 })
    }
  }, [mapBounds])

  if (isLoadingGeometriesRun || isLoadingGeometryOutputsToZoomTo)
    return <EmptyCard description="Loading" />
  if (geometriesRunError || geometryOutputsToZoomToError)
    return (
      <EmptyCard
        description={`Error: ${geometriesRunError?.message ?? geometryOutputsToZoomToError?.message}`}
      />
    )

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
        transformRequest={transformRequest}
      >
        <Source
          id="geometries"
          type="vector"
          minzoom={0}
          maxzoom={22}
          tiles={[
            `${config.apiBaseUrl}/api/v0/geometries-run/${geometriesRun?.id}/outputs/mvt/{z}/{x}/{y}`,
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

export default GeometriesMapViewer
