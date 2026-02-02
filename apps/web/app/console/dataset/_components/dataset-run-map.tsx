import React, { useEffect, useState, useCallback } from 'react'
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
import { DatasetRunListItem } from '../_hooks'

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
}) => {
  const [jsTable, setJsTable] = useState<Table | null>(null)
  const [layers, setLayers] = useState<LayersList>([])
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null)
  const [viewState, setViewState] = useState<MapViewState>({
    longitude: 0,
    latitude: 0,
    zoom: 1,
  })
  const [error, setError] = useState<string | null>(null)

  // Test files:
  // Must use the "_native" version where the geometry column is GeoArrow:
  // const GEOPARQUET_URL_POINTS =
  //   'https://raw.githubusercontent.com/geoarrow/geoarrow-data/v0.2.0/natural-earth/files/natural-earth_cities_native.parquet'
  // const GEOPARQUET_URL_POLYGONS =
  //   'https://raw.githubusercontent.com/geoarrow/geoarrow-data/v0.2.0/natural-earth/files/natural-earth_countries_native.parquet'

  // For testing STAC-Geoparquet polygons:
  // const stac_parquet_arrow_s3 = 'https://csdr-public-dev.s3.ap-southeast-2.amazonaws.com/viz-test/gmw-geoarrow.parquet'
  const stac_parquet_arrow_s3 =
    'https://csdr-public-dev.s3.ap-southeast-2.amazonaws.com/viz-test/gmw.parquet'
  dataUrl = stac_parquet_arrow_s3 as Exclude<
    DatasetRunListItem['dataUrl'],
    null
  >
  // Just for dev. Dataurl will come from props.
  dataType = 'stac-geoparquet' as Exclude<DatasetRunListItem['dataType'], null> // Just for dev. dataType will come from props.

  // Reef. 500MB - breaks browser.
  // dataUrl = "https://csdr-public-dev.s3.ap-southeast-2.amazonaws.com/viz-test/reefextent.parquet" as Exclude<DatasetRunListItem['dataUrl'], null>
  // dataType = 'geoparquet' as Exclude<DatasetRunListItem['dataType'], null>

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

  // useCallback setters
  const handleSetJsTable = useCallback((table: Table) => {
    setJsTable(table)
  }, [])

  const handleSetLayers = useCallback((layers: LayersList) => {
    setLayers(layers)
  }, [])

  const handleSetSelectedFeature = useCallback((feature: Feature | null) => {
    setSelectedFeature(feature)
  }, [])

  const handleSetViewState = useCallback((vs: MapViewState) => {
    setViewState(vs)
  }, [])

  const handleSetError = useCallback((error: string | null) => {
    setError(error)
  }, [])

  // Single async useEffect for data loading and layer setup
  useEffect(() => {
    let isMounted = true
    const fetchAndVisualise = async () => {
      try {
        await initParquetWasm()
        const resp = await fetch(dataUrl)
        const arrayBuffer = await resp.arrayBuffer()
        const wasmTable = readParquet(new Uint8Array(arrayBuffer))
        const jsTable = tableFromIPC(wasmTable.intoIPCStream())
        if (!isMounted) return
        handleSetJsTable(jsTable)

        // Detect geometry type
        const geometryVector =
          jsTable?.getChild('geometry') || jsTable?.getChild('proj:geometry')
        let newLayers: LayersList = []
        if (geometryVector?.type?.typeId === 13) {
          // Point
          newLayers = [
            new GeoArrowScatterplotLayer({
              id: 'dataset',
              data: jsTable,
              getPosition: geometryVector,
              getFillColor: fillColor,
              stroked: true,
              getLineColor: outlineColor,
              getLineWidth: (d: Feature) => {
                // TODO: This dataset doesn't have an id field. There is no standard id field for datasets.
                const featureId = jsTable?.getChild('name')?.get(d.index)
                const selectedFeatureId = selectedFeature?.['name']
                if (featureId == selectedFeatureId) {
                  return 3
                }
                return 1
              },
              getRadius: (d: Feature) => {
                // TODO: This dataset doesn't have an id field. There is no standard id field for datasets.
                const featureId = jsTable?.getChild('name')?.get(d.index)
                const selectedFeatureId = selectedFeature?.['name']
                if (featureId == selectedFeatureId) {
                  return 200000
                }
                return 80000
              },
              lineWidthUnits: 'pixels',
              pickable: true,
              onClick: (info) => {
                if (info && info.object) {
                  handleSetSelectedFeature(
                    Object.fromEntries(Object.entries(info.object)),
                  )
                }
              },
            }),
          ]
        } else if (geometryVector?.type?.typeId === 12) {
          // Polygon
          newLayers = [
            new GeoArrowPolygonLayer({
              id: 'dataset',
              data: jsTable,
              getPolygon: geometryVector,
              getFillColor: fillColor,
              getLineColor: outlineColor,
              getLineWidth: (d: Feature) => {
                // TODO: There is no standard id field for datasets.
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
              onClick: (info) => {
                if (info && info.object) {
                  handleSetSelectedFeature(
                    Object.fromEntries(Object.entries(info.object)),
                  )
                }
              },
            }),
          ]
        } else {
          // debugger;
          const errorMessage = 'Unknown geometry type in GeoParquet'
          console.error(errorMessage)
          handleSetError(errorMessage)
        }
        handleSetLayers(newLayers)

        // COG logic
        if (dataType === 'stac-geoparquet' && selectedFeature) {
          const cogLayerId = 'cog-layer'
          // Remove existing COG layer
          newLayers = newLayers.filter(
            (layer: Layer) => layer.id !== cogLayerId,
          )
          // Add new COG layer
          // The visualisation needs 3 bands (rgb), so I made the data fit into 3 bands:
          const COG_URL =
            'https://csdr-public-dev.s3.ap-southeast-2.amazonaws.com/viz-test/GMW_N00E008_v4019_mng_rgb.tif'
          // This COG is from our S3 bucket. It errors because it is single band instead of 3 band (RGB).
          // const COG_URL = "https://csdr-public-dev.s3.ap-southeast-2.amazonaws.com/datasets/gmw-v4/data/GMW_N00E008_v4019_mng.tif"

          // TODO: Remove this once @developmentseed/deck.gl-geotiff merges the single band fix.
          // gdal_translate -of COG -co COMPRESS=DEFLATE -co TILED=YES -co PROFILE=COG \
          //   -b 1 -b 1 -b 1 \
          //   "/Users/wj/Downloads/GMW_N00E008_v4019_mng (3).tif" \
          //   "/Users/wj/Downloads/GMW_N00E008_v4019_mng_rgb.tif"

          // TODO: Once COGLayer supports single band COG, then use this link.
          // TODO: This will need a list of possible fields to read from. Maybe let the user choose from a list.
          // const selectedFeatureLink = selectedFeature['assets']['mangrove']['href'].replace(
          //   's3://csdr-public-dev',
          //   'https://csdr-public-dev.s3.ap-southeast-2.amazonaws.com',
          // )
          console.log('selectedFeature', selectedFeature)

          const cogLayer = new COGLayer({
            id: cogLayerId,
            geotiff: COG_URL,
            // geotiff: selectedFeatureLink,
            geoKeysParser,
            onGeoTIFFLoad: (tiff, options) => {
              const { west, south, east, north } = options.geographicBounds
              const centerLongitude = (west + east) / 2
              const centerLatitude = (south + north) / 2
              handleSetViewState({
                ...viewState,
                longitude: centerLongitude,
                latitude: centerLatitude,
                zoom: 8,
              })
            },
          })
          newLayers.push(cogLayer)
          handleSetLayers(newLayers)
        }
      } catch (e) {
        const errorMessage = 'Failed to load GeoParquet data.'
        console.error(errorMessage, e)
        handleSetError(errorMessage)
      }
    }
    fetchAndVisualise()
    return () => {
      // Cleanup
      isMounted = false
    }
  }, [dataType, dataUrl, selectedFeature])

  if (error) {
    return <p className="text-red-500">Error: {error}</p>
  }

  return (
    <div className="w-[800px] max-w-full gap-8 flex flex-col">
      <div className="rounded-lg overflow-hidden h-96 relative">
        <DeckGL
          viewState={viewState}
          onViewStateChange={({ viewState }) =>
            setViewState(viewState as MapViewState)
          }
          controller={true}
          layers={layers}
          getCursor={({ isHovering }) => (isHovering ? 'pointer' : 'default')}
        >
          <Map
            style={{ width: '100%', height: '100%' }}
            mapStyle="https://api.protomaps.com/styles/v5/white/en.json?key=51cf1275231eb004"
          />
        </DeckGL>
        {!jsTable && (
          <div className="absolute top-14 left-2 bg-white p-2 rounded shadow">
            Loading {dataType}...
          </div>
        )}
        {jsTable && dataType === 'stac-geoparquet' && (
          <div className="absolute top-2 left-2 bg-white p-2 rounded shadow">
            Click a STAC-Geoparquet Item to view its details and COGs.
          </div>
        )}
        {jsTable && dataType === 'geoparquet' && (
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
