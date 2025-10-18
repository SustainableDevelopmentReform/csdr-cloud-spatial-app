'use client'

import { getLinePlotCodeSnippet, LinePlot } from '@repo/plot/LinePlot'
import {
  ChartConfiguration,
  MapChartConfiguration,
  PlotChartConfiguration,
  TableChartConfiguration,
} from '@repo/plot/types'
import { getTablePlotCodeSnippet, TablePlot } from '@repo/plot/TablePlot'
import { ObservableCellsCopy } from '@repo/ui/components/ui/observable-cells-copy'
import { cn } from '@repo/ui/lib/utils'
import { useState } from 'react'
import { EmptyCard } from '../../_components/empty-card'
import GeometriesMapViewer from '../../geometries/_components/geometries-map-viewer'
import { useGeometriesRun } from '../../geometries/_hooks'
import { ProductOutputDependenciesCard } from '../../products/_components/product-output-dependencies-card'
import { ProductOutputSummaryCard } from '../../products/_components/product-output-summary-card'
import {
  useProductOutput,
  useProductOutputsExport,
  useProductRun,
} from '../../products/_hooks'
import { useVariable } from '../../variables/_hooks'

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

const SelectedPointDetails = ({
  productOutputId,
}: {
  productOutputId: string | undefined | null
}) => {
  const { data: productOutput } = useProductOutput(productOutputId ?? undefined)
  return (
    <div className="flex flex-col gap-4 h-full">
      {productOutput ? (
        <>
          <ProductOutputSummaryCard productOutput={productOutput} showLink />
          <ProductOutputDependenciesCard
            productOutput={productOutput}
            showProduct
            showProductRun
          />
        </>
      ) : (
        <EmptyCard description="Click on a data point to see the details" />
      )}
    </div>
  )
}

const LinePlotContainer = ({
  chart,
  config,
}: {
  chart: PlotChartConfiguration
  config?: ChartConfig
}) => {
  const [selectedProductOutputId, setSelectedProductOutputId] = useState<
    string | undefined | null
  >(null)
  const { data: productOutputs } = useProductOutputsExport(chart.productRunId, {
    variableId: chart.variableIds,
    geometryOutputId: chart.geometryOutputIds,
  })
  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          config?.showSelectedPointDetails &&
            'grid grid-cols-2 grid-rows-1 gap-4',
        )}
      >
        <LinePlot
          data={productOutputs?.data ?? []}
          x={'timePoint'}
          y={'value'}
          groupBy={
            (chart.geometryOutputIds?.length ?? 0) > 1
              ? 'geometryOutputName'
              : 'variableName'
          }
          type={chart.subType}
          onSelect={(dataPoint) =>
            setSelectedProductOutputId(dataPoint?.id ?? null)
          }
        />
        {config?.showSelectedPointDetails && (
          <SelectedPointDetails productOutputId={selectedProductOutputId} />
        )}
      </div>
      {config?.showCodeSnippet && (
        <ObservableCellsCopy
          cells={getLinePlotCodeSnippet({
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
}: {
  chart: MapChartConfiguration
  config?: ChartConfig
}) => {
  const { data: productRun } = useProductRun(chart.productRunId)
  const { data: geometriesRun } = useGeometriesRun(productRun?.geometriesRun.id)
  const { data: variable } = useVariable(chart.variableId)
  const { data: productOutputs } = useProductOutputsExport(chart.productRunId, {
    variableId: chart.variableId,
    timePoint: chart.timePoint,
  })
  const [selectedProductOutputId, setSelectedProductOutputId] = useState<
    string | undefined | null
  >(null)
  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          config?.showSelectedPointDetails &&
            'grid grid-cols-2 grid-rows-1 gap-4',
        )}
      >
        <GeometriesMapViewer
          geometriesRun={geometriesRun}
          variable={variable}
          productRun={productRun}
          productOutputs={productOutputs?.data}
          zoomToGeometryOutputIds={chart.geometryOutputIds}
          onSelect={(dataPoint) =>
            setSelectedProductOutputId(dataPoint?.id ?? null)
          }
        />
        {config?.showSelectedPointDetails && (
          <SelectedPointDetails productOutputId={selectedProductOutputId} />
        )}
      </div>
    </div>
  )
}

const TablePlotContainer = ({
  chart,
  config,
}: {
  chart: TableChartConfiguration
  config?: ChartConfig
}) => {
  const [selectedProductOutputId, setSelectedProductOutputId] = useState<
    string | undefined | null
  >(null)
  const { data: productOutputs } = useProductOutputsExport(chart.productRunId, {
    variableId: chart.variableIds,
    geometryOutputId: chart.geometryOutputIds,
    timePoint: chart.timePoint,
  })
  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          config?.showSelectedPointDetails &&
            'grid grid-cols-2 grid-rows-1 gap-4',
        )}
      >
        <TablePlot
          data={productOutputs?.data ?? []}
          xDimension={chart.xDimension}
          yDimension={chart.yDimension}
          selectedId={selectedProductOutputId ?? undefined}
          onSelect={(record) => setSelectedProductOutputId(record?.id ?? null)}
        />
        {config?.showSelectedPointDetails && (
          <SelectedPointDetails productOutputId={selectedProductOutputId} />
        )}
      </div>
      {config?.showCodeSnippet && (
        <ObservableCellsCopy cells={getTablePlotCodeSnippet()} />
      )}
    </div>
  )
}

interface ChartConfig {
  showCodeSnippet: boolean
  showSelectedPointDetails: boolean
}

export const ChartRenderer = ({
  chart,
  config,
}: {
  chart: ChartConfiguration | null
  config?: ChartConfig
}) => {
  if (!chart) {
    return <ChartPlaceholder />
  }

  switch (chart.type) {
    case 'plot': {
      return <LinePlotContainer chart={chart} config={config} />
    }
    case 'map': {
      return <MapContainer chart={chart} config={config} />
    }
    case 'table': {
      return <TablePlotContainer chart={chart} config={config} />
    }
    default:
      return <UnsupportedChart type={(chart as any).type} />
  }
}
