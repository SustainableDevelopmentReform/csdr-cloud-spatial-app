import { Map, MapProps, MapRef } from '@vis.gl/react-maplibre'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Protocol } from 'pmtiles'
import { useEffect } from 'react'
import { useConfig } from '../../../../components/providers'

const REMOTE_MAP_STYLE_URL =
  'https://api.protomaps.com/styles/v5/white/en.json?key=51cf1275231eb004'

export const MapViewer = (props: MapProps & { ref?: React.Ref<MapRef> }) => {
  const config = useConfig()
  const { mapStyle, canvasContextAttributes, ...restProps } = props
  const resolvedMapStyle =
    mapStyle ?? config.mapStyleUrl ?? REMOTE_MAP_STYLE_URL
  const resolvedCanvasContextAttributes = {
    ...canvasContextAttributes,
    preserveDrawingBuffer:
      canvasContextAttributes?.preserveDrawingBuffer ?? true,
  }

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
      ref={props.ref}
      {...restProps}
      style={{ width: '100%', height: '100%' }}
      mapStyle={resolvedMapStyle}
      canvasContextAttributes={resolvedCanvasContextAttributes}
      attributionControl={{ compact: false }}
    />
  )
}
