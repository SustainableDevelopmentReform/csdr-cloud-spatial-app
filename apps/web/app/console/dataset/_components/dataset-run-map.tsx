import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import {
  Map,
  MapRef,
  Source,
  Layer,
  LineLayerSpecification,
  FillLayerSpecification,
} from '@vis.gl/react-maplibre' // Use Source for PMTiles, like geometries-map-viewer.tsx
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
  // const gmw_v4_written_by_pipeline_s3 =
  //   'https://csdr-public-dev.s3.ap-southeast-2.amazonaws.com/datasets/gmw-v4/0-0-1/gmw.parquet'
  // const seagrass_written_by_pipeline_s3 =
  //   'https://csdr-public-dev.s3.ap-southeast-2.amazonaws.com/datasets/seagrass/0-0-1/dep_s2_seagrass.parquet'
  // const ace_written_by_pipeline_s3 =
  //   'https://csdr-public-dev.s3.ap-southeast-2.amazonaws.com/datasets/ace/0-0-1/ace.parquet'
  // dataUrl = gmw_v4_written_by_pipeline_s3 as Exclude<
  //   DatasetRunListItem['dataUrl'],
  //   null
  // >
  // // // Just for dev. Dataurl will come from props.
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
    // enabled: !!datasetRunPMTilesUrl, // TODO: Use the datasetRunPMTilesUrl prop instead
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

  // console.log(parquetArrowTable);
  // console.log(pmtilesHeader);

  // Use useMemo to compute map bounds based on loaded data.
  const mapBounds = useMemo(() => {
    if (isLoadingPmtilesHeader) return undefined

    if (pmtilesHeader) {
      return [
        pmtilesHeader.minLon,
        pmtilesHeader.minLat,
        pmtilesHeader.maxLon,
        pmtilesHeader.maxLat,
      ] as [number, number, number, number]
    }

    return undefined
  }, [
    isLoadingPmtilesHeader,
    // isLoadingGeometryOutputsToZoomTo,
    // isLoadingGeometriesRun,
    // geometryOutputsToZoomTo,
    pmtilesHeader,
    // geometriesRun,
  ])

  // Callback when the pointer clicks on an object in any pickable layer
  const onFeatureClick = useCallback((info: PickingInfo, event: any) => {
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
  }, [])

  const layers = useMemo<LayersList>(() => {
    const layerList: LayersList = []

    if (parquetArrowTable) {
      const datasetLayerId = 'dataset'

      // Detect geometry type
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
        // Point
        layerList.push(
          new GeoArrowScatterplotLayer({
            ...sharedProps,
            getPosition: geometryVector,
            stroked: true,
            getLineWidth: (d: Feature) => {
              // TODO: This dataset doesn't have an id field. There is no standard id field for datasets.
              const featureId = parquetArrowTable
                ?.getChild('name')
                ?.get(d.index)
              const selectedFeatureId = selectedFeature?.['name']
              if (featureId == selectedFeatureId) {
                return 3
              }
              return 1
            },
            radiusUnits: 'pixels',
            getRadius: (d: Feature) => {
              // TODO: This dataset doesn't have an id field. There is no standard id field for datasets.
              const featureId = parquetArrowTable
                ?.getChild('name')
                ?.get(d.index)
              const selectedFeatureId = selectedFeature?.['name']
              if (featureId == selectedFeatureId) {
                return 10
              }
              return 15
            },
          }),
        )
      } else if (geometryVector?.type?.typeId === 12) {
        // Polygon
        layerList.push(
          new GeoArrowPolygonLayer({
            ...sharedProps,
            getPolygon: geometryVector,
            getLineWidth: (d: Feature) => {
              // TODO: There is no standard id field for datasets.
              const featureId = parquetArrowTable?.getChild('id')?.get(d.index)
              const selectedFeatureId = selectedFeature?.['id']
              if (featureId == selectedFeatureId) {
                return 5
              }
              return 1
            },
          }),
        )
      } else {
        // debugger;
        throw new Error('Unknown geometry type in GeoParquet') // TODO: Handle this better.
      }
    }
    return layerList
  }, [parquetArrowTable, pmtilesHeader])

  // const PMTileLayer = new TileSourceLayer({
  //   tileSource: new PMTilesSource({url: testPMTilesUrl}),
  // });
  // const [layers, setLayers] = useState<LayersList>([])
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null)
  // const [viewState, setViewState] = useState<MapViewState>({
  //   longitude: 0,
  //   latitude: 0,
  //   zoom: 1,
  // })
  const deckRef = useRef<any | null>(null)

  // const onAfterRender = useCallback(() => {
  //   const layer = layers[0];
  //   console.log(layer);
  //   if (!hasLoaded && layer.isLoaded) {
  //     setHasLoaded(true);
  //     const viewport = layer.context.viewport as WebMercatorViewport;
  //     const {longitude, latitude, zoom} = viewport.fitBounds(layer.getBounds());
  //     setViewState({longitude, latitude, zoom});
  //   }
  // }, [])

  // const handleSetLayers = useCallback((layers: LayersList) => {
  //   setLayers(layers)
  // }, [])

  const handleSetSelectedFeature = useCallback((feature: Feature | null) => {
    setSelectedFeature(feature)
  }, [])

  // const handleSetViewState = useCallback(
  //   (vs: MapViewState, layerId: string | null) => {
  //     if (layerId) {
  //       // Fit to a layer's bounds
  //       console.log(layers)
  //       const layer = layers.find((lyr) => lyr.id === layerId)
  //       console.log(layer)
  //       console.log(deckRef)

  //       // debugger;
  //       // const lyr = deckRef.current.getLayer(layerId);

  //       // const viewport = layer.context.viewport as WebMercatorViewport;
  //       // console.log(viewport);
  //       // const bounds = layer.getBounds();
  //       // console.log(bounds);
  //       // const {longitude, latitude, zoom} = viewport.fitBounds(bounds);
  //       // console.log(longitude, latitude, zoom);
  //       // setViewState({
  //       //   ...vs,
  //       //   longitude: longitude,
  //       //   latitude: latitude,
  //       //   zoom: zoom,
  //       // })
  //     } else {
  //       // Simply set the viewState to what was provided.
  //       setViewState(vs)
  //     }
  //   },
  //   [layers, deckRef],
  // )

  // const handleLoad = useCallback(
  //   (e: any) => {
  //     console.log('Load event:', e)
  //     console.log(layers)
  //     console.log(deckRef)
  //     // I want to fitbounds to parquet layer here but it is not available until after the effect that sets the layers.
  //   },
  //   [layers, deckRef],
  // )

  // Callback to populate the default tooltip with content
  // const getTooltip = useCallback(({object}: PickingInfo<Feature>) => {
  //   return object && object.message;
  // }, []);

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

  // // Single async useEffect for data loading and layer setup
  // useEffect(() => {
  //   const fetchAndVisualise = async () => {
  //     try {

  //       // TODO: Fit to GeoParquet data bounds
  //       // handleSetViewState(viewState, datasetLayerId)

  //       // COG logic
  //       if (dataType === 'stac-geoparquet' && selectedFeature) {
  //         const cogLayerId = 'cog-layer'
  //         // Remove existing COG layer
  //         newLayers = newLayers.filter(
  //           (layer) => layer.id !== cogLayerId,
  //         )
  //         // Add new COG layer
  //         // The visualisation needs 3 bands (rgb), so I made the data fit into 3 bands:
  //         const COG_URL =
  //           'https://csdr-public-dev.s3.ap-southeast-2.amazonaws.com/viz-test/GMW_N00E008_v4019_mng_rgb.tif'
  //         // This COG is from our S3 bucket. It errors because it is single band instead of 3 band (RGB).
  //         // const COG_URL = "https://csdr-public-dev.s3.ap-southeast-2.amazonaws.com/datasets/gmw-v4/data/GMW_N00E008_v4019_mng.tif"

  //         // TODO: Remove this once @developmentseed/deck.gl-geotiff merges the single band fix.
  //         // gdal_translate -of COG -co COMPRESS=DEFLATE -co TILED=YES -co PROFILE=COG \
  //         //   -b 1 -b 1 -b 1 \
  //         //   "/Users/wj/Downloads/GMW_N00E008_v4019_mng (3).tif" \
  //         //   "/Users/wj/Downloads/GMW_N00E008_v4019_mng_rgb.tif"

  //         // TODO: Once COGLayer supports single band COG, then use this link.
  //         // TODO: This will need a list of possible fields to read from. Maybe let the user choose from a list.
  //         // const selectedFeatureLink = selectedFeature['assets']['mangrove']['href'].replace(
  //         //   's3://csdr-public-dev',
  //         //   'https://csdr-public-dev.s3.ap-southeast-2.amazonaws.com',
  //         // )
  //         console.log('selectedFeature', selectedFeature)

  //         console.log(layers)

  //         const cogLayer = new COGLayer({
  //           id: cogLayerId,
  //           geotiff: COG_URL,
  //           // geotiff: selectedFeatureLink,
  //           geoKeysParser,
  //           onGeoTIFFLoad: (tiff, options) => {
  //             // handleSetViewState(viewState, cogLayerId)
  //             const { west, south, east, north } = options.geographicBounds
  //             // debugger;
  //             const centerLongitude = (west + east) / 2
  //             const centerLatitude = (south + north) / 2
  //             // const viewport = cogLayer.context.viewport as WebMercatorViewport;
  //             // const bounds = cogLayer.getBounds();
  //             // console.log('COG bounds:', bounds);
  //             // const {longitude, latitude, zoom} = viewport.fitBounds(bounds);
  //             // handleSetViewState({
  //             //   ...viewState,
  //             //   longitude: longitude,
  //             //   latitude: latitude,
  //             //   zoom: zoom,
  //             // })
  //             handleSetViewState(
  //               {
  //                 ...viewState,
  //                 longitude: centerLongitude,
  //                 latitude: centerLatitude,
  //                 zoom: 7,
  //               },
  //               null,
  //             )
  //           },
  //         })
  //         newLayers.push(cogLayer)
  //         handleSetLayers(newLayers)
  //       }
  //     } catch (e) {
  //       const errorMessage = 'Failed to load GeoParquet data.'
  //       console.error(errorMessage, e)
  //       handleSetError(errorMessage)
  //     }
  //   }
  //   fetchAndVisualise()
  //   return () => {
  //     // Cleanup
  //     isMounted = false
  //   }
  // }, [dataType, dataUrl, selectedFeature])

  // // This effect may be buggy. It just fitBounds the map to the last added layer.
  // useEffect(() => {
  //   if (layers.length > 0 && deckRef.current) {
  //     // Fit to the dataset layer bounds
  //     const layer = layers[0]
  //     console.log(layer)
  //     handleSetViewState(viewState, layer.id)
  //   }
  // }, [layers, deckRef])

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

  const { linePaint, fillPaint } = useMemo(
    () => {
      // if (!indicator)
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

      // const indicatorSummary = productRun?.outputSummary?.indicators.find(
      //   (v) => v.indicator?.id === indicator.id,
      // )

      // const colorFn = (value: number | null) => {
      //   if (!value) return NO_DATA_COLOR
      //   const normalizedValue =
      //     (value - (indicatorSummary?.minValue ?? 0)) /
      //     ((indicatorSummary?.maxValue ?? 1) - (indicatorSummary?.minValue ?? 0))

      //   return interpolateYlOrRd(normalizedValue)
      // }

      // const fillColourEntries: [
      //   ExpressionSpecification,
      //   ExpressionInputType,
      //   ...(ExpressionInputType | ExpressionSpecification)[],
      // ] = [['!', ['has', ID_PROPERTY]], NO_DATA_COLOR]

      // const lineColourEntries: [
      //   ExpressionSpecification,
      //   ExpressionInputType,
      //   ...(ExpressionInputType | ExpressionSpecification)[],
      // ] = [['!', ['has', ID_PROPERTY]], NO_DATA_COLOR]

      // productOutputs?.forEach((output) => {
      //   if (output.geometryOutputId) {
      //     if (zoomToGeometryOutputIds?.includes(output.geometryOutputId)) {
      //       lineColourEntries.push(
      //         ['==', ['get', ID_PROPERTY], output.geometryOutputId],
      //         '#000000',
      //       )
      //     } else {
      //       lineColourEntries.push(
      //         ['==', ['get', ID_PROPERTY], output.geometryOutputId],
      //         colorFn(output.value),
      //       )
      //     }
      //     fillColourEntries.push(
      //       ['==', ['get', ID_PROPERTY], output.geometryOutputId],
      //       colorFn(output.value),
      //     )
      //   }
      // })

      // const selectedGeometriesLineWidth: [
      //   ExpressionSpecification,
      //   ExpressionInputType,
      //   ...(ExpressionInputType | ExpressionSpecification)[],
      // ] = [['!', ['has', ID_PROPERTY]], 1]

      // const selectedGeometriesLineOpacity: [
      //   ExpressionSpecification,
      //   ExpressionInputType,
      //   ...(ExpressionInputType | ExpressionSpecification)[],
      // ] = [['!', ['has', ID_PROPERTY]], 0.1]

      // geometryOutputsToZoomTo?.data?.forEach((output) => {
      //   selectedGeometriesLineWidth.push(
      //     ['==', ['get', ID_PROPERTY], output.id],
      //     zoomToGeometryOutputIds?.includes(output.id) ? 2 : 1,
      //   )
      //   selectedGeometriesLineOpacity.push(
      //     ['==', ['get', ID_PROPERTY], output.id],
      //     zoomToGeometryOutputIds?.includes(output.id) ? 1 : 0.1,
      //   )
      // })

      // const paint = {
      //   linePaint: {
      //     'line-color': ['case', ...lineColourEntries, NO_DATA_COLOR],
      //     'line-width': ['case', ...selectedGeometriesLineWidth, 1],
      //     'line-offset': 1,
      //   } satisfies LineLayerSpecification['paint'],
      //   fillPaint: {
      //     'fill-color': ['case', ...fillColourEntries, NO_DATA_COLOR],
      //     'fill-opacity': 0.7,
      //   } satisfies FillLayerSpecification['paint'],
      // }
      // return paint
    },
    [
      // indicator,
      // productRun?.outputSummary?.indicators,
      // productOutputs,
      // geometryOutputsToZoomTo?.data,
      // zoomToGeometryOutputIds,
    ],
  )

  return (
    <div className="w-[800px] max-w-full gap-8 flex flex-col">
      <div className="rounded-lg overflow-hidden h-96 relative">
        <DeckGL
          ref={deckRef}
          // viewState={viewState}
          // onViewStateChange={({ viewState }) =>
          //   setViewState(viewState as MapViewState)
          // }
          // controller={true}
          layers={layers}
          getCursor={({ isHovering }) => (isHovering ? 'pointer' : 'default')}
          // getTooltip={getTooltip}
          // getTooltip={onFeatureClick}
          pickMultipleObjects={true}
          // onLoad={handleLoad}
          // onAfterRender={onAfterRender}
        >
          {/* <Map
            style={{ width: '100%', height: '100%' }}
            mapStyle="https://api.protomaps.com/styles/v5/white/en.json?key=51cf1275231eb004"
          /> */}
          <MapViewer
            ref={mapRef}
            // interactiveLayerIds={['geometries-fill']}
            initialViewState={
              mapBounds
                ? { bounds: mapBounds, fitBoundsOptions: { padding: 20 } }
                : undefined
            }
            // onClick={onMouseClick}
            // transformRequest={transformRequest}
          >
            <Source
              id="dataset-pmtiles-source"
              type="vector"
              minzoom={0}
              maxzoom={22}
              tiles={[
                // `${config.apiBaseUrl}/api/v0/geometries-run/${geometriesRun?.id}/outputs/mvt/{z}/{x}/{y}`,
                datasetRunPMTilesUrl,
              ]}
            />
            <Layer
              id="dataset-pmtiles-fill"
              source="dataset-pmtiles-source"
              source-layer="data"
              type="fill"
              paint={fillPaint}
            />
            <Layer
              id="dataset-pmtiles-line"
              source="dataset-pmtiles-source"
              source-layer="data"
              type="line"
              paint={linePaint}
            />
          </MapViewer>
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
