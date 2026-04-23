'use client' // Redundant but explicit.
import React, { useEffect, useState, useRef, useMemo } from 'react'
import { Map, Source, Layer } from '@vis.gl/react-maplibre'
import maplibregl from 'maplibre-gl'
import { Protocol } from 'pmtiles'
import DeckGL from '@deck.gl/react'
import { MapViewState, LayersList, WebMercatorViewport } from '@deck.gl/core'
import { GeoJsonLayer } from '@deck.gl/layers'
import initParquetWasm, { readParquet } from 'parquet-wasm'
import { Table, tableFromIPC } from 'apache-arrow'
import { PMTiles, Header as PMTilesHeader } from 'pmtiles'
import { useQuery } from '@tanstack/react-query'

import { COGLayer, MosaicLayer } from '@developmentseed/deck.gl-geotiff'
import { DatasetRunListItem } from '../_hooks'

// --- Types ---

/**
 * Visualization style for a dataset. Stored as a nullable JSON column on the
 * dataset model.
 *
 * Raster / COG (STAC-GeoParquet) example:
 * ```json
 * {
 *   "asset": "mangroves",
 *   "type": "raster",
 *   "display": "categorical",
 *   "values": {
 *     "1": { "color": "rgba(86, 173, 60, 1)", "label": "Mangrove (Open)" },
 *     "2": { "color": "rgba(46, 139, 87, 1)", "label": "Mangrove (Closed)" }
 *   }
 * }
 * ```
 *
 * Vector / PMTiles (GeoParquet) example:
 * ```json
 * {
 *   "type": "vector-polygon",
 *   "display": "simple",
 *   "color": "rgba(209, 255, 93, 1)",
 *   "label": "Reef"
 * }
 * ```
 *
 * When null/undefined the map falls back to rendering with the default blue.
 */
export type DatasetStyle = {
  /** Which STAC asset to render (raster only). */
  asset?: string
  /** "raster" for COG/STAC-GeoParquet, "vector-polygon" for PMTiles. */
  type?: 'raster' | 'vector-polygon'
  /** "categorical" (pixel-value map) or "simple" (single colour). */
  display?: 'categorical' | 'simple'
  /** CSS colour for simple/single-colour rendering (PMTiles fill, COG fallback). */
  color?: string
  /** Human-readable label for simple/single-colour rendering. */
  label?: string
  /** Pixel-value → {label, CSS colour} for categorical COG rendering. Keys are string-encoded integers. */
  values?: Record<string, { label: string; color: string }>
}

type ResolvedCategory = {
  value: number
  label: string
  rgb: [number, number, number]
}

type ColormapModule = {
  module: { name: string; inject: Record<string, string> }
}

/** Custom props for ColorMappedCOGLayer, not part of deck.gl's type system. */
type ColorMappedCOGProps = {
  colormapModule: ColormapModule
  onCogError?: (msg: string) => void
}

// --- Constants ---

// This map either renders a PMTiles vector tile source with a simple style,
// or a COG mosaic using deck.gl's COGLayer and MosaicLayer.

const protocol = new Protocol()
maplibregl.addProtocol('pmtiles', protocol.tile)

const DEFAULT_COLOR = 'rgba(30, 119, 179, 1)'
const DEFAULT_LABEL = 'Data'
const DATASET_OPACITY = 0.85

// --- Pure helpers ---

/** Parse a CSS colour string (hex or rgba) to an [r,g,b] tuple. */
function parseColorToRgb(color: string): [number, number, number] {
  // rgba(r, g, b, a) or rgb(r, g, b)
  const rgbaMatch = color.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+\s*)?\)/,
  )
  if (rgbaMatch) {
    return [
      parseInt(rgbaMatch[1]!, 10),
      parseInt(rgbaMatch[2]!, 10),
      parseInt(rgbaMatch[3]!, 10),
    ]
  }
  // #rrggbb or #rgb
  const h = color.replace('#', '')
  return [
    parseInt(h.substring(0, 2), 16) || 0,
    parseInt(h.substring(2, 4), 16) || 0,
    parseInt(h.substring(4, 6), 16) || 0,
  ]
}

function glslVec4(r: number, g: number, b: number, a: number): string {
  return `vec4(${r.toFixed(4)}, ${g.toFixed(4)}, ${b.toFixed(4)}, ${a.toFixed(1)})`
}

