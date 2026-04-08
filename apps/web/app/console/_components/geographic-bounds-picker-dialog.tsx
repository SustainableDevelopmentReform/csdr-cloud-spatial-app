'use client'

import { resourceBoundsSchema } from '@repo/schemas/crud'
import { Button } from '@repo/ui/components/ui/button'
import { cn } from '@repo/ui/lib/utils'
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
import { FieldGroup } from '../../../components/form/action'
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

type GeographicBoundsLike =
  | GeographicBounds
  | Partial<GeographicBounds>
  | null
  | undefined

const DEFAULT_VIEW_STATE = {
  longitude: 134,
  latitude: -27,
  zoom: 2.5,
}

const hasFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const normalizeGeographicBounds = (
  bounds: GeographicBoundsLike,
): GeographicBounds | null => {
  if (!bounds) {
    return null
  }

  if (
    !hasFiniteNumber(bounds.minX) ||
    !hasFiniteNumber(bounds.minY) ||
    !hasFiniteNumber(bounds.maxX) ||
    !hasFiniteNumber(bounds.maxY)
  ) {
    return null
  }

  return {
    minX: bounds.minX,
    minY: bounds.minY,
    maxX: bounds.maxX,
    maxY: bounds.maxY,
  }
}

const formatBoundsLabel = (bounds: GeographicBoundsLike) => {
  const normalizedBounds = normalizeGeographicBounds(bounds)

  if (!normalizedBounds) {
    return 'None selected'
  }

  return `${normalizedBounds.minX.toFixed(2)}, ${normalizedBounds.minY.toFixed(2)} to ${normalizedBounds.maxX.toFixed(2)}, ${normalizedBounds.maxY.toFixed(2)}`
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
  value: GeographicBoundsLike
  onChange: (bounds: GeographicBounds) => void
  onClear: () => void
  onClose: () => void
}) => {
  const mapPreview = useMapPreview()
  const normalizedValue = normalizeGeographicBounds(value)

  return (
    <div className="flex flex-col gap-4">
      <BoundsMap bounds={normalizedValue} />
      <div className="text-sm text-muted-foreground">
        Current bounds: {formatBoundsLabel(normalizedValue)}
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={!normalizedValue}
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
  title,
  className,
  disabled = false,
}: {
  value: GeographicBoundsLike
  onChange: (bounds: GeographicBounds) => void
  onClear: () => void
  buttonText?: string
  title?: string
  className?: string
  disabled?: boolean
}) => {
  const [open, setOpen] = useState(false)
  const normalizedValue = normalizeGeographicBounds(value)
  const statusLabel = normalizedValue ? 'Area selected' : 'Any area'
  const resolvedButtonText = title
    ? normalizedValue
      ? 'Adjust area'
      : 'Select area'
    : buttonText

  const trigger = title ? (
    <FieldGroup title={title} disabled={disabled} className={className}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'h-10 w-full justify-between px-3 text-left font-normal',
            normalizedValue &&
              'border-primary/30 bg-primary/5 hover:bg-primary/10',
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <Globe className="h-4 w-4 shrink-0" />
            <span className="truncate">{resolvedButtonText}</span>
          </span>
          <span
            className={cn(
              'ml-3 shrink-0 text-xs',
              normalizedValue ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            {statusLabel}
          </span>
        </Button>
      </DialogTrigger>
    </FieldGroup>
  ) : (
    <DialogTrigger asChild>
      <Button
        type="button"
        variant={normalizedValue ? 'default' : 'outline'}
        disabled={disabled}
        className={className}
      >
        <Globe className="mr-2 h-4 w-4" />
        {buttonText}
      </Button>
    </DialogTrigger>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger}
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Filter by geography</DialogTitle>
          <DialogDescription>
            Zoom the map to the area you want to include.
          </DialogDescription>
        </DialogHeader>
        <MapPreviewProvider>
          <DialogBody
            value={normalizedValue}
            onChange={onChange}
            onClear={onClear}
            onClose={() => setOpen(false)}
          />
        </MapPreviewProvider>
      </DialogContent>
    </Dialog>
  )
}
