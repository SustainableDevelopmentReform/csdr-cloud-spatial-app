import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Map, MapRef } from '@vis.gl/react-maplibre'
import DeckGL from '@deck.gl/react'
import {
  MapViewState,
  LayersList,
  PickingInfo,
  WebMercatorViewport,
} from '@deck.gl/core'
import {
  GeoArrowScatterplotLayer,
  GeoArrowPolygonLayer,
} from '@geoarrow/deck.gl-layers'
import initParquetWasm, { readParquet } from 'parquet-wasm'
import { Table, tableFromIPC } from 'apache-arrow'
import { PMTiles, Header as PMTilesHeader } from 'pmtiles'
import { useQuery } from '@tanstack/react-query'

import { COGLayer, proj } from '@developmentseed/deck.gl-geotiff'
import { GeoKeys, toProj4 } from 'geotiff-geokeys-to-proj4'
import { DatasetRunListItem } from '../_hooks'
import { MapViewer } from '../../geometries/_components/map-viewer' // TODO: If this is generalised for datasets, move it out of geometries folder.
import { TileSourceLayer } from '@deck.gl-community/geo-layers'
import { PMTilesSource } from '@loaders.gl/pmtiles'

type colorArray = [number, number, number, number]
const fillColor: colorArray = [0, 0, 0, 0] // Transparent.
// const outlineColor: colorArray = getComputedStyle(document.documentElement).getPropertyValue('--dataset'); // This seems hacky so don't use it.
const outlineColor: colorArray = [30, 119, 179, 255] // This color is also defined in CSS as --dataset

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

interface Feature {
  [key: string]: any
}