/**
 * Build a GLSL colormap snippet for the deck.gl render pipeline.
 * If categories are provided, each pixel value maps to its colour.
 * Otherwise any non-zero, non-255 pixel renders as the fallback colour.
 */
function buildColormap(
  categories: ResolvedCategory[] | null,
  fallbackRgb: [number, number, number],
): string {
  const lines: string[] = ['float byteVal = floor(color.r * 255.0 + 0.5);']
  const transparent = 'color = vec4(0.0, 0.0, 0.0, 0.0);'

  if (!categories || categories.length === 0) {
    const [r, g, b] = fallbackRgb.map((c) => c / 255)
    lines.push(
      `if (byteVal > 0.0 && byteVal < 255.0) {`,
      `  color = ${glslVec4(r!, g!, b!, DATASET_OPACITY)};`,
      `} else {`,
      `  ${transparent}`,
      `}`,
    )
  } else {
    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i]!
      const [r, g, b] = cat.rgb.map((c) => c / 255)
      const kw = i === 0 ? 'if' : '} else if'
      lines.push(
        `${kw} (byteVal == ${cat.value}.0) {`,
        `  color = ${glslVec4(r!, g!, b!, DATASET_OPACITY)};`,
      )
    }
    lines.push(`} else {`, `  ${transparent}`, `}`)
  }

  return lines.join('\n')
}

function makeColormapModule(
  name: string,
  categories: ResolvedCategory[] | null,
  fallbackRgb: [number, number, number],
): ColormapModule {
  return {
    module: {
      name,
      inject: {
        'fs:DECKGL_FILTER_COLOR': buildColormap(categories, fallbackRgb),
      },
    },
  }
}

function bboxToFeatures(source: {
  bbox: [number, number, number, number]
  url: string
}) {
  const [minX, minY, maxX, maxY] = source.bbox
  const props = { url: source.url }

  const makePolygon = (x0: number, x1: number) => ({
    type: 'Feature' as const,
    geometry: {
      type: 'Polygon' as const,
      coordinates: [
        [
          [x0, minY],
          [x1, minY],
          [x1, maxY],
          [x0, maxY],
          [x0, minY],
        ],
      ],
    },
    properties: props,
  })

  if (maxX >= 180 || minX <= -180) {
    // TODO: Fix world-spanning bboxes nicer. This is just a rough guess.
    // Not robust, but grid cells are different for each dataset, and for each of the east-west hemispheres.
    return [makePolygon(-180, -179.17), makePolygon(179.17, 180)]
  }
  return [makePolygon(minX, maxX)]
}

function s3UrlToHttps(s3Url: string): string {
  if (!s3Url.startsWith('s3://')) return s3Url
  const withoutPrefix = s3Url.replace('s3://', '')
  const [bucket, ...pathParts] = withoutPrefix.split('/')
  return `https://${bucket}.s3.amazonaws.com/${pathParts.join('/')}`
}

// --- ColorMappedCOGLayer ---

/** Props that COGLayer actually receives at runtime, including our custom fields. */
type ColorMappedCOGLayerProps = ConstructorParameters<typeof COGLayer>[0] &
  ColorMappedCOGProps

/**
 * Subclass COGLayer to append a colormap to the default render pipeline.
 * Accepts `colormapModule` and `onCogError` as custom props.
 */
class ColorMappedCOGLayer extends COGLayer {
  static layerName = 'ColorMappedCOGLayer'

  /** Access custom props that are not part of COGLayer's type system. */
  private get customProps(): ColorMappedCOGLayerProps {
    // deck.gl passes our custom fields through at runtime but the base type doesn't declare them.
    // The MinimalDataT/DefaultDataT generic mismatch in the library prevents a direct cast,
    // so we assert through the widest safe type (object) to reach our intersection type.
    return this.props as object as ColorMappedCOGLayerProps
  }

  async _parseGeoTIFF() {
    try {
      await super._parseGeoTIFF()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn('[ColorMappedCOGLayer] _parseGeoTIFF failed:', msg)
      this.customProps.onCogError?.(msg)
      return
    }

    // Inject colormap shader module into the render pipeline
    const originalRenderTile = this.state.defaultRenderTile
    if (!originalRenderTile) return

    const colormapMod = this.customProps.colormapModule
    type RenderTileFn = NonNullable<typeof originalRenderTile>
    type TileData = Parameters<RenderTileFn>[0]
    this.setState({
      defaultRenderTile: (data: TileData) => {
        const result = originalRenderTile(data) as {
          renderPipeline?: ColormapModule[]
        }
        result.renderPipeline?.push(colormapMod)
        return result
      },
    })
  }
}

