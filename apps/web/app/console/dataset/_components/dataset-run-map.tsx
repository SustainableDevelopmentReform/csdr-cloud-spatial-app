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

import { COGLayer, MosaicLayer, proj } from '@developmentseed/deck.gl-geotiff'
import { GeoKeys, toProj4 } from 'geotiff-geokeys-to-proj4'
import { DatasetRunListItem } from '../_hooks'

const protocol = new Protocol()
maplibregl.addProtocol('pmtiles', protocol.tile)

type colorArray = [number, number, number, number]
const outlineColor: colorArray = [30, 119, 179, 255]

// TODO: Fix this to make rasters blue, and not blocky.
// This makes data blue, but blocky.
// const DataColorize: RasterModule = {
//   module: {
//     name: 'dataColorize',
//     inject: {
//       'fs:DECKGL_FILTER_COLOR': `
//         float val = color.r;
//         bool isValid = val > 0.001 && val < 0.99;
//         color = vec4(${outlineColorGLSL[0]}, ${outlineColorGLSL[1]}, ${outlineColorGLSL[2]}, isValid ? 0.85 : 0.0);
//       `,
//     },
//   },
// }

async function geoKeysParser(
  geoKeys: Record<string, any>,
): Promise<proj.ProjectionInfo> {
  const projDefinition = toProj4(geoKeys as GeoKeys)
  return {
    def: projDefinition.proj4,
    parsed: proj.parseCrs(projDefinition.proj4),
    coordinatesUnits: projDefinition.coordinatesUnits as proj.SupportedCrsUnit,
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
  if (s3Url.startsWith('s3://')) {
    const s3UrlWithoutPrefix = s3Url.replace('s3://', '')
    const [bucket, ...pathParts] = s3UrlWithoutPrefix.split('/')
    const path = pathParts.join('/')
    return `https://${bucket}.s3.amazonaws.com/${path}`
  }
  return s3Url
}

export const DatasetRunMap = ({
  dataType,
  dataUrl,
  pmTilesUrl,
}: {
  dataType: Exclude<DatasetRunListItem['dataType'], null>
  dataUrl: Exclude<DatasetRunListItem['dataUrl'], null>
  // TODO: Add pmTilesUrl to DatasetRunListItem.
  pmTilesUrl: Exclude<DatasetRunListItem['pmTilesUrl'], null>
}) => {
  const [viewState, setViewState] = useState<MapViewState | undefined>(
    undefined,
  )
  const [assets, setAssets] = useState<string[] | undefined>(undefined)
  const [selectedAsset, setSelectedAsset] = useState<string | undefined>(
    undefined,
  )
  const deckRef = useRef<any | null>(null)

  if (dataType !== 'stac-geoparquet' && dataType !== 'geoparquet') {
    throw new Error(`Unsupported dataType: ${dataType}`)
  }

  const renderPMTiles = dataType === 'geoparquet' && !!pmTilesUrl
  const pmTilesHttpsUrl = renderPMTiles
    ? pmTilesUrl.includes('s3://')
      ? s3UrlToHttps(pmTilesUrl)
      : pmTilesUrl
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

    const assetFields = assetsVector.type?.children ?? []
    const keysToTry = assetFields.map((f) => f.name)
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

    console.warn(
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

  useEffect(() => {
    if (!mapBounds) return
    // TODO: This width and height are not true. They are dynamic. TODO: Fix this.
    const viewport = new WebMercatorViewport({ width: 800, height: 384 })
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
        getLineColor: outlineColor,
        getLineWidth: 1,
        lineWidthMinPixels: 1,
      }),
    )

    if (zoom >= cogMinZoom) {
      layerList.push(
        new MosaicLayer({
          id: 'mosaic-layer',
          sources: mosaicSources,
          minZoom: cogMinZoom,
          renderSource: (source, { signal }) =>
            new COGLayer({
              id: `cog-${source.url}`,
              geotiff: source.url,
              geoKeysParser,
              signal,
            }),
        }),
      )
    }

    return layerList
  }, [dataType, zoom, mosaicSources, cogMinZoom])

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
      <div className="rounded-lg overflow-hidden h-96 relative">
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
                    'fill-color': `rgb(${outlineColor[0]}, ${outlineColor[1]}, ${outlineColor[2]})`,
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
      </div>
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
