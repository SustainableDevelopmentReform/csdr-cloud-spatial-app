'use client'

import { getPlotCodeSnippet } from '@repo/plot/Plot'
import { getTablePlotCodeSnippet, TablePlot } from '@repo/plot/TablePlot'
import {
  ChartConfiguration,
  MapChartConfiguration,
  OnSelectCallback,
  PlotChartConfiguration,
  TableChartConfiguration,
} from '@repo/plot/types'
import { ObservableCellsCopy } from '@repo/ui/components/ui/observable-cells-copy'
import { PlotChart } from '@repo/ui/components/ui/plot-chart'
import { cn } from '@repo/ui/lib/utils'
import { useMemo } from 'react'
import GeometriesMapViewer from '../../geometries/_components/geometries-map-viewer'
import { useGeometriesRun } from '../../geometries/_hooks'
import { useIndicator } from '../../indicator/_hooks'
import {
  ProductOutputExportListItem,
  useProductOutputsExport,
  useProductRun,
} from '../../product/_hooks'

const ChartPlaceholder = () => (
  <div className="flex h-full min-h-[240px] items-center justify-center px-4 text-center text-sm text-muted-foreground">
    No chart configured yet. Use the edit button to choose a chart type.
  </div>
)

const UnsupportedChart = ({ type }: { type: string }) => (
  <div className="flex h-full min-h-[240px] items-center justify-center px-4 text-center text-sm text-muted-foreground">
    Chart type <strong className="ml-1 font-semibold">{type}</strong> is not
    supported yet.
  </div>
)

const PlotContainer = ({
  chart,
  config,
  className,
  onSelect,
}: {
  chart: PlotChartConfiguration
  config?: ChartConfig
  className?: string
  onSelect?: OnSelectCallback<ProductOutputExportListItem>
}) => {
  const { data: productOutputs } = useProductOutputsExport(chart.productRunId, {
    indicatorId: chart.indicatorIds,
    geometryOutputId: chart.geometryOutputIds,
    timePoint: chart.timePoints,
  })

  const multipleGeometryOutputs = useMemo(() => {
    let firstGeometryOutputId: string | undefined
    return productOutputs?.data?.some((output: ProductOutputExportListItem) => {
      if (!firstGeometryOutputId) {
        firstGeometryOutputId = output.geometryOutputId
      }
      return output.geometryOutputId !== firstGeometryOutputId
    })
  }, [productOutputs?.data])

  return (
    <div className={cn('flex flex-1 min-h-0 flex-col gap-2', className)}>
      <div
        className={cn(
          'flex-1 min-h-0',
          config?.showSelectedPointDetails &&
            'grid grid-cols-2 grid-rows-1 gap-4',
        )}
      >
        <PlotChart
          data={productOutputs?.data ?? []}
          x={'timePoint'}
          y={'value'}
          groupBy={
            multipleGeometryOutputs ? 'geometryOutputName' : 'indicatorName'
          }
          type={chart.subType}
          onSelect={onSelect}
        />
      </div>
      {config?.showCodeSnippet && (
        <ObservableCellsCopy
          cells={getPlotCodeSnippet({
            data: productOutputs?.data ?? [],
            x: 'timePoint',
            y: 'value',
          })}
        />
      )}
    </div>
  )
}

const MapContainer = ({
  chart,
  config,
  className,
  onSelect,
}: {
  chart: MapChartConfiguration
  config?: ChartConfig
  className?: string
  onSelect?: OnSelectCallback<ProductOutputExportListItem>
}) => {
  const { data: productRun } = useProductRun(chart.productRunId)
  const { data: geometriesRun } = useGeometriesRun(
    productRun?.geometriesRun?.id,
  )

  const { data: indicator } = useIndicator(chart.indicatorId)

  const { data: productOutputs } = useProductOutputsExport(chart.productRunId, {
    indicatorId: chart.indicatorId,
    timePoint: chart.timePoint,
  })

  return (
    <div className={cn('flex flex-col gap-2 h-full', className)}>
      <GeometriesMapViewer
        geometriesRun={geometriesRun}
        indicator={indicator}
        productRun={productRun}
        productOutputs={productOutputs?.data}
        zoomToGeometryOutputIds={chart.geometryOutputIds}
        onSelect={onSelect}
      />
    </div>
  )
}

const TablePlotContainer = ({
  chart,
  config,
  className,
  onSelect,
}: {
  chart: TableChartConfiguration
  config?: ChartConfig
  className?: string
  onSelect?: OnSelectCallback<ProductOutputExportListItem>
}) => {
  const { data: productOutputs } = useProductOutputsExport(chart.productRunId, {
    indicatorId: chart.indicatorIds,
    geometryOutputId: chart.geometryOutputIds,
    timePoint: chart.timePoints,
  })
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <TablePlot
        data={productOutputs?.data ?? []}
        xDimension={chart.xDimension}
        yDimension={chart.yDimension}
        onSelect={onSelect}
      />

      {config?.showCodeSnippet && (
        <ObservableCellsCopy cells={getTablePlotCodeSnippet()} />
      )}
    </div>
  )
}

interface ChartConfig {
  showTitleAndDescription?: boolean
  showCodeSnippet?: boolean
  showSelectedPointDetails?: boolean
}

const ChartDiscriminator = ({
  chart,
  config,
  onSelect,
  className,
}: {
  chart: ChartConfiguration
  config?: ChartConfig
  onSelect?: OnSelectCallback<ProductOutputExportListItem>
  className?: string
}) => {
  switch (chart.type) {
    case 'plot': {
      return (
        <PlotContainer
          chart={chart}
          config={config}
          className={className}
          onSelect={onSelect}
        />
      )
    }
    case 'map': {
      return (
        <MapContainer
          chart={chart}
          config={config}
          className={className}
          onSelect={onSelect}
        />
      )
    }
    case 'table': {
      return (
        <TablePlotContainer
          chart={chart}
          config={config}
          className={className}
          onSelect={onSelect}
        />
      )
    }
    default:
      return <UnsupportedChart type={(chart as { type: string }).type} />
  }
}

export const ChartRenderer = ({
  chart,
  config,
  className,
  onSelect,
}: {
  chart: ChartConfiguration | null
  config?: ChartConfig
  className?: string
  onSelect?: OnSelectCallback<ProductOutputExportListItem>
}) => {
  if (!chart) {
    return <ChartPlaceholder />
  }

  return (
    <div className={cn('flex flex-1 min-h-0 flex-col gap-2 relative p-3')}>
      {config?.showTitleAndDescription &&
        (chart.title || chart.description) && (
          <div className="flex flex-col items-center gap-0.5 pb-1">
            {chart.title && (
              <h3 className="text-base font-semibold leading-tight m-0 text-center">
                {chart.title}
              </h3>
            )}
            {chart.description && (
              <p className="text-xs text-muted-foreground text-center m-0">
                {chart.description}
              </p>
            )}
          </div>
        )}
      <ChartDiscriminator
        chart={chart}
        config={config}
        onSelect={onSelect}
        className={className}
      />
    </div>
  )
}