// --- Component ---

export const DatasetRunMap = ({
  dataType,
  dataUrl,
  dataPmtilesUrl,
  datasetStyle,
}: {
  dataType: DatasetRunListItem['dataType']
  dataUrl: Exclude<DatasetRunListItem['dataUrl'], null>
  dataPmtilesUrl: DatasetRunListItem['dataPmtilesUrl']
  /** Visualization style. If omitted, for raster data, all valid pixels render as the default blue. For vector data, all features render as the default blue. */
  datasetStyle?: DatasetStyle | null
}) => {
  const [viewState, setViewState] = useState<MapViewState | undefined>(
    undefined,
  )
  const [cogError, setCogError] = useState<string | null>(null)

  // --- Resolve visualization style ---

  /** Which asset to render from STAC-GeoParquet. If omitted, picks first available. */
  const datasetAsset = datasetStyle?.asset ?? null

  const { baseRgb, resolvedCategories, colormapModule } = useMemo(() => {
    const rgb = parseColorToRgb(datasetStyle?.color ?? DEFAULT_COLOR)

    const cats: ResolvedCategory[] | null = datasetStyle?.values
      ? Object.entries(datasetStyle.values)
          .map(([k, v]) => ({
            value: parseInt(k, 10),
            label: v.label,
            rgb: parseColorToRgb(v.color),
          }))
          .filter((c) => !isNaN(c.value))
      : null

    const mod = makeColormapModule(
      `colormap-${datasetAsset ?? 'default'}`,
      cats,
      rgb,
    )

    return { baseRgb: rgb, resolvedCategories: cats, colormapModule: mod }
  }, [datasetAsset, datasetStyle])

  // --- Data fetching ---

  const renderPMTiles = dataType === 'geoparquet' && !!dataPmtilesUrl
  const pmTilesHttpsUrl = renderPMTiles
    ? dataPmtilesUrl.includes('s3://')
      ? s3UrlToHttps(dataPmtilesUrl)
      : dataPmtilesUrl
    : null

  // PMTiles header (for map bounds and source layer name)
  const {
    data: pmtilesHeader,
    isLoading: isLoadingPmtilesHeader,
    error: pmtilesHeaderError,
  } = useQuery<(PMTilesHeader & { sourceLayer: string }) | null>({
    queryKey: ['pmtiles-header', pmTilesHttpsUrl],
    queryFn: async () => {
      if (!pmTilesHttpsUrl) return null
      const p = new PMTiles(pmTilesHttpsUrl)
      const [header, metadata] = await Promise.all([
        p.getHeader(),
        p.getMetadata(),
      ])
      // PMTiles metadata type is untyped - cast needed to access TileJSON fields.
      const meta = metadata as { vector_layers?: { id: string }[] } | undefined
      const sourceLayer = meta?.vector_layers?.[0]?.id ?? 'data'
      return { ...header, sourceLayer }
    },
    enabled: renderPMTiles,
  })

  // STAC-GeoParquet (for COG mosaic)
  const {
    data: parquetArrowTable,
    isLoading: isLoadingParquetArrowTable,
    error: parquetArrowTableError,
  } = useQuery<Table | null>({
    queryKey: ['parquet-arrow-table', dataUrl],
    queryFn: async () => {
      if (!dataUrl) return null
      const parquetArrowUrl = s3UrlToHttps(dataUrl)
      await initParquetWasm()
      const resp = await fetch(parquetArrowUrl)
      if (!resp.ok) {
        throw new Error(
          `Failed to fetch Parquet file: ${resp.status} ${resp.statusText} (${parquetArrowUrl})`,
        )
      }
      const arrayBuffer = await resp.arrayBuffer()
      const wasmTable = readParquet(new Uint8Array(arrayBuffer))
      return tableFromIPC(wasmTable.intoIPCStream())
    },
    enabled: dataType === 'stac-geoparquet' && !!dataUrl,
  })

  // --- Derive COG URLs and asset selection ---

  const { cogUrls, assets, initialAsset } = useMemo(() => {
    if (!parquetArrowTable || dataType !== 'stac-geoparquet')
      return { cogUrls: [], assets: [], initialAsset: undefined }

    const assetsVector = parquetArrowTable.getChild('assets')
    if (!assetsVector) {
      console.warn('[DatasetRunMap] No "assets" column found.')
      return { cogUrls: [], assets: [], initialAsset: undefined }
    }

    const assetFields = (assetsVector.type?.children ?? []) as {
      name: string
    }[]
    const assetKeys = assetFields.map((f) => f.name)

    // If datasetAsset is specified, try it first; otherwise try all assets.
    const keysToTry = datasetAsset
      ? [datasetAsset, ...assetKeys.filter((k) => k !== datasetAsset)]
      : assetKeys

    for (const assetKey of keysToTry) {
      const assetChild = assetsVector.getChild(assetKey)
      if (!assetChild) continue
      const hrefChild = assetChild.getChild('href')
      if (!hrefChild || hrefChild.length === 0) continue
      const urls: string[] = []
      for (let i = 0; i < hrefChild.length; i++) {
        const val = hrefChild.get(i)
        if (val) urls.push(s3UrlToHttps(String(val)))
      }
      if (urls.length > 0) {
        return { cogUrls: urls, assets: assetKeys, initialAsset: assetKey }
      }
    }

    console.error(
      '[DatasetRunMap] No href found in any asset. Available:',
      assetKeys,
    )
    return { cogUrls: [], assets: assetKeys, initialAsset: undefined }
  }, [parquetArrowTable, dataType, datasetAsset])

  // TODO: When user can pick assets, replace this with state initialized from initialAsset
  const selectedAsset = initialAsset

  // --- Year filtering and mosaic sources ---

  // TODO: Let user select year to visualise.
  const [selectedYear, setSelectedYear] = useState<number | null>(null)

  const { availableYears, mosaicSources } = useMemo(() => {
    if (!parquetArrowTable || cogUrls.length === 0) {
      return { availableYears: [], mosaicSources: [] }
    }

    const bboxVector = parquetArrowTable.getChild('bbox')
    const datetimeVector =
      parquetArrowTable.getChild('datetime') ??
      parquetArrowTable.getChild('start_datetime')

    const rows = cogUrls.map((url, i) => {
      const bboxVal = bboxVector?.get(i)
      const bbox = (bboxVal?.toArray() as
        | [number, number, number, number]
        | undefined) ?? [0, 0, 0, 0]
      const datetimeVal = datetimeVector?.get(i)
      const year =
        datetimeVal != null ? new Date(Number(datetimeVal)).getFullYear() : null
      return { url, bbox, year }
    })

    const availableYears = [
      ...new Set(rows.map((r) => r.year).filter(Boolean) as number[]),
    ].sort()
    const targetYear = selectedYear ?? availableYears.at(-1) ?? null
    const mosaicSources = rows
      .filter((r) => r.year === targetYear)
      .map(({ url, bbox }) => ({ url, bbox }))

    return { availableYears, mosaicSources }
  }, [parquetArrowTable, cogUrls, selectedYear])

  // --- Map bounds ---

  const mapBounds = useMemo(() => {
    if (isLoadingPmtilesHeader && isLoadingParquetArrowTable) return undefined

    if (pmtilesHeader) {
      return [
        pmtilesHeader.minLon,
        pmtilesHeader.minLat,
        pmtilesHeader.maxLon,
        pmtilesHeader.maxLat,
      ] as [number, number, number, number]
    }

    if (mosaicSources.length > 0) {
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity
      for (const source of mosaicSources) {
        const [x0, y0, x1, y1] = source.bbox
        minX = Math.min(minX, x0)
        minY = Math.min(minY, y0)
        maxX = Math.max(maxX, x1)
        maxY = Math.max(maxY, y1)
      }
      if (
        isFinite(minX) &&
        isFinite(minY) &&
        isFinite(maxX) &&
        isFinite(maxY)
      ) {
        return [minX, minY, maxX, maxY] as [number, number, number, number]
      }
    }

    return undefined
  }, [
    isLoadingPmtilesHeader,
    isLoadingParquetArrowTable,
    pmtilesHeader,
    mosaicSources,
  ])

  // --- Fit map to bounds ---

  const mapDimensionsRef = useRef({ width: 800, height: 384 })
  const mapContainerCallbackRef = (el: HTMLDivElement | null) => {
    if (el) {
      mapDimensionsRef.current = {
        width: el.clientWidth,
        height: el.clientHeight,
      }
    }
  }

  // useEffect needed: synchronising React state with DOM dimensions in response to a data change.
  useEffect(() => {
    if (!mapBounds) return
    const { width, height } = mapDimensionsRef.current
    const viewport = new WebMercatorViewport({ width, height })
    const [minLon, minLat, maxLon, maxLat] = mapBounds
    const { longitude, latitude, zoom } = viewport.fitBounds(
      [
        [minLon, minLat],
        [maxLon, maxLat],
      ],
      { padding: 20 },
    )
    setViewState((prev) => ({
      ...prev,
      longitude,
      latitude,
      zoom,
      pitch: 0,
      bearing: 0,
      transitionDuration: 0,
    }))
  }, [mapBounds])

  // --- COG deck.gl layers ---

  const zoom = viewState?.zoom ?? 0
  const cogMinZoom = Math.min(9, Math.round((mosaicSources.length / 1000) * 9))

  const layers = useMemo<LayersList>(() => {
    if (dataType !== 'stac-geoparquet' || mosaicSources.length === 0) return []
    setCogError(null)

    const layerList: LayersList = []

    layerList.push(
      new GeoJsonLayer({
        id: 'mosaic-bboxes',
        data: {
          type: 'FeatureCollection',
          features: mosaicSources.flatMap(bboxToFeatures),
        },
        stroked: true,
        filled: false,
        getLineColor: [
          baseRgb[0],
          baseRgb[1],
          baseRgb[2],
          255 * (DATASET_OPACITY / 3),
        ],
        getLineWidth: 1,
        lineWidthMinPixels: 1,
      }),
    )

    if (zoom >= cogMinZoom) {
      /** Build props for ColorMappedCOGLayer, merging our custom fields with deck.gl's. */
      const cogLayerProps = (
        overrides: Record<string, string | AbortSignal | undefined>,
      ) =>
        ({
          colormapModule,
          onCogError: setCogError,
          ...overrides,
          // Cast through the subclass constructor type to satisfy deck.gl-geotiff's
          // broken MinimalDataT/DefaultDataT generics.
        }) as ConstructorParameters<typeof ColorMappedCOGLayer>[0]

      if (mosaicSources.length === 1 && mosaicSources[0]) {
        layerList.push(
          new ColorMappedCOGLayer(
            cogLayerProps({
              id: 'cog-single',
              geotiff: mosaicSources[0].url,
            }),
          ),
        )
      } else {
        layerList.push(
          new MosaicLayer({
            id: 'mosaic-layer',
            sources: mosaicSources,
            minZoom: cogMinZoom,
            renderSource: (source, { signal }) =>
              new ColorMappedCOGLayer(
                cogLayerProps({
                  id: `cog-${source.url}`,
                  geotiff: source.url,
                  signal,
                }),
              ),
          }),
        )
      }
    }

    return layerList
  }, [dataType, zoom, mosaicSources, cogMinZoom, colormapModule, baseRgb])

  // --- Legend entries ---

  const legendEntries = useMemo(() => {
    if (resolvedCategories && resolvedCategories.length > 0) {
      return resolvedCategories.map((c) => ({ label: c.label, rgb: c.rgb }))
    }
    // Fallback: single entry with the asset name (COG) or configured label.
    const label = datasetStyle?.label ?? selectedAsset ?? DEFAULT_LABEL
    return [{ label, rgb: baseRgb }]
  }, [resolvedCategories, datasetStyle?.label, selectedAsset, baseRgb])

  // --- Render ---

  if (pmtilesHeaderError || parquetArrowTableError) {
    return (
      <p className="text-red-500">
        Error:{' '}
        {pmtilesHeaderError?.message || pmtilesHeaderError?.toString() || ''}
        {parquetArrowTableError && pmtilesHeaderError ? ' | ' : ''}
        {parquetArrowTableError?.message ||
          parquetArrowTableError?.toString() ||
          ''}
      </p>
    )
  }

  const isLoading =
    (dataType === 'stac-geoparquet' && isLoadingParquetArrowTable) ||
    (dataType === 'geoparquet' && isLoadingPmtilesHeader)

  const showLegend =
    !isLoading &&
    ((dataType === 'stac-geoparquet' && !!selectedAsset) ||
      (dataType === 'geoparquet' && renderPMTiles && !!pmtilesHeader))

  return (
    <div className="max-w-full flex flex-col mb-4">
      <div
        ref={mapContainerCallbackRef}
        className="rounded-lg overflow-hidden h-96 relative"
      >
        <DeckGL
          viewState={viewState}
          onViewStateChange={({ viewState: vs }) =>
            setViewState(vs as MapViewState)
          }
          controller={true}
          layers={layers}
          getCursor={({ isHovering }) => (isHovering ? 'pointer' : 'default')}
          initialViewState={{ longitude: 0, latitude: 0, zoom: 0 }}
          width="100%"
          height="100%"
          onError={(error) => console.warn('[DeckGL] error:', error)}
        >
          <Map
            style={{ width: '100%', height: '100%' }}
            mapStyle="https://api.protomaps.com/styles/v5/white/en.json?key=51cf1275231eb004"
          >
            {renderPMTiles && pmTilesHttpsUrl && pmtilesHeader && (
              <>
                <Source
                  id="pmtiles-source"
                  type="vector"
                  url={`pmtiles://${pmTilesHttpsUrl}`}
                />
                <Layer
                  id="pmtiles-fill"
                  type="fill"
                  source="pmtiles-source"
                  source-layer={pmtilesHeader.sourceLayer}
                  paint={{
                    'fill-color': `rgb(${baseRgb[0]}, ${baseRgb[1]}, ${baseRgb[2]})`,
                    'fill-opacity': DATASET_OPACITY,
                    'fill-antialias': false,
                  }}
                />
              </>
            )}
          </Map>
        </DeckGL>

        {isLoading && (
          <div className="absolute top-2 left-2 bg-white p-2 rounded shadow">
            <span className="text-sm">
              Loading{' '}
              {dataType === 'stac-geoparquet' ? 'STAC-GeoParquet' : 'PMTiles'}
              ...
            </span>
          </div>
        )}
        {dataType === 'stac-geoparquet' && mosaicSources.length > 0 && (
          <div className="absolute top-2 left-2 bg-white p-2 rounded shadow">
            <span className="text-sm">
              {mosaicSources.length === 1
                ? 'Showing single COG.'
                : `Showing mosaic of ${mosaicSources.length} COGs.`}
              {zoom < cogMinZoom && ' Zoom in to blue boxes to see data.'}
            </span>
          </div>
        )}
        {dataType === 'stac-geoparquet' &&
          !isLoadingParquetArrowTable &&
          mosaicSources.length === 0 && (
            <div className="absolute top-2 left-2 bg-yellow-100 p-2 rounded shadow text-sm">
              No COG URLs found - check console for available columns.
            </div>
          )}
        {!isLoading &&
          dataType === 'geoparquet' &&
          pmTilesHttpsUrl &&
          pmtilesHeader && (
            <div className="absolute top-2 left-2 bg-white p-2 rounded shadow text-sm">
              <span>Showing PMTiles - zoom in for more detail.</span>
            </div>
          )}
        {showLegend && (
          <div className="absolute bottom-2 left-2 bg-white/90 px-3 py-2 rounded shadow text-xs space-y-1">
            {legendEntries.map((entry) => (
              <div key={entry.label} className="flex items-center gap-2">
                <span
                  className="inline-block w-3 h-3 rounded-sm"
                  style={{
                    backgroundColor: `rgb(${entry.rgb.join(',')})`,
                  }}
                />
                <span>{entry.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* TODO: Remove this once DEA/GA allow CORS for the ACE COGs */}
      {cogError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded px-3 py-2 mt-2">
          <strong>COG load error:</strong> {cogError}
          {cogError.includes('Request outside of bounds bytes') ? (
            <span className="block text-red-500 mt-1">
              This is likely a CORS issue. The data server may not allow
              cross-origin requests.
            </span>
          ) : null}
        </div>
      )}
      <div className="mt-2">
        {assets && assets.length > 0 && (
          <div className="flex gap-2 items-center text-sm">
            <span className="text-gray-500">Available Assets:</span>
            {assets.map((asset) => (
              <p
                key={asset}
                className={
                  asset === selectedAsset ? 'font-semibold' : 'text-gray-500'
                }
              >
                {asset}
              </p>
            ))}
          </div>
        )}
        {availableYears.length > 0 && (
          <div className="flex gap-2 items-center text-sm">
            <span className="text-gray-500">Available Years of Data:</span>
            {availableYears.map((year) => (
              <p
                key={year}
                className={
                  (selectedYear ?? availableYears.at(-1)) === year
                    ? 'font-semibold'
                    : 'text-gray-500'
                }
              >
                {year}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
