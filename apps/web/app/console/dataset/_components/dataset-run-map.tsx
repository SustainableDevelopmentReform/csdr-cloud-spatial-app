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

const protocol = new Protocol()
maplibregl.addProtocol('pmtiles', protocol.tile)

type colorArray = [number, number, number, number]
const datasetColor: colorArray = [30, 119, 179, 255]

// Human-readable labels and RGB colors (0-255) for the legend
const valueLegend: Record<
  number,
  { label: string; color: [number, number, number] }
> = {
  1: {
    label: 'Data',
    color: [datasetColor[0], datasetColor[1], datasetColor[2]],
  },
  2: { label: 'Intertidal', color: [148, 65, 14] },
  3: { label: 'Mangrove', color: [41, 223, 58] },
  4: { label: 'Saltmarsh', color: [219, 228, 54] },
  5: { label: 'Seagrass', color: [14, 131, 78] },
}

// ACE classification: 2=intertidal, 3=mangrove, 4=saltmarsh, 5=seagrass
// Colors sourced from DEA Australia (RGB 0-1 for GLSL).
// Value 1 is used by other datasets (gmw, seagrass, dep-mangrove) = datasetColor.
// All other values (including 0, 255/nodata) = transparent.
const valueColors: Record<number, [number, number, number]> =
  Object.fromEntries(
    Object.entries(valueLegend).map(([k, v]) => [
      k,
      v.color.map((c) => c / 255) as [number, number, number],
    ]),
  )

// Which legend entries to show per selected asset
const assetLegendKeys: Record<string, number[]> = {
  classification: [2, 3, 4, 5],
  seagrass: [1],
  mangrove: [1],
  gmw_v3_and_v4: [1],
  'dep-mangrove': [1, 2],
}

// Build GLSL colormap: byte values are normalized to [0,1] in r8unorm textures
function buildColormap(validValues: number[] | null): string {
  const lines: string[] = ['float byteVal = floor(color.r * 255.0 + 0.5);']

  if (validValues === null) {
    // Fallback: any non-zero, non-255 = datasetColor
    const fb = [
      datasetColor[0] / 255,
      datasetColor[1] / 255,
      datasetColor[2] / 255,
    ] as const
    lines.push('if (byteVal > 0.0 && byteVal < 255.0) {')
    lines.push(
      `  color = vec4(${fb[0].toFixed(4)}, ${fb[1].toFixed(4)}, ${fb[2].toFixed(4)}, 0.85);`,
    )
    lines.push('} else {')
    lines.push('  color = vec4(0.0, 0.0, 0.0, 0.0);')
    lines.push('}')
  } else {
    let first = true
    for (const val of validValues) {
      const c = valueColors[val]
      if (!c) continue
      const kw = first ? 'if' : '} else if'
      lines.push(`${kw} (byteVal == ${val}.0) {`)
      lines.push(
        `  color = vec4(${c[0].toFixed(4)}, ${c[1].toFixed(4)}, ${c[2].toFixed(4)}, 0.85);`,
      )
      first = false
    }
    lines.push('} else {')
    lines.push('  color = vec4(0.0, 0.0, 0.0, 0.0);')
    lines.push('}')
  }

  return lines.join('\n')
}

// Pre-build a colormap module per asset, plus a catch-all fallback
const colormapModules: Record<
  string,
  { module: { name: string; inject: Record<string, string> } }
> = {}
for (const [asset, keys] of Object.entries(assetLegendKeys)) {
  colormapModules[asset] = {
    module: {
      name: `colormap-${asset}`,
      inject: { 'fs:DECKGL_FILTER_COLOR': buildColormap(keys) },
    },
  }
}
const fallbackColormapModule = {
  module: {
    name: 'colormap-fallback',
    inject: { 'fs:DECKGL_FILTER_COLOR': buildColormap(null) },
  },
}

/**
 * Subclass COGLayer to append a colormap to the default render pipeline.
 * Pass `colormapAsset` prop to select the correct per-asset colormap.
 */
class ColorMappedCOGLayer extends COGLayer {
  static layerName = 'ColorMappedCOGLayer'

