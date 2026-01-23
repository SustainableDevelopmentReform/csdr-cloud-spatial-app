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

  // Must use the "_native" version where the geometry column is GeoArrow:
  const GEOPARQUET_URL_POINTS_S3 =
    'https://csdr-public-dev.s3.ap-southeast-2.amazonaws.com/natural-earth_cities_native.parquet'
  dataUrl = GEOPARQUET_URL_POINTS_S3 // Just for dev
  const GEOPARQUET_URL_POINTS =
    'https://raw.githubusercontent.com/geoarrow/geoarrow-data/v0.2.0/natural-earth/files/natural-earth_cities_native.parquet'
  const GEOPARQUET_URL_POLYGONS =
    'https://raw.githubusercontent.com/geoarrow/geoarrow-data/v0.2.0/natural-earth/files/natural-earth_countries_native.parquet'

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

  let geometryType = null
  const layers = []
  if (jsTable) {
    // Detect points or polygons
    const geometryVector = jsTable?.getChild('geometry')
    if (
      geometryVector?.type?.typeId === 13 && // Struct
      geometryVector?.type?.children?.length === 2 &&
      geometryVector?.type?.children[0]?.name === 'x' &&
      geometryVector?.type?.children[1]?.name === 'y'
    ) {
      geometryType = 'Point'
      layers.push(
        new GeoArrowScatterplotLayer({
          id: 'dataset',
          data: jsTable,
          getPosition: jsTable.getChild('geometry'),
          getFillColor: [255, 140, 0, 180],
          stroked: true,
          getLineColor: [0, 0, 0, 255],
          getLineWidth: 1,
          lineWidthUnits: 'pixels',
          getRadius: 50000,
          pickable: true,
        }),
      )
    } else if (
      geometryVector?.type?.typeId === 12 && // List
      geometryVector?.type?.children?.[0]?.type?.typeId === 12 && // List
      geometryVector?.type?.children?.[0]?.type?.children?.[0]?.type?.typeId ===
        12 && // List
      geometryVector?.type?.children?.[0]?.type?.children?.[0]?.type
        ?.children?.[0]?.type?.typeId === 13 // Struct(x, y)
    ) {
      geometryType = 'Polygon'
      layers.push(
        new GeoArrowPolygonLayer({
          id: 'dataset',
          data: jsTable,
          getPolygon: jsTable.getChild('geometry'),
          getFillColor: [255, 140, 0, 180],
          getLineColor: [0, 0, 0, 255],
          getLineWidth: 1,
          lineWidthUnits: 'pixels',
          lineWidthMinPixels: 1,
          pickable: true,
          // onClick // if dataType === "stac-geoparquet", show STAC item selector and load COG. Else if dataType === "geoparquet", show details popup.
        }),
      )
    }
  }

  // {dataType && dataUrl &&
  return (
    <div className="grid grid-cols-1">
      <div className="w-full rounded-md">
        <p>Parquet Test (GeoArrow encoded geometry column)</p>
        <p>Data Type: {dataType}</p>
        <p>Data URL: {dataUrl}</p>
        <p>Detected Geometry Type: {geometryType ?? 'Unknown'}</p>
        <div style={{ height: '500px', width: '100%', position: 'relative' }}>
          <DeckGL
            initialViewState={{ longitude: 0, latitude: 0, zoom: 1 }}
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

// COG map stuff
// See example here: https://developmentseed.org/deck.gl-raster/examples/land-cover/

// export const DatasetRunMapCog: React.FC = () => {
//   // const COG_URL = 'https://e84-earth-search-sentinel-data.s3.us-west-2.amazonaws.com/sentinel-2-pre-c1-l2a/32/T/LR/2022/11/S2B_T32TLR_20221125T103254_L2A/B04.tif';
//   // const COG_URL = "https://s3.us-east-1.amazonaws.com/ds-deck.gl-raster-public/cog/Annual_NLCD_LndCov_2024_CU_C1V1.tif"
//   // const COG_URL = "https://data.source.coop/ausantarctic/ghrsst-mur-v2/2002/06/01/20020601090000-JPL-L4_GHRSST-SSTfnd-MUR-GLOB-v02.0-fv04.1_analysed_sst.tif"
//   // const COG_URL = "https://data.source.coop/tge-labs/aef/v1/annual/2024/12N/x03l2pi8jf4om2szj-0000000000-0000000000.tiff"
//   // const COG_URL = "https://ai4edataeuwest.blob.core.windows.net/usgs-gap/conus/gap_landfire_nationalterrestrialecosystems2011_-861135_1762215_-561135_1462215.tif"
//   // This works if CORS is enabled:
//   const COG_URL =
//     'https://s3.us-east-1.amazonaws.com/ds-deck.gl-raster-public/cog/Annual_NLCD_LndCov_2024_CU_C1V1.tif'
//   const cogLayer = new COGLayer({
//     id: 'cog-layer',
//     geotiff: COG_URL,
//   })
//   return (
//     <div>
//       COG Test (Cloud Optimized GeoTIFF)
//       <div style={{ height: '500px', width: '100%', position: 'relative' }}>
//         <DeckGL
//           initialViewState={{ longitude: 0, latitude: 0, zoom: 1 }}
//           controller={true}
//           layers={[cogLayer]}
//         >
//           <Map
//             style={{ width: '100%', height: '100%' }}
//             mapStyle="https://api.protomaps.com/styles/v5/white/en.json?key=51cf1275231eb004"
//           />
//         </DeckGL>
//       </div>
//     </div>
//   )
// }