export const DatasetRunMap = ({
  dataType,
  dataUrl,
}: {
  dataType: Exclude<DatasetRunListItem['dataType'], null>
  dataUrl: Exclude<DatasetRunListItem['dataUrl'], null>
  // datasetRunPMTilesUrl: Exclude<DatasetRunListItem['dataPmtilesUrl'], null> // TODO: This doesn't exist yet.
}) => {
  const mapRef = useRef<MapRef | null>(null)
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null)
  const handleSetSelectedFeature = useCallback((feature: Feature | null) => {
    setSelectedFeature(feature)
  }, [])
  const [cogBounds, setCogBounds] = useState<
    [number, number, number, number] | null
  >(null)

  const [viewState, setViewState] = useState<MapViewState | undefined>(
    undefined,
  )
  const deckRef = useRef<any | null>(null)

  const getTooltip = useCallback(({ object }: PickingInfo<Feature>) => {
    // console.log('Tooltip object:', object);
    return (
      object && {
        html: `<h2 style="color: '#000'">Message:</h2> <div>Test</div>`,
        style: {
          backgroundColor: '#fff',
          fontSize: '0.8em',
          padding: '16px',
          borderRadius: '8px',
        },
      }
    )
  }, [])

  // Just for developing:
  let datasetRunPMTilesUrl =
    's3://csdr-public-dev/geometries/aus-states/0-0-1/runs/51cfaf9e-0518-5b0b-b6a3-b63bef9f381b/STE_2021_AUST_GDA2020.pmtiles'
  dataType = 'geoparquet' as Exclude<DatasetRunListItem['dataType'], null>

  // Test files:
  // Must use the "_native" version where the geometry column is GeoArrow:
  // const GEOPARQUET_URL_POINTS =
  //   'https://raw.githubusercontent.com/geoarrow/geoarrow-data/v0.2.0/natural-earth/files/natural-earth_cities_native.parquet'
  // const GEOPARQUET_URL_POLYGONS =
  //   'https://raw.githubusercontent.com/geoarrow/geoarrow-data/v0.2.0/natural-earth/files/natural-earth_countries_native.parquet'

  // For testing STAC-Geoparquet polygons:
  // const stac_parquet_arrow_s3 = 'https://csdr-public-dev.s3.ap-southeast-2.amazonaws.com/viz-test/gmw-geoarrow.parquet'
  // const stac_parquet_arrow_s3 =
  //   'https://csdr-public-dev.s3.ap-southeast-2.amazonaws.com/viz-test/gmw.parquet'

  // These are all being written with arrow by the pipeline now and all work here :)
  const gmw_v4_written_by_pipeline_s3 =
    'https://csdr-public-dev.s3.ap-southeast-2.amazonaws.com/datasets/gmw-v4/0-0-1/gmw.parquet'
  const seagrass_written_by_pipeline_s3 =
    'https://csdr-public-dev.s3.ap-southeast-2.amazonaws.com/datasets/seagrass/0-0-1/dep_s2_seagrass.parquet'
  const ace_written_by_pipeline_s3 =
    'https://csdr-public-dev.s3.ap-southeast-2.amazonaws.com/datasets/ace/0-0-1/ace.parquet'
  // dataUrl = gmw_v4_written_by_pipeline_s3 as Exclude<
  //   DatasetRunListItem['dataUrl'],
  //   null
  // >
  // Just for dev. Dataurl will come from props.
  // dataType = 'stac-geoparquet' as Exclude<DatasetRunListItem['dataType'], null> // Just for dev. dataType will come from props.

  // Reef. 500MB - breaks browser.
  // dataUrl = "https://csdr-public-dev.s3.ap-southeast-2.amazonaws.com/viz-test/reefextent.parquet" as Exclude<DatasetRunListItem['dataUrl'], null>
  // dataType = 'geoparquet' as Exclude<DatasetRunListItem['dataType'], null>

  // Buildings. Massive PMTiles file on Source Coop.
  // datasetRunPMTilesUrl =
  //   'https://data.source.coop/vida/google-microsoft-open-buildings/pmtiles/go_ms_building_footprints.pmtiles' as Exclude<
  //     DatasetRunListItem['dataUrl'],
  //     null
  //   >
  // dataType = 'geoparquet' as Exclude<DatasetRunListItem['dataType'], null>
  // Could use this to display PMTiles https://github.com/visgl/deck.gl/issues/8615#issuecomment-1992673335

  // For testing parquet points:
  // const GEOPARQUET_URL_POINTS_S3 = 'https://csdr-public-dev.s3.ap-southeast-2.amazonaws.com/viz-test/natural-earth_cities_native.parquet'
  // dataUrl = GEOPARQUET_URL_POINTS_S3 // Just for dev. Dataurl should come from props.
  // dataType = 'geoparquet' // Just for dev. dataType should come from props.

  // // Datasets:
  // STAC-Geoparquet datasets:
  // - gmw: ['assets.mangrove.href']. Has id column.
  // - ACE: Has many possible COG links. ['assets.classification.href']. Has id column. Data overlaps for the 2 years. Need to allow the user to select overlapping data.
  // - seagrass: Has many possible COG links including ['assets.seagrass.href']. Has id column.
  // Parquet datasets:
  // - reef: No id or name.
  // - buildings: we only index the bboxes of the sa2 building parquets. Maybe the user can click a bbox and load/vizualise that data from Source Coop? Has s2_code id column.

  if (dataType == 'stac-geoparquet') {
    console.log('Data is STAC-Geoparquet. Load parquet arrow table.')
  } else if (dataType == 'geoparquet') {
    console.log('Data is Geoparquet. Load PMTiles.')
  } else {
    throw new Error(`Unsupported dataType: ${dataType}`) // TODO: Handle this better.
  }

  function s3UrlToHttps(s3Url: string): string {
    if (s3Url.startsWith('s3://')) {
      // Convert s3://bucket-name/path/to/file to https://bucket-name.s3.amazonaws.com/path/to/file
      const s3UrlWithoutPrefix = s3Url.replace('s3://', '')
      const [bucket, ...pathParts] = s3UrlWithoutPrefix.split('/')
      const path = pathParts.join('/')
      return `https://${bucket}.s3.amazonaws.com/${path}`
    }
    return s3Url
  }

  datasetRunPMTilesUrl = s3UrlToHttps(datasetRunPMTilesUrl)

  const {
    data: pmtilesHeader,
    isLoading: isLoadingPmtilesHeader,
    error: pmtilesHeaderError,
  } = useQuery<PMTilesHeader | null>({
    queryKey: ['pmtiles-header', datasetRunPMTilesUrl],
    queryFn: async () => {
      let pmtilesUrl = datasetRunPMTilesUrl

      if (!pmtilesUrl) return null

      const p = new PMTiles(pmtilesUrl)
      return p.getHeader()
    },
    enabled: dataType === 'geoparquet' && !!datasetRunPMTilesUrl,
  })

  const {
    data: parquetArrowTable,
    isLoading: isLoadingParquetArrowTable,
    error: parquetArrowTableError,
  } = useQuery<Table | null>({
    queryKey: ['parquet-arrow-table', dataUrl],
    queryFn: async () => {
      let parquetArrowUrl = dataUrl

      if (!parquetArrowUrl) return null

      parquetArrowUrl = s3UrlToHttps(parquetArrowUrl)

      await initParquetWasm()
      const resp = await fetch(parquetArrowUrl)
      const arrayBuffer = await resp.arrayBuffer()
      const wasmTable = readParquet(new Uint8Array(arrayBuffer))
      const parquetArrowTable = tableFromIPC(wasmTable.intoIPCStream())
      return parquetArrowTable
    },
    enabled: dataType === 'stac-geoparquet' && !!dataUrl,
  })

  // Use useMemo to compute map bounds based on loaded data.
  const mapBounds = useMemo(() => {
    if (cogBounds) return cogBounds
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
      // Try to read bbox from metadata
      const meta = parquetArrowTable.schema?.metadata
      // Once we update the pipeline, the parquet metadata will include the overall bbox for the dataset, so we can just use that instead of computing it from all the row bboxes. For now, we compute it from the row bboxes.
      // if (meta.get('bbox')) return JSON.parse(meta.get('bbox')) as [number, number, number, number];
      console.log(parquetArrowTable.schema.fields)
      // Compute overall bbox from all row bboxes
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
      // fallback: just use the first row's bbox if available
      if (bboxesVector && bboxesVector.length > 0) {
        const arr = bboxesVector.get(0)?.toArray()
        if (arr && arr.length === 4) {
          return arr as [number, number, number, number]
        }
      }
    }
    return undefined // Fallback that shouldn't occur.
  }, [
    cogBounds,
    isLoadingPmtilesHeader,
    isLoadingParquetArrowTable,
    pmtilesHeader,
    parquetArrowTable,
  ])

  // TODO: Refactor this useEffect because we want to avoid useEffects.
  useEffect(() => {
    // Compute DeckGL viewState from mapBounds
    if (mapBounds) {
      const viewport = new WebMercatorViewport({
        // TODO: Make these dynamic based on the actual size of the map container. For now we just hardcode them to match the size of the Map component in the JSX below.
        width: 800, // match your container width
        height: 384, // match your container height (h-96 = 24*16)
      })
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
    }
  }, [mapBounds])

  // Callback when the pointer clicks on an object in any pickable layer
  // TODO: Can we just use handleSetSelectedFeature directly as the onClick handler? Do we need to do anything special to handle multiple layers or different feature schemas?
  const onFeatureClick = useCallback(
    (info: PickingInfo, event: any) => {
      console.log('onFeatureClick called with info:', info)
      if (!info.object) {
        handleSetSelectedFeature(null)
        return
      } else {
        const feature = info.object.toJSON()
        handleSetSelectedFeature(feature)
      }
      // console.log('Clicked:', info, event);
      // // const clickedFeatures = deckRef.current.pickMultipleObjects(info.x, info.y, 0, [datasetLayerId])
      // const clickedFeatures = deckRef.current.pickMultipleObjects({
      //   x: info.x,
      //   y: info.y,
      //   radius: 0,
      //   layerIds: [datasetLayerId]
      // });
      // const items = clickedFeatures.map((cf) => cf.object.toJSON());
      // let tableRows = '';
      // items.forEach((item, idx) => {
      //   Object.entries(item).forEach(([key, value]) => {
      //     tableRows += `<tr><td>${key}</td><td>${String(value)}</td></tr>`;
      //   });
      //   if (idx < items.length - 1) {
      //     tableRows += `<tr><td colspan='2'><hr/></td></tr>`;
      //   }
      // });
      // return {
      //   html: `
      //     <h2 style="color: #000">Selected Features</h2>
      //     <table style="font-size:0.8em; background:#fff; border-radius:8px; padding:8px;">
      //       <thead><tr><th>Key</th><th>Value</th></tr></thead>
      //       <tbody>${tableRows}</tbody>
      //     </table>
      //   `,
      //   style: {
      //     backgroundColor: '#fff',
      //     fontSize: '0.8em',
      //     padding: '16px',
      //     borderRadius: '8px',
      //   }
      // }
    },
    [handleSetSelectedFeature],
  )

  const layers = useMemo<LayersList>(() => {
    const layerList: LayersList = []

    if (parquetArrowTable) {
      const datasetLayerId = 'dataset'
      const geometryVector =
        parquetArrowTable?.getChild('geometry') ||
        parquetArrowTable?.getChild('proj:geometry')
      const sharedProps = {
        id: datasetLayerId,
        data: parquetArrowTable,
        getFillColor: fillColor,
        getLineColor: outlineColor,
        lineWidthUnits: 'pixels' as any,
        lineWidthMinPixels: 1,
        pickable: true,
        pickMultipleObjects: true,
        onClick: onFeatureClick,
      }
      if (geometryVector?.type?.typeId === 13) {
        // Point layer
        layerList.push(
          new GeoArrowScatterplotLayer({
            ...sharedProps,
            getPosition: geometryVector,
            stroked: true,
            getLineWidth: (d: Feature) => {
              const featureId = parquetArrowTable
                ?.getChild('name')
                ?.get(d.index)
              const selectedFeatureId = selectedFeature?.['name']
              if (featureId == selectedFeatureId) return 3
              return 1
            },
            radiusUnits: 'pixels',
            getRadius: (d: Feature) => {
              const featureId = parquetArrowTable
                ?.getChild('name')
                ?.get(d.index)
              const selectedFeatureId = selectedFeature?.['name']
              if (featureId == selectedFeatureId) return 10
              return 15
            },
          }),
        )
      } else if (geometryVector?.type?.typeId === 12) {
        // Polygon layer
        layerList.push(
          new GeoArrowPolygonLayer({
            ...sharedProps,
            getPolygon: geometryVector,
            getLineWidth: (d: Feature) => {
              const featureId = parquetArrowTable?.getChild('id')?.get(d.index)
              const selectedFeatureId = selectedFeature?.['id']
              if (featureId == selectedFeatureId) return 5
              return 1
            },
          }),
        )
      } else {
        throw new Error('Unknown geometry type in GeoParquet')
      }
    }

    // console.log('Need to render PMTiles', !!pmtilesHeader)
    // This PMTileLayer works but it renders the tile boundaries on the map.
    // TODO: Style the PMTiles layer. Not possible with TileSourceLayer. Can do it with https://github.com/Matico-Platform/deck.gl-pmtiles.
    layerList.push(
      new TileSourceLayer({
        tileSource: PMTilesSource.createDataSource(datasetRunPMTilesUrl, {}),
        pickable: true,
        onClick: onFeatureClick,
        showTileBorders: false, // This is important to avoid showing tile boundaries!
        // TODO: Style TileSourceLayer color,
        // getFillColor: fillColor,
        // getLineColor: outlineColor,
      }),
    )

    console.log('Selected feature:', selectedFeature)
    // Add COG layer if selectedFeature is set
    if (selectedFeature) {
      const COG_URL =
        'https://csdr-public-dev.s3.ap-southeast-2.amazonaws.com/viz-test/GMW_N00E008_v4019_mng_rgb.tif'
      layerList.push(
        new COGLayer({
          id: 'cog-layer',
          geotiff: COG_URL,
          geoKeysParser,
          onGeoTIFFLoad: (tiff, options) => {
            const { west, south, east, north } = options.geographicBounds
            setCogBounds([west, south, east, north])
          },
        }),
      )
    } else {
      setCogBounds(null)
    }

    return layerList
  }, [parquetArrowTable, pmtilesHeader, selectedFeature, onFeatureClick])

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

  // // For styling the PMTiles layers.
  // const { linePaint, fillPaint } = useMemo(
  //   () => {
  //     if (!selectedFeature) return XYZ
  //     return {
  //       linePaint: {
  //         'line-color': 'black',
  //         'line-width': 2,
  //       },
  //       fillPaint: {
  //         'fill-color': 'black',
  //         'fill-opacity': 0.2,
  //       },
  //     }
  //   },
  //   [
  //     selectedFeature,
  //   ],
  // )

  return (
    <div className="w-[800px] max-w-full gap-8 flex flex-col">
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
          // getTooltip={getTooltip}
          // getTooltip={onFeatureClick}
          // onLoad={handleLoad}
          // onAfterRender={onAfterRender}
          initialViewState={{
            longitude: 0.45,
            latitude: 51.47,
            zoom: 11,
          }}
        >
          {/* <MapViewer */}
          <Map
            style={{ width: '100%', height: '100%' }}
            mapStyle="https://api.protomaps.com/styles/v5/white/en.json?key=51cf1275231eb004"
          />
        </DeckGL>
        {!parquetArrowTable && !pmtilesHeader && (
          <div className="absolute top-14 left-2 bg-white p-2 rounded shadow">
            Loading {dataType}...
          </div>
        )}
        {parquetArrowTable && dataType === 'stac-geoparquet' && (
          <div className="absolute top-2 left-2 bg-white p-2 rounded shadow">
            Click a STAC-Geoparquet Item to view its details and COGs.
          </div>
        )}
        {parquetArrowTable && dataType === 'geoparquet' && (
          <div className="absolute top-2 left-2 bg-white p-2 rounded shadow">
            Click a feature to view its details.
          </div>
        )}
        {selectedFeature && (
          <div className="absolute bottom-2 left-2 bg-white p-2 rounded shadow">
            <button onClick={() => handleSetSelectedFeature(null)}>
              Clear Selection
            </button>
          </div>
        )}
      </div>
      {selectedFeature && (
        <div className="bg-white p-2 rounded-lg shadow">
          <p>
            Selected {dataType === 'stac-geoparquet' ? 'STAC Item' : 'feature'}{' '}
            Details:
          </p>
          <table className="text-xs">
            <thead>
              <tr>
                <th className="text-left pr-2">Key</th>
                <th className="text-left">Value</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(selectedFeature).map(([key, value]) => (
                <tr key={key}>
                  <td className="pr-2 align-top font-mono">{key}</td>
                  <td className="align-top font-mono break-all">
                    {String(value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