  async _parseGeoTIFF() {
    try {
      await super._parseGeoTIFF()
    } catch (err) {
      const onCogError = (this.props as any).onCogError as
        | ((msg: string) => void)
        | undefined
      const msg = err instanceof Error ? err.message : String(err)
      console.warn('[ColorMappedCOGLayer] _parseGeoTIFF failed:', msg)
      onCogError?.(msg)
      return
    }

    // Inject colormap shader module into the render pipeline
    const originalRenderTile = this.state.defaultRenderTile
    if (originalRenderTile) {
      const asset = (this.props as any).colormapAsset as string | undefined
      const colormapMod =
        (asset && colormapModules[asset]) ?? fallbackColormapModule
      this.setState({
        defaultRenderTile: (data: any) => {
          const result = originalRenderTile(data)
          if (result.renderPipeline) {
            result.renderPipeline.push(colormapMod)
          }
          return result
        },
      })
    }
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
    return [makePolygon(-180, -179.17), makePolygon(179.2, 180)]
  }
  return [makePolygon(minX, maxX)]
}

function s3UrlToHttps(s3Url: string): string {
  let httpsUrl = s3Url
  if (s3Url.startsWith('s3://')) {
    const s3UrlWithoutPrefix = s3Url.replace('s3://', '')
    const [bucket, ...pathParts] = s3UrlWithoutPrefix.split('/')
    const path = pathParts.join('/')
    httpsUrl = `https://${bucket}.s3.amazonaws.com/${path}`
  }
  return httpsUrl
}

