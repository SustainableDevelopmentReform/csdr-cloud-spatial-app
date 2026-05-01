'use client'

import {
  type MapChartConfiguration,
  type OnSelectCallback,
} from '@repo/plot/types'
import { cn } from '@repo/ui/lib/utils'
import { usePrintRenderReadiness } from '~/components/print-readiness'
import ChoroplethMapViewer from '../../geometries/_components/choropleth-map-viewer'
import { useIndicator } from '../../indicator/_hooks'
import {
  type ProductOutputExportListItem,
  useProductOutputsExport,
  useProductRun,
} from '../../product/_hooks'

export const ChartMapRenderer = ({
  chart,
  className,
  onSelect,
}: {
  chart: MapChartConfiguration
  className?: string
  onSelect?: OnSelectCallback<ProductOutputExportListItem>
}) => {
  const productRunQuery = useProductRun(chart.productRunId)
  const productRun = productRunQuery.data
  const indicatorQuery = useIndicator(chart.indicatorId)
  const indicator = indicatorQuery.data
  const productOutputsQuery = useProductOutputsExport(chart.productRunId, {
    indicatorId: chart.indicatorId,
    timePoint: chart.timePoint,
  })
  const productOutputs = productOutputsQuery.data

  const isLoading =
    productRunQuery.isPending ||
    productRunQuery.isFetching ||
    indicatorQuery.isPending ||
    indicatorQuery.isFetching ||
    productOutputsQuery.isPending ||
    productOutputsQuery.isFetching
  const hasError = Boolean(
    productRunQuery.error || indicatorQuery.error || productOutputsQuery.error,
  )

  usePrintRenderReadiness({
    isReady: !isLoading,
  })

  if (isLoading) {
    return (
      <div
        className={cn(
          'relative flex h-full w-full items-center justify-center overflow-hidden rounded-lg',
          className,
        )}
      >
        <div className="px-4 text-center text-sm text-muted-foreground">
          Loading map...
        </div>
      </div>
    )
  }

  if (hasError || !productRun?.geometriesRun) {
    return (
      <div
        className={cn(
          'relative flex h-full w-full items-center justify-center overflow-hidden rounded-lg',
          className,
        )}
      >
        <div className="px-4 text-center text-sm text-muted-foreground">
          Map data is unavailable for this chart.
        </div>
      </div>
    )
  }

  return (
    <ChoroplethMapViewer
      geometriesRun={productRun.geometriesRun}
      indicator={indicator}
      productRun={productRun}
      productOutputs={productOutputs?.data}
      zoomToGeometryOutputIds={chart.geometryOutputIds}
      appearance={chart.appearance}
      onSelect={onSelect}
      className={className}
    />
  )
}
