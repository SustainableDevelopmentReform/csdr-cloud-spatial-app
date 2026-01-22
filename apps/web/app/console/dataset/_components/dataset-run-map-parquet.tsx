import React, { useRef } from 'react'
import { MapViewer } from '../../geometries/_components/map-viewer'
import { MapRef } from '@vis.gl/react-maplibre'

export const DatasetRunMapParquet: React.FC = () => {
  const mapRef = useRef<MapRef | null>(null)
  return (
    <div>
      Parquet Viz Test
      <div style={{ height: '500px', width: '100%' }}>
        <MapViewer
          initialViewState={{
            bounds: [-180, -90, 180, 90],
            // fitBoundsOptions: { padding: 100 },
          }}
        ></MapViewer>
      </div>
    </div>
  )
}