export const DatasetRunMap = ({
  dataType,
  dataUrl,
  dataPmtilesUrl,
}: {
  dataType: Exclude<DatasetRunListItem['dataType'], null>
  dataUrl: Exclude<DatasetRunListItem['dataUrl'], null>
  dataPmtilesUrl: DatasetRunListItem['dataPmtilesUrl']
}) => {
  const [viewState, setViewState] = useState<MapViewState | undefined>(
    undefined,
  )
  const [assets, setAssets] = useState<string[] | undefined>(undefined)
  const [selectedAsset, setSelectedAsset] = useState<string | undefined>(
    undefined,
  )
  const deckRef = useRef<any | null>(null)
  const [cogError, setCogError] = useState<string | null>(null)

  if (dataType !== 'stac-geoparquet' && dataType !== 'geoparquet') {
    throw new Error(`Unsupported dataType: ${dataType}`)
  }

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
      const sourceLayer = metadata?.vector_layers?.[0]?.id ?? 'data'
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
      const arrayBuffer = await resp.arrayBuffer()
      const wasmTable = readParquet(new Uint8Array(arrayBuffer))
      return tableFromIPC(wasmTable.intoIPCStream())
    },
    enabled: dataType === 'stac-geoparquet' && !!dataUrl,
  })

  const cogUrls = useMemo<string[]>(() => {
    if (!parquetArrowTable || dataType !== 'stac-geoparquet') return []

    const assetsVector = parquetArrowTable.getChild('assets')
    if (!assetsVector) {
      console.warn('[DatasetRunMap] No "assets" column found.')
      return []
    }

    const assetFields: any[] = assetsVector.type?.children ?? []
    const keysToTry: string[] = assetFields.map((f) => f.name)
    setAssets(keysToTry)

    const preferredKeys = ['seagrass', 'classification', 'mangrove'] // The order of these is important.
    const sortedKeys = [
      ...keysToTry.filter((k) => preferredKeys.includes(k)),
      ...keysToTry.filter((k) => !preferredKeys.includes(k)),
    ]

    for (const assetKey of sortedKeys) {
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
        setSelectedAsset(assetKey)
        return urls
      }
    }

    console.error(
      '[DatasetRunMap] No href found in any asset. Available:',
      keysToTry,
    )
    return []
  }, [parquetArrowTable, dataType])

  // Map bounds

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

    if (parquetArrowTable) {
      const bboxesVector = parquetArrowTable.getChild('bbox')
      if (bboxesVector && bboxesVector.length > 0) {
        let minX = Infinity,
          minY = Infinity,
          maxX = -Infinity,
          maxY = -Infinity
        for (let i = 0; i < bboxesVector.length; i++) {
          const bboxVal = bboxesVector.get(i)
          if (!bboxVal) continue
          const arr = bboxVal.toArray()
          if (arr.length !== 4) continue
          const [x0, y0, x1, y1] = arr
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
    }

    return undefined
  }, [
    isLoadingPmtilesHeader,
    isLoadingParquetArrowTable,
    pmtilesHeader,
    parquetArrowTable,
  ])

  const mapContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!mapBounds) return
    const el = mapContainerRef.current
    const width = el?.clientWidth ?? 800
    const height = el?.clientHeight ?? 384
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

  // COG layers (deck.gl)

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
      const bbox = (bboxVal?.toArray() as [number, number, number, number]) ?? [
        0, 0, 0, 0,
      ]
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
        getLineColor: datasetColor,
        getLineWidth: 1,
        lineWidthMinPixels: 1,
      }),
    )

    if (zoom >= cogMinZoom) {
      if (mosaicSources.length === 1 && mosaicSources[0]) {
        // Single COG — render without MosaicLayer
        layerList.push(
          new ColorMappedCOGLayer({
            id: `cog-single`,
            geotiff: mosaicSources[0].url,
            colormapAsset: selectedAsset,
            onCogError: setCogError,
          } as any),
        )
      } else {
        layerList.push(
          new MosaicLayer({
            id: 'mosaic-layer',
            sources: mosaicSources,
            minZoom: cogMinZoom,
            renderSource: (source, { signal }) =>
              new ColorMappedCOGLayer({
                id: `cog-${source.url}`,
                geotiff: source.url,
                signal,
                colormapAsset: selectedAsset,
                onCogError: setCogError,
              } as any),
          }),
        )
      }
    }

    return layerList
  }, [dataType, zoom, mosaicSources, cogMinZoom, selectedAsset])

  // Render

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

  const loadingLabel =
    dataType === 'stac-geoparquet' ? 'STAC-GeoParquet' : 'PMTiles'

  return (
    <div className="max-w-full flex flex-col mb-4">
      <div
        ref={mapContainerRef}
        className="rounded-lg overflow-hidden h-96 relative"
      >
        <DeckGL
          ref={deckRef}
          viewState={viewState}
          onViewStateChange={({ viewState }) =>
            setViewState(viewState as MapViewState)
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
                  source-layer={pmtilesHeader.sourceLayer} // "data" for ACE Reef Extent, "building_footprints" for VIDA Buildings.
                  paint={{
                    'fill-color': `rgb(${datasetColor[0]}, ${datasetColor[1]}, ${datasetColor[2]})`,
                    'fill-opacity': 0.8,
                    'fill-antialias': false, // Need this to prevent seams between tiles
                  }}
                />
              </>
            )}
          </Map>
        </DeckGL>

        {isLoading && (
          <div className="absolute top-2 left-2 bg-white p-2 rounded shadow">
            <span className="text-sm">Loading {loadingLabel}…</span>
          </div>
        )}
        {dataType === 'stac-geoparquet' && mosaicSources.length > 0 && (
          <div className="absolute top-2 left-2 bg-white p-2 rounded shadow">
            <span className="text-sm">
              Showing mosaic of {mosaicSources.length} COG
              {mosaicSources.length !== 1 ? 's' : ''}.
              {zoom < cogMinZoom && ` Zoom in to blue boxes to see data.`}
            </span>
          </div>
        )}
        {dataType === 'stac-geoparquet' &&
          !isLoadingParquetArrowTable &&
          mosaicSources.length === 0 && (
            <div className="absolute top-2 left-2 bg-yellow-100 p-2 rounded shadow text-sm">
              No COG URLs found — check console for available columns.
            </div>
          )}
        {!isLoading && selectedAsset && (
          <div className="absolute bottom-2 left-2 bg-white/90 px-3 py-2 rounded shadow text-xs space-y-1">
            {(assetLegendKeys[selectedAsset]
              ? assetLegendKeys[selectedAsset]
                  .map((key) => {
                    const entry = valueLegend[key]!
                    // For value 1 ("Data"), use the asset name instead of the generic label
                    return key === 1
                      ? { ...entry, label: selectedAsset }
                      : entry
                  })
                  .filter(Boolean)
              : [
                  {
                    label: selectedAsset,
                    color: [
                      datasetColor[0],
                      datasetColor[1],
                      datasetColor[2],
                    ] as [number, number, number],
                  },
                ]
            ).map((entry) => (
              <div key={entry.label} className="flex items-center gap-2">
                <span
                  className="inline-block w-3 h-3 rounded-sm"
                  style={{ backgroundColor: `rgb(${entry.color.join(',')})` }}
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
      <div>
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
