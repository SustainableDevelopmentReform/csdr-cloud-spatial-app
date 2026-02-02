import React, { useEffect, useState } from 'react'
import { Map } from '@vis.gl/react-maplibre'
import DeckGL from '@deck.gl/react'
import { MapViewState, LayersList, Layer } from '@deck.gl/core'
import {
  GeoArrowScatterplotLayer,
  GeoArrowPolygonLayer,
} from '@geoarrow/deck.gl-layers'
import initParquetWasm, { readParquet } from 'parquet-wasm'
import { Table, tableFromIPC } from 'apache-arrow'

import { COGLayer, proj } from '@developmentseed/deck.gl-geotiff'
import { GeoKeys, toProj4 } from 'geotiff-geokeys-to-proj4'

const fillColor = [0, 0, 0, 0] // Transparent.
// const outlineColor = getComputedStyle(document.documentElement).getPropertyValue('--dataset'); // This seems hacky so don't use it.
const outlineColor = [30, 119, 179, 255] // This color is also defined in CSS as --dataset

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
  dataType: string | null | undefined // TODO: fix type with datasetRun.dataType
  dataUrl: string | null | undefined
}) => {
  const [jsTable, setJsTable] = useState<Table | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [layers, setLayers] = useState<LayersList>([])
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null)
  const [viewState, setViewState] = useState<MapViewState>({
    longitude: 0,
    latitude: 0,
    zoom: 1,
  })

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
      // GeometryType : Point
      setLayers([
        new GeoArrowScatterplotLayer({
          id: 'dataset',
          data: jsTable,
          getPosition: geometryVector,
          getFillColor: fillColor,
          stroked: true,
          getLineColor: outlineColor,
          getLineWidth: (d: Feature) => {
            const featureId = jsTable?.getChild('id')?.get(d.index)
            const selectedFeatureId = selectedFeature?.['id']
            if (featureId == selectedFeatureId) {
              return 3
            }
            return 1
          },
          getRadius: (d: Feature) => {
            const featureId = jsTable?.getChild('id')?.get(d.index)
            const selectedFeatureId = selectedFeature?.['id']
            if (featureId == selectedFeatureId) {
              return 10
            }
            return 4
          },
          lineWidthUnits: 'pixels',
          radiusUnits: 'pixels',
          pickable: true,
          // TODO: Make onClick a function.
          onClick: (info) => {
            if (info && info.object) {
              setSelectedFeature(
                Object.fromEntries(Object.entries(info.object)),
              )
            }
          },
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
      // GeometryType : Polygon
      setLayers([
        new GeoArrowPolygonLayer({
          id: 'dataset',
          data: jsTable,
          getPolygon: geometryVector,
          getFillColor: fillColor,
          getLineColor: outlineColor,
          getLineWidth: (d: Feature) => {
            const featureId = jsTable?.getChild('id')?.get(d.index)
            const selectedFeatureId = selectedFeature?.['id']
            if (featureId == selectedFeatureId) {
              return 5
            }
            return 1
          },
          lineWidthUnits: 'pixels',
          lineWidthMinPixels: 1,
          pickable: true,
          // TODO: Make onClick a function.
          onClick: (info) => {
            if (info && info.object) {
              setSelectedFeature(
                Object.fromEntries(Object.entries(info.object)),
              )
            }
          },
        }),
      ])
    } else {
      console.error('Unknown geometry type in GeoParquet')
    }
  }, [jsTable, selectedFeature])

  useEffect(() => {
    async function loadCOG() {
      if (dataType == 'stac-geoparquet') {
        const cogLayerId = 'cog-layer'

        if (!selectedFeature) {
          // Remove existing COG layer if there is no longer one selected.
          setLayers((prevLayers: LayersList) =>
            prevLayers.filter((layer: Layer) => layer.id !== cogLayerId),
          )
          return
        } else {
          // Remove existing COG layer if there is one selected so it can be replaced
          setLayers((prevLayers: LayersList) =>
            prevLayers.filter((layer: Layer) => layer.id !== cogLayerId),
          )
          // Add new COG layer
          // This COG is from our S3 bucket. It errors because it is single band instead of 3 band (RGB).
          // const COG_URL = "https://csdr-public-dev.s3.ap-southeast-2.amazonaws.com/datasets/gmw-v4/data/GMW_N00E008_v4019_mng.tif"

          // The visualisation needs 3 bands (rgb), so I made the data fit into 3 bands:
          const COG_URL =
            'https://csdr-public-dev.s3.ap-southeast-2.amazonaws.com/viz-test/GMW_N00E008_v4019_mng_rgb.tif'
          // gdal_translate -of COG -co COMPRESS=DEFLATE -co TILED=YES -co PROFILE=COG \
          //   -b 1 -b 1 -b 1 \
          //   "/Users/wj/Downloads/GMW_N00E008_v4019_mng (3).tif" \
          //   "/Users/wj/Downloads/GMW_N00E008_v4019_mng_rgb.tif"

          // TODO: Use selectedFeatureLink
          // const selectedFeatureLink = selectedFeature['assets.mangrove.href'].replace(
          //   's3://csdr-public-dev',
          //   'https://csdr-public-dev.s3.ap-southeast-2.amazonaws.com',
          // )

          const cogLayer = new COGLayer({
            id: cogLayerId,
            // geotiff: selectedFeatureLink,
            geotiff: COG_URL,
            geoKeysParser,
            onGeoTIFFLoad: (tiff, options) => {
              console.log('COG loaded', { tiff, options })

              const { west, south, east, north } = options.geographicBounds
              const centerLongitude = (west + east) / 2
              const centerLatitude = (south + north) / 2
              setViewState((vs: MapViewState) => ({
                ...vs,
                longitude: centerLongitude,
                latitude: centerLatitude,
                zoom: 8,
              }))
            },
          })
          setLayers((prevLayers: LayersList) => [...prevLayers, cogLayer])
        }
      }
    }
    loadCOG()
  }, [selectedFeature])

  // {dataType && dataUrl &&
  return (
    <div className="w-[800px] max-w-full gap-8 flex flex-col">
      <div className="rounded-lg overflow-hidden h-96 relative">
        {/* <div style={{ height: '500px', width: '100%', position: 'relative' }}> */}
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
            Click a STAC-Geoparquet Item to view its details and COGs.
          </div>
        )}
        {!loading && dataType === 'geoparquet' && (
          <div className="absolute top-2 left-2 bg-white p-2 rounded shadow">
            Click a Geoparquet Item to view its details.
          </div>
        )}
      </div>
      {selectedFeature && (
        <div className="bg-white p-2 rounded-lg shadow">
          <p>Selected STAC Item Details:</p>
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
