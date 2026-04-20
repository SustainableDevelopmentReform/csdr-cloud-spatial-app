// Try to load all COGs for a dataset e.g. GMW. Don't show the grid if possible. See if Deck handles 1000s of small COGs. If this doesn't work then we can show the grid at lower zoom levels, and just load the COGs when zoomed in more.
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Map } from '@vis.gl/react-maplibre'
import DeckGL from '@deck.gl/react'
import {
  MapViewState,
  LayersList,
  PickingInfo,
  WebMercatorViewport,
  CompositeLayer,
} from '@deck.gl/core'
import { TileLayer } from '@deck.gl/geo-layers'
import { GeoJsonLayer } from '@deck.gl/layers'
import { MVTLoader } from '@loaders.gl/mvt'
import { load } from '@loaders.gl/core'
import initParquetWasm, { readParquet } from 'parquet-wasm'
import { Table, tableFromIPC } from 'apache-arrow'
import { PMTiles, Header as PMTilesHeader } from 'pmtiles'
import { useQuery } from '@tanstack/react-query'

import {
  COGLayer,
  MosaicLayer,
  // MultiCOGLayer,
  proj,
} from '@developmentseed/deck.gl-geotiff'
import { RasterModule } from '@developmentseed/deck.gl-raster'
import { GeoKeys, toProj4 } from 'geotiff-geokeys-to-proj4'
import { DatasetRunListItem } from '../_hooks'

import * as pmtiles from 'pmtiles'

type colorArray = [number, number, number, number]
const fillColor: colorArray = [0, 0, 0, 0]
const outlineColor: colorArray = [30, 119, 179, 255]
const outlineColorGLSL = outlineColor
  .slice(0, 3)
  .map((v) => (v / 255).toFixed(3))
const outlineWidth = 2
const highlightFillColor: colorArray = [0, 255, 255, 128]

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

class PMTilesLayer extends CompositeLayer {
  constructor(props) {
    super(props)
    this.pmtiles = new pmtiles.PMTiles(props.data)
  }

  renderLayers() {
    return new TileLayer({
      showTileBorders: false,
      id: `${this.props.id}-tiles`,
      getTileData: async (tile) => {
        const { x, y, z } = tile.index
        try {
          const response = await this.pmtiles.getZxy(z, x, y)
          if (response && response.data) {
            const geojson = await load(response.data, MVTLoader, {
              mvt: {
                coordinates: 'wgs84',
                tileIndex: { x, y, z },
                shape: 'geojson',
              },
            })
            // TODO: geojson shows tile edges.
            return geojson
          }
          return null
        } catch (error) {
          console.error(`Error loading tile ${z}/${x}/${y}:`, error)
          return null
        }
      },
      renderSubLayers: (props) => {
        return new GeoJsonLayer(props, {
          data: props.data,
          pickable: this.props.pickable,
          autoHighlight: this.props.autoHighlight,
          highlightColor: this.props.highlightColor,
          onClick: this.props.onClick,
          onHover: this.props.onHover,
          stroked: true,
          filled: true,
          getFillColor: this.props.getFillColor || fillColor,
          getLineColor: this.props.getLineColor || outlineColor,
          getLineWidth: this.props.getLineWidth || outlineWidth,
          lineWidthMinPixels: 1,
        })
      },
      minZoom: 0,
      maxZoom: 14,
      tileSize: 512,
    })
  }
}

