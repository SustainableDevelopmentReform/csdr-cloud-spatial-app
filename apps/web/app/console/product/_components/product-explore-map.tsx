'use client'

import { cn } from '@repo/ui/lib/utils'
import { useMemo } from 'react'
import ChoroplethMapViewer from '../../geometries/_components/choropleth-map-viewer'
import { useGeometriesRun } from '../../geometries/_hooks'
import { useProductOutputsExport, useProductRun } from '../_hooks'

function toIsoTimePoint(timePoint: Date | string): string | null {
  const date = timePoint instanceof Date ? timePoint : new Date(timePoint)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function getLatestTimePoint(
  timePoints: readonly (Date | string)[] | null | undefined,
) {
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

export const ProductExploreMap = ({
  productRunId,
  className,
}: {
  productRunId: string
  className?: string
}) => {
  const productRunQuery = useProductRun(productRunId)
  const productRun = productRunQuery.data

  const shouldFetchGeometriesRun = !!productRun?.geometriesRun?.id
  const geometriesRunQuery = useGeometriesRun(
    productRun?.geometriesRun?.id,
    shouldFetchGeometriesRun,
  )
  const geometriesRun = geometriesRunQuery.data

  const summaryIndicator = useMemo(
    () =>
      productRun?.outputSummary?.indicators.find(
        (summary) => !!summary.indicator?.id,
      )?.indicator ?? null,
    [productRun?.outputSummary?.indicators],
  )
  const latestTimePoint = useMemo(
    () => getLatestTimePoint(productRun?.outputSummary?.timePoints),
    [productRun?.outputSummary?.timePoints],
  )
  const productOutputQuery = useMemo(
    () => ({
      indicatorId: summaryIndicator?.id,
      timePoint: latestTimePoint ?? undefined,
    }),
    [latestTimePoint, summaryIndicator?.id],
  )
  const productOutputsQuery = useProductOutputsExport(
    productRunId,
    productOutputQuery,
    false,
  )
  const productOutputs = productOutputsQuery.data
  const firstOutputWithIndicator = productOutputs?.data.find(
    (output) => !!output.indicatorId,
  )
  const fallbackIndicator = firstOutputWithIndicator?.indicatorId
    ? {
        id: firstOutputWithIndicator.indicatorId,
        name: firstOutputWithIndicator.indicatorName ?? 'Indicator',
        unit: '',
      }
    : null
  const selectedIndicator = summaryIndicator ?? fallbackIndicator
  const selectedTimePoint =
    latestTimePoint ??
    (productOutputs?.data && selectedIndicator?.id
      ? getLatestTimePoint(
          productOutputs.data
            .filter((output) => output.indicatorId === selectedIndicator.id)
            .map((output) => output.timePoint),
        )
      : null)
  const selectedProductOutputs = productOutputs?.data.filter((output) => {
    if (selectedIndicator?.id && output.indicatorId !== selectedIndicator.id) {
      return false
    }

    if (
      selectedTimePoint &&
      output.timePoint.toISOString() !== selectedTimePoint
    ) {
      return false
    }

    return true
  })

  const isLoading =
    productRunQuery.isPending ||
    productRunQuery.isFetching ||
    (shouldFetchGeometriesRun &&
      (geometriesRunQuery.isPending || geometriesRunQuery.isFetching)) ||
    (!!productRun &&
      (productOutputsQuery.isPending || productOutputsQuery.isFetching))

  if (isLoading) {
    return (
      <div
        className={cn(
          'flex h-96 items-center justify-center rounded-lg border',
          className,
        )}
      >
        <div className="text-sm text-muted-foreground">Loading map...</div>
      </div>
    )
  }

  if (!productRun || !geometriesRun) {
    return (
      <div
        className={cn(
          'flex h-96 items-center justify-center rounded-lg border',
          className,
        )}
      >
        <div className="text-sm text-muted-foreground">
          Map data is unavailable.
        </div>
      </div>
    )
  }

  return (
    <div className={cn('h-96 rounded-lg overflow-hidden', className)}>
      <ChoroplethMapViewer
        geometriesRun={geometriesRun}
        indicator={selectedIndicator}
        productRun={productRun}
        productOutputs={selectedProductOutputs}
      />
    </div>
  )
}
