'use client'

import {
  type MapChartConfiguration,
  type OnSelectCallback,
} from '@repo/plot/types'
import {
  applyChartTimeChangeTransform,
  filterRecordsForTimePoint,
  getChartDefinitionForConfiguration,
  getChartTimeChangeMode,
} from '@repo/plot/chart-definitions'
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
  scrollZoom = true,
}: {
  chart: MapChartConfiguration
  className?: string
  onSelect?: OnSelectCallback<ProductOutputExportListItem>
  scrollZoom?: boolean
}) => {
  const productRunQuery = useProductRun(chart.productRunId)
  const productRun = productRunQuery.data
  const indicatorQuery = useIndicator(chart.indicatorId)
  const indicator = indicatorQuery.data
  const definition = getChartDefinitionForConfiguration(chart)
  const dataRequirements = definition?.getDataRequirements(chart)
  const productOutputsQuery = useProductOutputsExport(chart.productRunId, {
    indicatorId: dataRequirements?.productOutputQuery?.indicatorId,
    geometryOutputId: dataRequirements?.productOutputQuery?.geometryOutputId,
    timePoint: dataRequirements?.productOutputQuery?.timePoint,
  })
  const productOutputs = productOutputsQuery.data
  const chartProductOutputs = productOutputs?.data ?? []
  const timeChangeMode = getChartTimeChangeMode(chart)
  const transformedProductOutputs = applyChartTimeChangeTransform(
    chartProductOutputs,
    chart,
    {
      groupKeys: ['indicatorId', 'geometryOutputId'],
    },
  )
  const renderedProductOutputs = timeChangeMode
    ? filterRecordsForTimePoint(transformedProductOutputs, chart.timePoint)
    : chartProductOutputs

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
      productOutputs={renderedProductOutputs}
      zoomToGeometryOutputIds={chart.geometryOutputIds}
      appearance={chart.appearance}
      onSelect={onSelect}
      scrollZoom={scrollZoom}
      className={className}
    />
  )
}
