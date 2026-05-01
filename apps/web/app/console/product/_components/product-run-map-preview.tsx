'use client'

import {
  type AppearanceConfig,
  type MapChartConfiguration,
  makeDateFormatter,
} from '@repo/plot/types'
import { useMemo, useState } from 'react'
import { ChartFormDialog } from '../../report/_components/chart-form-dialog'
import { ChartMapRenderer } from '../../report/_components/chart-map-renderer'
import type { ProductDetail, ProductRunDetail } from '../_hooks'

type ProductRunForMap = ProductRunDetail | NonNullable<ProductDetail['mainRun']>

const DEFAULT_MAP_APPEARANCE: AppearanceConfig = {
  compactNumbers: true,
  datePrecision: 'year-month',
}
const titleDateFormatter = makeDateFormatter(
  DEFAULT_MAP_APPEARANCE.datePrecision,
)

function toIsoTimePoint(timePoint: Date | string): string | null {
  const date = timePoint instanceof Date ? timePoint : new Date(timePoint)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function getLatestTimePoint(timePoints: readonly (Date | string)[] | null) {
  if (!timePoints || timePoints.length === 0) return null

  return timePoints.reduce<string | null>((latest, timePoint) => {
    const isoTimePoint = toIsoTimePoint(timePoint)
    if (!isoTimePoint) return latest
    if (!latest) return isoTimePoint
    return new Date(isoTimePoint).getTime() > new Date(latest).getTime()
      ? isoTimePoint
      : latest
  }, null)
}

function getDefaultMapChart(
  run: ProductRunForMap | null | undefined,
): MapChartConfiguration | null {
  const firstIndicator = run?.outputSummary?.indicators.find(
    (summary) => !!summary.indicator?.id,
  )?.indicator
  const latestTimePoint = getLatestTimePoint(
    run?.outputSummary?.timePoints ?? null,
  )

  if (!run?.geometriesRun?.id || !firstIndicator?.id || !latestTimePoint) {
    return null
  }

  return {
    type: 'map',
    productRunId: run.id,
    indicatorId: firstIndicator.id,
    timePoint: latestTimePoint,
    title: getMapGeneratedTitleFromParts(firstIndicator.name, latestTimePoint),
    appearance: DEFAULT_MAP_APPEARANCE,
  }
}

function compactTitleParts(parts: (string | null | undefined)[]) {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => !!part)
}

function getMapGeneratedTitle(
  run: ProductRunForMap | null | undefined,
  chart: MapChartConfiguration,
) {
  const indicatorName = run?.outputSummary?.indicators.find(
    (summary) => summary.indicator?.id === chart.indicatorId,
  )?.indicator?.name
  return getMapGeneratedTitleFromParts(indicatorName, chart.timePoint)
}

function getMapGeneratedTitleFromParts(
  indicatorName: string | null | undefined,
  timePoint: string,
) {
  const date = new Date(timePoint)
  const timePointLabel = Number.isNaN(date.getTime())
    ? null
    : titleDateFormatter.format(date)

  return compactTitleParts([indicatorName, timePointLabel]).join(' - ')
}

function getMapDisplayTitle(
  run: ProductRunForMap | null | undefined,
  chart: MapChartConfiguration,
) {
  return chart.title?.trim() || getMapGeneratedTitle(run, chart)
}

const ProductRunMapPreviewContent = ({
  defaultChart,
  run,
}: {
  defaultChart: MapChartConfiguration
  run: ProductRunForMap
}) => {
  const [chart, setChart] = useState<MapChartConfiguration>(defaultChart)
  const displayTitle = getMapDisplayTitle(run, chart)

  return (
    <div className="relative h-96 w-full overflow-hidden rounded-lg">
      <ChartMapRenderer chart={chart} className="h-full" />
      <div className="pointer-events-none absolute left-3 right-3 top-3 z-20 flex items-start justify-between gap-3">
        {displayTitle && (
          <h3 className="m-0 min-w-0 w-fit max-w-[calc(100%-11rem)] rounded-md border border-border bg-background/90 px-3 py-2 text-sm font-semibold leading-tight text-foreground shadow-sm backdrop-blur">
            {displayTitle}
          </h3>
        )}
        <div className="pointer-events-auto ml-auto shrink-0">
          <ChartFormDialog
            buttonText="Configure map"
            chart={chart}
            firstVisibleStep={2}
            onSubmit={(nextChart) => {
              if (nextChart.type === 'map') {
                const currentGeneratedTitle = getMapGeneratedTitle(run, chart)
                const nextGeneratedTitle = getMapGeneratedTitle(run, nextChart)
                const submittedTitle = nextChart.title?.trim()
                const title =
                  !submittedTitle ||
                  (chart.title === currentGeneratedTitle &&
                    submittedTitle === chart.title)
                    ? nextGeneratedTitle
                    : submittedTitle

                setChart({
                  ...nextChart,
                  title: title || undefined,
                })
              }
            }}
          />
        </div>
      </div>
    </div>
  )
}

export const ProductRunMapPreview = ({
  run,
}: {
  run?: ProductRunForMap | null
}) => {
  const defaultChart = useMemo(() => getDefaultMapChart(run), [run])

  if (!run || !defaultChart) return null

  return (
    <ProductRunMapPreviewContent
      key={`${defaultChart.productRunId}:${defaultChart.indicatorId}:${defaultChart.timePoint}`}
      defaultChart={defaultChart}
      run={run}
    />
  )
}