PMTilesLayer.layerName = 'PMTilesLayer'
PMTilesLayer.defaultProps = {
  showTileBorders: false, // This doesn't work but does exist on TileSourceLayerProps https://github.com/visgl/loaders.gl/blob/35205e786cbbcf4bd91b74abe210f6c8e378b4cf/examples/website/tiles/components/tile-source-layer.ts#L81
  data: undefined,
  getFillColor: fillColor,
  getLineColor: outlineColor,
  getLineWidth: outlineWidth,
  pickable: false,
  autoHighlight: false, // Highlighting is also not working.
  highlightColor: highlightFillColor,
}

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
}: {
  dataType: Exclude<DatasetRunListItem['dataType'], null>
  dataUrl: Exclude<DatasetRunListItem['dataUrl'], null>
}) => {
  const [viewState, setViewState] = useState<MapViewState | undefined>(
    undefined,
  )
  const [assets, setAssets] = useState<string[] | undefined>(undefined)
  const [selectedAsset, setSelectedAsset] = useState<string | undefined>(
    undefined,
  )
  const deckRef = useRef<any | null>(null)

  console.log(dataType, dataUrl)

  // if (dataType == 'stac-geoparquet') {
  //   console.log('Data is STAC-Geoparquet. Load parquet arrow table.')
  // } else if (dataType == 'geoparquet') {
  //   console.log('Data is Geoparquet. Load PMTiles.')
  // } else {
  //   throw new Error(`Unsupported dataType: ${dataType}`) // TODO: Handle this better.
  // }

  // PMTiles is only relevant for geoparquet
  let datasetRunPMTilesUrl =
    'https://data.source.coop/vida/google-microsoft-open-buildings/pmtiles/go_ms_building_footprints.pmtiles'
  datasetRunPMTilesUrl = s3UrlToHttps(datasetRunPMTilesUrl)
  const renderPMTiles = dataType === 'geoparquet' && !!datasetRunPMTilesUrl

  const {
    data: pmtilesHeader,
    isLoading: isLoadingPmtilesHeader,
    error: pmtilesHeaderError,
  } = useQuery<PMTilesHeader | null>({
    queryKey: ['pmtiles-header', datasetRunPMTilesUrl],
    queryFn: async () => {
      if (!datasetRunPMTilesUrl) return null
      const p = new PMTiles(datasetRunPMTilesUrl)
      return p.getHeader()
    },
    enabled: renderPMTiles,
  })

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

    // Log available asset keys to help pick the right one
    const assetFields = assetsVector.type?.children ?? []

    const keysToTry = assetFields.map((f) => f.name)
    console.log(keysToTry)
    setAssets(keysToTry)

    // Prefer these keys if available
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
        console.log(
          `[DatasetRunMap] Using ${urls.length} COG URLs from assets.${assetKey}.href`,
        )
        setSelectedAsset(assetKey)
        return urls
      }
    }

    console.warn(
      '[DatasetRunMap] No href found in any asset. Asset keys available:',
      keysToTry,
    )
    return []
  }, [parquetArrowTable, dataType])

  // Map bounds
  // Derived from PMTiles header or parquet bbox column. No longer uses COG load callbacks.

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
    const viewport = new WebMercatorViewport({ width: 800, height: 384 })
    const [[minLon, minLat, maxLon, maxLat]] = [mapBounds]
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

  // Layers

  const [selectedYear, setSelectedYear] = useState<number | null>(null)

  const { availableYears, mosaicSources } = useMemo(() => {
    if (!parquetArrowTable || cogUrls.length === 0) {
      return { availableYears: [], mosaicSources: [] }
    }

    const bboxVector = parquetArrowTable.getChild('bbox')
    const datetimeVector =
      parquetArrowTable.getChild('datetime') ??
      parquetArrowTable.getChild('start_datetime')

    // Build rows with url, bbox, year
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

  const zoom = viewState && viewState.zoom ? viewState.zoom : 0
  // Scale cogMinZoom by number of COGs: 0 at 0, up to 9 at 1000+
  const cogMinZoom = Math.min(9, Math.round((mosaicSources.length / 1000) * 9))

  const layers = useMemo<LayersList>(() => {
    const layerList: LayersList = []

    // stac-geoparquet: render all COGs as a mosaic
    if (dataType === 'stac-geoparquet' && mosaicSources.length > 0) {
      // Bbox outlines
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
    }

    if (
      dataType === 'stac-geoparquet' &&
      mosaicSources.length > 0 &&
      zoom >= cogMinZoom
    ) {
      // COG mosaic
      layerList.push(
        new MosaicLayer({
          id: 'mosaic-layer',
          sources: mosaicSources,
          minZoom: cogMinZoom,
          renderSource: (source, { signal }) =>
            // Can also use MultiCOGLayer here.
            new COGLayer({
              id: `cog-${source.url}`,
              geotiff: source.url,
              geoKeysParser,
              signal,
            }),
        }),
      )
    }

    // TODO: Develop this further. Test with all vector datasets. (ACA Reef).
    // geoparquet: render PMTiles
    if (renderPMTiles) {
      layerList.push(
        new PMTilesLayer({
          id: 'dataset',
          data: datasetRunPMTilesUrl,
          showTileBorders: false,
          pickable: true,
          autoHighlight: true,
          highlightColor: highlightFillColor,
          onClick: (info: any) => {
            console.log('Clicked feature:', info.object)
          },
          getFillColor: fillColor,
          getLineColor: outlineColor,
          getLineWidth: outlineWidth,
        }),
      )
    }

    return layerList
  }, [dataType, renderPMTiles, datasetRunPMTilesUrl, zoom, mosaicSources])

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

  console.log(dataType, assets)
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
          initialViewState={{ longitude: 0.45, latitude: 51.47, zoom: 11 }}
        >
          <Map
            style={{ width: '100%', height: '100%' }}
            mapStyle="https://api.protomaps.com/styles/v5/white/en.json?key=51cf1275231eb004"
          />
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
                // disabled
                // onClick={() => setSelectedYear(year)}
                // className={`px-2 py-1 rounded ${
                //   (selectedYear ?? availableYears.at(-1)) === year
                //     ? 'bg-blue-600 text-white'
                //     : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                // }`}
                className={`${
                  (selectedYear ?? availableYears.at(-1)) === year
                    ? 'font-semibold'
                    : 'text-gray-500'
                }`}
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
