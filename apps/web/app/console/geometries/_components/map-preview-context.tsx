'use client'

import { type MapRef } from '@vis.gl/react-maplibre'
import { createContext, useCallback, useContext, useRef } from 'react'

type MapBounds = {
  minLon: number
  minLat: number
  maxLon: number
  maxLat: number
}

type MapPreviewContextType = {
  /** Register (or unregister) the map instance so other consumers can read it. */
  setMapInstance: (ref: MapRef | null) => void
  /** Return the current viewport bounds, or null if no map is available. */
  getMapBounds: () => MapBounds | null
}

const MapPreviewContext = createContext<MapPreviewContextType | null>(null)

export function MapPreviewProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const mapRef = useRef<MapRef | null>(null)

  const setMapInstance = useCallback((instance: MapRef | null) => {
    mapRef.current = instance
  }, [])

  const getMapBounds = useCallback((): MapBounds | null => {
    const map = mapRef.current
    if (!map) return null
    const bounds = map.getBounds()
    return {
      minLon: Math.round(bounds.getWest() * 10000) / 10000,
      minLat: Math.round(bounds.getSouth() * 10000) / 10000,
      maxLon: Math.round(bounds.getEast() * 10000) / 10000,
      maxLat: Math.round(bounds.getNorth() * 10000) / 10000,
    }
  }, [])

  return (
    <MapPreviewContext.Provider value={{ setMapInstance, getMapBounds }}>
      {children}
    </MapPreviewContext.Provider>
  )
}

export function useMapPreview() {
  return useContext(MapPreviewContext)
}
