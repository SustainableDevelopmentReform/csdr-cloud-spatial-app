import React, { useEffect, useState } from 'react'
import { Map } from '@vis.gl/react-maplibre'
import DeckGL from '@deck.gl/react'
import {
  GeoArrowScatterplotLayer,
  GeoArrowPolygonLayer,
} from '@geoarrow/deck.gl-layers'
import initParquetWasm, { readParquet } from 'parquet-wasm'
import { tableFromIPC } from 'apache-arrow'
import { COGLayer } from '@developmentseed/deck.gl-geotiff'

// Can't use this one because the geometry column is not GeoArrow:
// const GEOPARQUET_URL = "https://raw.githubusercontent.com/geoarrow/geoarrow-data/v0.2.0/natural-earth/files/natural-earth_cities.parquet";
// This gets CORS error, and is encoding using WKB for geometry column, instead of GeoArrow. Both critical errors that need fixing.
// const GEOPARQUET_URL = 'https://csdr-public-dev.s3.ap-southeast-2.amazonaws.com/datasets/gmw-v4/0-0-1/gmw.parquet'
export const DatasetRunMap = ({
  dataType,
  dataUrl,
}: {
  dataType: string | null // TODO: fix type with datasetRun.dataType
  dataUrl: string | null
}) => {
  const [jsTable, setJsTable] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [layers, setLayers] = useState<any[]>([])
  const [selectedCogLink, setSelectedCogLink] = useState<string>()
  const [geometryType, setGeometryType] = useState<string>()
  const [viewState, setViewState] = useState({
    longitude: 0,
    latitude: 0,
    zoom: 1,
  })

  // Here is the command to convert a parquet to use GeoArrow for geometry column:
  // ogr2ogr -f Parquet /Users/wj/Downloads/gmw-geoarrow.parquet "/Users/wj/Downloads/gmw (4).parquet" -lco GEOMETRY_ENCODING=geoarrow
  // This will be done in the CSDR pipeline when generating GeoParquet files.

  const stac_parquet_arrow_s3 =
    'https://csdr-public-dev.s3.ap-southeast-2.amazonaws.com/viz-test/gmw-geoarrow.parquet'

  // Test files:
  // Must use the "_native" version where the geometry column is GeoArrow:
  // const GEOPARQUET_URL_POINTS_S3 =
  //   'https://csdr-public-dev.s3.ap-southeast-2.amazonaws.com/viz-test/natural-earth_cities_native.parquet'
  // const GEOPARQUET_URL_POINTS =
  //   'https://raw.githubusercontent.com/geoarrow/geoarrow-data/v0.2.0/natural-earth/files/natural-earth_cities_native.parquet'
  // const GEOPARQUET_URL_POLYGONS =
  //   'https://raw.githubusercontent.com/geoarrow/geoarrow-data/v0.2.0/natural-earth/files/natural-earth_countries_native.parquet'

  dataUrl = stac_parquet_arrow_s3 // Just for dev. Dataurl should come from props.
  dataType = 'stac-geoparquet' // Just for dev. dataType should come from props.

  useEffect(() => {
    const fetchParquet = async () => {
      setLoading(true)
      try {
        await initParquetWasm()
        const resp = await fetch(dataUrl)
        const arrayBuffer = await resp.arrayBuffer()
        const wasmTable = readParquet(new Uint8Array(arrayBuffer))
        const jsTable = tableFromIPC(wasmTable.intoIPCStream())
        setJsTable(jsTable)
      } catch (e) {
        console.error('Failed to load GeoParquet', e)
      }
      setLoading(false)
    }
    fetchParquet()
  }, []) // Don't want dataUrl as hook dependency. Don't want it to run twice, just on initial load.

  useEffect(() => {
    if (!jsTable) return
    console.log('jsTable', jsTable)
    // Detect points or polygons
    // Geometry column can have different names e.g. "geometry" or "proj:geometry"
    const geometryVector =
      jsTable?.getChild('geometry') || jsTable?.getChild('proj:geometry')
    if (
      geometryVector?.type?.typeId === 13 // Struct
      // geometryVector?.type?.children?.length === 2 &&
      // geometryVector?.type?.children[0]?.name === 'x' &&
      // geometryVector?.type?.children[1]?.name === 'y'
    ) {
      setGeometryType('Point')
      setLayers([
        new GeoArrowScatterplotLayer({
          id: 'dataset',
          data: jsTable,
          getPosition: geometryVector,
          getFillColor: [255, 140, 0, 180],
          stroked: true,
          getLineColor: [0, 0, 0, 255],
          getLineWidth: 1,
          lineWidthUnits: 'pixels',
          getRadius: 50000,
          pickable: true,
        }),
      ])
    } else if (
      geometryVector?.type?.typeId === 12 // List
      // geometryVector?.type?.children?.[0]?.type?.typeId === 12 && // List
      // geometryVector?.type?.children?.[0]?.type?.children?.[0]?.type?.typeId ===
      //   12 && // List
      // geometryVector?.type?.children?.[0]?.type?.children?.[0]?.type
      //   ?.children?.[0]?.type?.typeId === 13 // Struct(x, y)
    ) {
      setGeometryType('Polygon')
      setLayers([
        new GeoArrowPolygonLayer({
          id: 'dataset',
          data: jsTable,
          getPolygon: geometryVector,
          getFillColor: [255, 140, 0, 180],
          getLineColor: [0, 0, 0, 255],
          getLineWidth: 1,
          lineWidthUnits: 'pixels',
          lineWidthMinPixels: 1,
          pickable: true,
          onClick: (info) => {
            if (info && info.object) {
              setSelectedCogLink(
                Object.fromEntries(Object.entries(info.object))[
                  'assets.mangrove.href'
                ],
              )
            }
            if (dataType === 'stac-geoparquet') {
              // Show STAC item selector and load COG.
            } else if (dataType === 'geoparquet') {
              // Show details popup.
            }
          },
        }),
      ])
    } else {
      console.error('Unknown geometry type in GeoParquet')
    }
  }, [jsTable])

  useEffect(() => {
    const cogLayerId = 'cog-layer'
    console.log(selectedCogLink)

    if (!selectedCogLink) {
      // Remove existing COG layer if any
      setLayers((prevLayers) =>
        prevLayers.filter((layer) => layer.id !== cogLayerId),
      )
      return
    } else {
      // Remove existing COG layer if any so it can be replaced
      setLayers((prevLayers) =>
        prevLayers.filter((layer) => layer.id !== cogLayerId),
      )
      // Add new COG layer

      // TODO: Use selectedCogLink

      // This COG is from our own S3 bucket with CORS enabled. It hits an error that sounds like projection.
      // const COG_URL = "https://csdr-public-dev.s3.ap-southeast-2.amazonaws.com/datasets/gmw-v4/data/GMW_N00E008_v4019_mng.tif"
      // const COG_URL = "https://csdr-public-dev.s3.ap-southeast-2.amazonaws.com/datasets/gmw-v4/data/GMW_N00E008_v4019_mng.tif"
      // s3://csdr-public-dev/datasets/gmw-v4/data/GMW_N00E008_v4019_mng.tif
      // This COG hits the same projection error:
      // const COG_URL = "https://data.source.coop/ausantarctic/ghrsst-mur-v2/2002/06/01/20020601090000-JPL-L4_GHRSST-SSTfnd-MUR-GLOB-v02.0-fv04.1_analysed_sst.tif"

      // This COG works and is just for testing:
      const COG_URL =
        'https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/18/T/WL/2026/1/S2B_18TWL_20260101_0_L2A/TCI.tif'
      const cogLayer = new COGLayer({
        id: cogLayerId,
        geotiff: COG_URL,
        onGeoTIFFLoad: (tiff, options) => {
          console.log('COG loaded', { tiff, options })

          const { west, south, east, north } = options.geographicBounds
          const centerLongitude = (west + east) / 2
          const centerLatitude = (south + north) / 2
          setViewState((vs) => ({
            ...vs,
            longitude: centerLongitude,
            latitude: centerLatitude,
            zoom: 6,
          }))
        },
      })
      setLayers((prevLayers) => [...prevLayers, cogLayer])
    }
  }, [selectedCogLink])

  // {dataType && dataUrl &&
  return (
    <div className="grid grid-cols-1">
      <div className="w-full rounded-md">
        <p>Data Type: {dataType}</p>
        <p>Data URL: {dataUrl}</p>
        <p>Detected Geometry Type: {geometryType ?? 'Unknown'}</p>
        <p>Selected COG Link: {selectedCogLink ?? 'None'}</p>
        <div style={{ height: '500px', width: '100%', position: 'relative' }}>
          <DeckGL
            viewState={viewState}
            onViewStateChange={({ viewState }) => setViewState(viewState)}
            controller={true}
            layers={layers}
          >
            <Map
              style={{ width: '100%', height: '100%' }}
              mapStyle="https://api.protomaps.com/styles/v5/white/en.json?key=51cf1275231eb004"
            />
          </DeckGL>
          {loading && (
            <div className="absolute top-14 left-2 bg-white p-2 rounded shadow">
              Loading {dataType}...
            </div>
          )}
          {!loading && dataType === 'stac-geoparquet' && (
            <div className="absolute top-2 left-2 bg-white p-2 rounded shadow">
              This is a STAC-Geoparquet so you can select an item to load a COG.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
