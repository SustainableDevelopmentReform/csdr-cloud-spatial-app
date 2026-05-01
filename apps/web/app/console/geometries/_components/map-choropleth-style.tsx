import {
  type AppearanceConfig,
  type DivergingColorScheme,
  type LegendPosition,
  type SequentialColorScheme,
} from '@repo/plot/types'
import {
  interpolateBrBG,
  interpolateBlues,
  interpolateBuPu,
  interpolateGreens,
  interpolateInferno,
  interpolateOranges,
  interpolatePiYG,
  interpolatePlasma,
  interpolatePRGn,
  interpolateRdBu,
  interpolateRdYlGn,
  interpolateViridis,
  interpolateYlGnBu,
  interpolateYlOrRd,
} from 'd3-scale-chromatic'
import { scaleDiverging, scaleSequential } from 'd3-scale'

export const NO_DATA_COLOR = '#eef'
export const ID_PROPERTY = 'id'

const LEGEND_STOPS = 10

const SEQUENTIAL_INTERPOLATORS: Record<
  SequentialColorScheme,
  (t: number) => string
> = {
  ylOrRd: interpolateYlOrRd,
  viridis: interpolateViridis,
  plasma: interpolatePlasma,
  inferno: interpolateInferno,
  blues: interpolateBlues,
  greens: interpolateGreens,
  oranges: interpolateOranges,
  ylGnBu: interpolateYlGnBu,
  buPu: interpolateBuPu,
}

const DIVERGING_INTERPOLATORS: Record<
  DivergingColorScheme,
  (t: number) => string
> = {
  rdBu: interpolateRdBu,
  brBG: interpolateBrBG,
  piYG: interpolatePiYG,
  prGn: interpolatePRGn,
  rdYlGn: interpolateRdYlGn,
}

export function buildColorScale(
  autoMin: number,
  autoMax: number,
  appearance?: AppearanceConfig,
): (value: number) => string {
  const min = appearance?.colorScaleMin ?? autoMin
  const max = appearance?.colorScaleMax ?? autoMax
  const reverse = appearance?.reverseColorScale ?? false
  const isDiverging = appearance?.colorScaleType === 'diverging'

  if (isDiverging) {
    const baseInterpolator =
      DIVERGING_INTERPOLATORS[appearance?.divergingScheme ?? 'rdBu'] ??
      interpolateRdBu
    const interpolator = reverse
      ? (t: number) => baseInterpolator(1 - t)
      : baseInterpolator
    const mid = appearance?.divergingMidpoint ?? (min + max) / 2
    if (min === max) {
      const c = interpolator(0.5)
      return () => c
    }
    const scale = scaleDiverging(interpolator).domain([min, mid, max])
    return (v: number) => scale(v)
  }

  const baseInterpolator =
    SEQUENTIAL_INTERPOLATORS[appearance?.sequentialScheme ?? 'ylOrRd'] ??
    interpolateYlOrRd
  const interpolator = reverse
    ? (t: number) => baseInterpolator(1 - t)
    : baseInterpolator
  if (min === max) {
    const c = interpolator(0.5)
    return () => c
  }
  const scale = scaleSequential(interpolator).domain([min, max])
  return (v: number) => scale(v)
}

export function MapLegend({
  min,
  max,
  scale,
  label,
  unit,
  position = 'bottom',
  compactNumbers,
  decimalPlaces,
}: {
  min: number
  max: number
  scale: (value: number) => string
  label?: string
  unit?: string
  position?: LegendPosition
  compactNumbers?: boolean
  decimalPlaces?: number
}) {
  const stops: string[] = []
  for (let i = 0; i <= LEGEND_STOPS; i++) {
    const t = i / LEGEND_STOPS
    const value = min + t * (max - min)
    stops.push(scale(value))
  }

  const opts: Intl.NumberFormatOptions = {
    notation: compactNumbers ? 'compact' : 'standard',
  }
  if (decimalPlaces !== undefined) {
    opts.maximumFractionDigits = decimalPlaces
  } else if (!compactNumbers) {
    opts.maximumFractionDigits = 2
  }
  const nf = new Intl.NumberFormat(undefined, opts)

  if (position === 'none') return null

  const positionClasses =
    position === 'top' ? 'top-3 left-3' : 'bottom-3 left-3'

  return (
    <div
      className={`pointer-events-auto absolute ${positionClasses} z-10 flex flex-col gap-1 rounded-md border border-border bg-background px-3 py-2 text-xs`}
    >
      {label && (
        <span className="font-medium text-foreground">
          {label}
          {unit ? ` (${unit})` : ''}
        </span>
      )}
      <div
        className="h-3 w-48 rounded-sm"
        style={{
          background: `linear-gradient(to right, ${stops.join(', ')})`,
        }}
      />
      <div className="flex justify-between text-muted-foreground">
        <span>{nf.format(min)}</span>
        <span>{nf.format(max)}</span>
      </div>
    </div>
  )
}
