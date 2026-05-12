'use client'

import type { ChartConfiguration, OnSelectCallback } from '@repo/plot/types'
import {
  type ChartProductOutput,
  getChartDefinitionForConfiguration,
} from '@repo/plot/chart-definitions'
import { ObservableCellsCopy } from '@repo/ui/components/ui/observable-cells-copy'
import { cn } from '@repo/ui/lib/utils'
import { usePrintRenderReadiness } from '~/components/print-readiness'
import ChoroplethMapViewer from '../../geometries/_components/choropleth-map-viewer'
import { useIndicator } from '../../indicator/_hooks'
import {
  ProductOutputExportListItem,
  useProductOutputsExport,
  useProductRun,
} from '../../product/_hooks'

const ChartPlaceholder = ({ readOnly }: { readOnly: boolean }) => (
  <div className="flex h-full min-h-[240px] items-center justify-center px-4 text-center text-sm text-muted-foreground">
    {readOnly
      ? 'No chart configured.'
      : 'No chart configured yet. Use the edit button to choose a chart type.'}
  </div>
)

const UnsupportedChart = ({ type }: { type: string }) => (
  <div className="flex h-full min-h-[240px] items-center justify-center px-4 text-center text-sm text-muted-foreground">
    Chart type <strong className="ml-1 font-semibold">{type}</strong> is not
    supported yet.
  </div>
)

const LoadingChart = ({
  message,
  className,
}: {
  message: string
  className?: string
}) => (
  <div
    className={cn(
      'flex h-full min-h-[240px] items-center justify-center px-4 text-center text-sm text-muted-foreground',
      className,
    )}
  >
    {message}
  </div>
)

const UnavailableChart = ({
  message,
  className,
}: {
  message: string
  className?: string
}) => (
  <div
    className={cn(
      'flex h-full min-h-[240px] items-center justify-center px-4 text-center text-sm text-muted-foreground',
      className,
    )}
  >
    {message}
  </div>
)

interface ChartConfig {
  showTitleAndDescription?: boolean
  showCodeSnippet?: boolean
  showSelectedPointDetails?: boolean
  readOnly?: boolean
  mapScrollZoom?: boolean
}

function getIndicatorId(chart: ChartConfiguration) {
  return 'indicatorId' in chart ? chart.indicatorId : undefined
}

const ChartDataRenderer = ({
  chart,
  config,
  className,
  onSelect,
}: {
  chart: ChartConfiguration
  config?: ChartConfig
  className?: string
  onSelect?: OnSelectCallback<ProductOutputExportListItem>
}) => {
  const definition = getChartDefinitionForConfiguration(chart)

  const productRunQuery = useProductRun(
    chart.productRunId,
    definition?.data.requiresProductRun === true,
  )
  const productRun = productRunQuery.data
  const productOutputsQuery = useProductOutputsExport(
    chart.productRunId,
    definition?.data.getProductOutputsQuery(chart) ?? undefined,
    false,
  )
  const productOutputs = productOutputsQuery.data?.data ?? []
  const chartProductOutputs: ChartProductOutput[] = productOutputs.map(
    (output) => ({
      ...output,
      id: output.id,
      value: output.value,
      timePoint: output.timePoint,
      indicatorName: output.indicatorName,
      geometryOutputName: output.geometryOutputName,
    }),
  )
  const indicatorQuery = useIndicator(
    definition?.data.requiresIndicator ? getIndicatorId(chart) : undefined,
  )
  const indicator = indicatorQuery.data
  const handleChartSelect: OnSelectCallback<ChartProductOutput> = ({
    dataPoint,
    event,
  }) => {
    if (!onSelect) return
    const selectedOutput = dataPoint
      ? (productOutputs.find((output) => output.id === dataPoint.id) ?? null)
      : null
    onSelect({ dataPoint: selectedOutput, event })
  }

  const isLoading =
    productRunQuery.isPending ||
    productRunQuery.isFetching ||
    productOutputsQuery.isPending ||
    productOutputsQuery.isFetching ||
    (definition?.data.requiresIndicator === true &&
      (indicatorQuery.isPending || indicatorQuery.isFetching))

  usePrintRenderReadiness({
    isReady: !isLoading,
  })

  if (!definition) {
    return <UnsupportedChart type={chart.type} />
  }

  if (isLoading) {
    return (
      <LoadingChart
        message={definition.data.loadingMessage}
        className={className}
      />
    )
  }

  if (definition.data.requiresProductRun && !productRun) {
    return (
      <UnavailableChart
        message={definition.data.unavailableMessage}
        className={className}
      />
    )
  }

  return (
    <>
      {definition.renderer.render({
        chart,
        productRun,
        productSummary: productRun?.outputSummary ?? null,
        productOutputs: chartProductOutputs,
        appearance: chart.appearance,
        indicator,
        className,
        onSelect: handleChartSelect,
        options: {
          showCodeSnippet: config?.showCodeSnippet,
          showSelectedPointDetails: config?.showSelectedPointDetails,
          mapScrollZoom: config?.mapScrollZoom,
        },
        adapters: {
          renderObservableCellsCopy: (cells) => (
            <ObservableCellsCopy cells={cells} />
          ),
          renderMap: () => {
            if (chart.type !== 'map' || !productRun?.geometriesRun) {
              return (
                <UnavailableChart
                  message={definition.data.unavailableMessage}
                  className={className}
                />
              )
            }

            return (
              <ChoroplethMapViewer
                geometriesRun={productRun.geometriesRun}
                indicator={indicator}
                productRun={productRun}
                productOutputs={productOutputs}
                zoomToGeometryOutputIds={chart.geometryOutputIds}
                appearance={chart.appearance}
                onSelect={onSelect}
                scrollZoom={config?.mapScrollZoom}
                className={className}
              />
            )
          },
        },
      })}
    </>
  )
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
    return <ChartPlaceholder readOnly={config?.readOnly === true} />
  }

  return (
    <div className={cn('flex flex-1 min-h-0 flex-col gap-2 relative p-1')}>
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
      <ChartDataRenderer
        chart={chart}
        config={config}
        onSelect={onSelect}
        className={className}
      />
    </div>
  )
}
