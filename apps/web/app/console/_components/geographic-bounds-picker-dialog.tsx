'use client'

import { resourceBoundsSchema } from '@repo/schemas/crud'
import { Button } from '@repo/ui/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@repo/ui/components/ui/dialog'
import type { MapRef } from '@vis.gl/react-maplibre'
import { Globe } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { z } from 'zod'
import { MapViewer } from '../geometries/_components/map-viewer'
import {
  MapPreviewProvider,
  useMapPreview,
} from '../geometries/_components/map-preview-context'

export type GeographicBounds = z.infer<typeof resourceBoundsSchema>

export type GeographicBoundsQuery = {
  boundsMinX?: number
  boundsMinY?: number
  boundsMaxX?: number
  boundsMaxY?: number
}

const DEFAULT_VIEW_STATE = {
  longitude: 134,
  latitude: -27,
  zoom: 2.5,
}

const formatBoundsLabel = (bounds: GeographicBounds | null) => {
  if (!bounds) {
    return 'None selected'
  }

  return `${bounds.minX.toFixed(2)}, ${bounds.minY.toFixed(2)} to ${bounds.maxX.toFixed(2)}, ${bounds.maxY.toFixed(2)}`
}

export const getGeographicBoundsFromQuery = (
  query: GeographicBoundsQuery | undefined,
): GeographicBounds | null => {
  if (
    query?.boundsMinX === undefined ||
    query?.boundsMinY === undefined ||
    query?.boundsMaxX === undefined ||
    query?.boundsMaxY === undefined
  ) {
    return null
  }

  return {
    minX: query.boundsMinX,
    minY: query.boundsMinY,
    maxX: query.boundsMaxX,
    maxY: query.boundsMaxY,
  }
}

export const toGeographicBoundsQuery = (
  bounds: GeographicBounds | null,
): GeographicBoundsQuery => ({
  boundsMinX: bounds?.minX,
  boundsMinY: bounds?.minY,
  boundsMaxX: bounds?.maxX,
  boundsMaxY: bounds?.maxY,
})

const BoundsMap = ({ bounds }: { bounds: GeographicBounds | null }) => {
  const mapPreview = useMapPreview()

  const mapRefCallback = useCallback(
    (instance: MapRef | null) => {
      mapPreview?.setMapInstance(instance)
    },
    [mapPreview],
  )

  const initialViewState = useMemo(() => {
    if (!bounds) {
      return DEFAULT_VIEW_STATE
    }

    const viewBounds: [number, number, number, number] = [
      bounds.minX,
      bounds.minY,
      bounds.maxX,
      bounds.maxY,
    ]

    return {
      bounds: viewBounds,
      fitBoundsOptions: { padding: 40 },
    }
  }, [bounds])

  return (
    <div className="relative h-[420px] overflow-hidden rounded-md border">
      <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-md bg-background/90 px-3 py-2 text-sm shadow-sm">
        Zoom to area of interest, then click OK.
      </div>
      <MapViewer ref={mapRefCallback} initialViewState={initialViewState} />
    </div>
  )
}

const DialogBody = ({
  value,
  onChange,
  onClear,
  onClose,
}: {
  value: GeographicBounds | null
  onChange: (bounds: GeographicBounds) => void
  onClear: () => void
  onClose: () => void
}) => {
  const mapPreview = useMapPreview()

  return (
    <div className="flex flex-col gap-4">
      <BoundsMap bounds={value} />
      <div className="text-sm text-muted-foreground">
        Current bounds: {formatBoundsLabel(value)}
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={!value}
          onClick={() => {
            onClear()
            onClose()
          }}
        >
          Clear
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => {
            const bounds = mapPreview?.getMapBounds()

            if (!bounds) {
              return
            }

            onChange({
              minX: bounds.minLon,
              minY: bounds.minLat,
              maxX: bounds.maxLon,
              maxY: bounds.maxLat,
            })
            onClose()
          }}
        >
          OK
        </Button>
      </div>
    </div>
  )
}

export const GeographicBoundsPickerDialog = ({
  value,
  onChange,
  onClear,
  buttonText = 'Filter by geography',
  disabled = false,
}: {
  value: GeographicBounds | null
  onChange: (bounds: GeographicBounds) => void
  onClear: () => void
  buttonText?: string
  disabled?: boolean
}) => {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant={value ? 'default' : 'outline'}
          disabled={disabled}
        >
          <Globe className="mr-2 h-4 w-4" />
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Filter by geography</DialogTitle>
          <DialogDescription>
            Zoom the map to the area you want to include.
          </DialogDescription>
        </DialogHeader>
        <MapPreviewProvider>
          <DialogBody
            value={value}
            onChange={onChange}
            onClear={onClear}
            onClose={() => setOpen(false)}
          />
        </MapPreviewProvider>
      </DialogContent>
    </Dialog>
  )
}
