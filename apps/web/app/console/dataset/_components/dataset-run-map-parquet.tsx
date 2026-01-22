import React, { useEffect, useState } from 'react'
import { Map } from '@vis.gl/react-maplibre'
import DeckGL from '@deck.gl/react'
import { GeoArrowScatterplotLayer } from '@geoarrow/deck.gl-layers'
import initParquetWasm, { readParquet } from 'parquet-wasm'
import { tableFromIPC } from 'apache-arrow'

// Can't use this one because the geometry column is not GeoArrow:
// const GEOPARQUET_URL = "https://raw.githubusercontent.com/geoarrow/geoarrow-data/v0.2.0/natural-earth/files/natural-earth_cities.parquet";
// Must use the "_native" version where the geometry column is GeoArrow:
const GEOPARQUET_URL =
  'https://raw.githubusercontent.com/geoarrow/geoarrow-data/v0.2.0/natural-earth/files/natural-earth_cities_native.parquet'
export const DatasetRunMapParquet: React.FC = () => {
  const [jsTable, setJsTable] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchParquet = async () => {
      setLoading(true)
      try {
        await initParquetWasm() // <-- Initialize WASM
        const resp = await fetch(GEOPARQUET_URL)
        const arrayBuffer = await resp.arrayBuffer()
        const wasmTable = readParquet(new Uint8Array(arrayBuffer))
        const jsTable = tableFromIPC(wasmTable.intoIPCStream())
        setJsTable(jsTable)
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to load GeoParquet', e)
      }
      setLoading(false)
    }
    fetchParquet()
  }, [])

  const scatterLayer = jsTable
    ? new GeoArrowScatterplotLayer({
        id: 'scatterplot',
        data: jsTable,
        getPosition: jsTable.getChild('geometry'),
        getFillColor: [255, 140, 0, 180],
        getRadius: 50000,
        pickable: true,
      })
    : null

  return (
    <div>
      Parquet Test (geo column must be GeoArrow)
      <div style={{ height: '500px', width: '100%', position: 'relative' }}>
        <DeckGL
          initialViewState={{ longitude: 0, latitude: 0, zoom: 1 }}
          controller={true}
          layers={scatterLayer ? [scatterLayer] : []}
        >
          <Map
            style={{ width: '100%', height: '100%' }}
            mapStyle="https://api.protomaps.com/styles/v5/white/en.json?key=51cf1275231eb004"
          />
        </DeckGL>
        {loading && (
          <div className="absolute top-2 left-2 bg-white p-2 rounded shadow">
            Loading GeoParquet...
          </div>
        )}
      </div>
    </div>
  )
}
