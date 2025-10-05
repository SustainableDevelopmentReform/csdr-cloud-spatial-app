import { Map, MapProps } from '@vis.gl/react-maplibre'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Protocol } from 'pmtiles'
import { useEffect } from 'react'

export const MapViewer = (props: MapProps) => {
  // Init pmtiles protocol
  useEffect(() => {
    const protocol = new Protocol()
    maplibregl.addProtocol('pmtiles', protocol.tile)
    return () => {
      maplibregl.removeProtocol('pmtiles')
    }
  }, [])

  return (
    <Map
      // initialViewState={{
      //   bounds: geometryBbox as [number, number, number, number],
      //   fitBoundsOptions: { padding: 100 },
      // }}
      {...props}
      style={{ width: '100%', height: '400px' }}
      mapStyle="https://api.protomaps.com/styles/v5/white/en.json?key=51cf1275231eb004"
    />
  )
}
