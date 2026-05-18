'use client'

import {
  type AppearanceConfig,
  type MapChartConfiguration,
  type SelectedDataPoint,
  getSuggestedChartTitle,
} from '@repo/plot/types'
import { Button } from '@repo/ui/components/ui/button'
import { toast } from '@repo/ui/components/ui/sonner'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@repo/ui/components/ui/tooltip'
import { Save } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toastError } from '../../../../utils/error-handling'
import { ChartFormDialog } from '../../report/_components/chart-form-dialog'
import { ChartSelectedItem } from '../../report/_components/chart-selected-item'
import { ChartMapRenderer } from '../../report/_components/chart-map-renderer'
import type {
  ProductDetail,
  ProductOutputExportListItem,
  ProductRunDetail,
} from '../_hooks'
import { useUpdateProductRun } from '../_hooks'

type ProductRunForMap = ProductRunDetail | NonNullable<ProductDetail['mainRun']>

const DEFAULT_MAP_APPEARANCE: AppearanceConfig = {
  compactNumbers: true,
  datePrecision: 'year-month',
}

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
  const savedMapConfig = run?.mapConfig
  if (run && savedMapConfig?.productRunId === run.id) {
    return savedMapConfig
  }

  const firstIndicator = run?.outputSummary?.indicators.find(
    (summary) => !!summary.indicator?.id,
  )?.indicator
  const latestTimePoint = getLatestTimePoint(
    run?.outputSummary?.timePoints ?? null,
  )

  if (!run?.geometriesRun?.id || !firstIndicator?.id || !latestTimePoint) {
    return null
  }

  const chart: MapChartConfiguration = {
    type: 'map',
    productRunId: run.id,
    indicatorId: firstIndicator.id,
    timePoint: latestTimePoint,
    appearance: DEFAULT_MAP_APPEARANCE,
  }

  return {
    ...chart,
    title: getMapGeneratedTitle(run, chart),
  }
}

function getMapGeneratedTitle(
  run: ProductRunForMap | null | undefined,
  chart: MapChartConfiguration,
) {
  const indicatorName = run?.outputSummary?.indicators.find(
    (summary) => summary.indicator?.id === chart.indicatorId,
  )?.indicator?.name
  return getSuggestedChartTitle({
    strategy: 'map',
    productName: null,
    values: chart,
    seriesDimension: 'indicators',
    indicators: [{ id: chart.indicatorId, name: indicatorName }],
    geometries: [],
    availableTimePoints: run?.outputSummary?.timePoints ?? undefined,
    datePrecision:
      chart.appearance?.datePrecision ?? DEFAULT_MAP_APPEARANCE.datePrecision,
  })
}

function normalizeGeneratedTitle(title: string | null | undefined) {
  return title?.trim().replace(/\s+[—-]\s+/g, ' - ') ?? ''
}

function isGeneratedMapTitle(
  run: ProductRunForMap | null | undefined,
  chart: MapChartConfiguration,
  title: string | null | undefined,
) {
  const normalizedTitle = normalizeGeneratedTitle(title)
  return (
    normalizedTitle !== '' &&
    normalizedTitle ===
      normalizeGeneratedTitle(getMapGeneratedTitle(run, chart))
  )
}

function getMapDisplayTitle(
  run: ProductRunForMap | null | undefined,
  chart: MapChartConfiguration,
) {
  return chart.title?.trim() || getMapGeneratedTitle(run, chart)
}

const ProductRunMapPreviewContent = ({
  canEdit,
  defaultChart,
  run,
}: {
  canEdit: boolean
  defaultChart: MapChartConfiguration
  run: ProductRunForMap
}) => {
  const updateProductRun = useUpdateProductRun(run.id)
  const [chart, setChart] = useState<MapChartConfiguration>(defaultChart)
  const [selectedDataPoint, setSelectedDataPoint] =
    useState<SelectedDataPoint<ProductOutputExportListItem> | null>(null)
  const displayTitle = getMapDisplayTitle(run, chart)

  useEffect(() => {
    setChart(defaultChart)
    setSelectedDataPoint(null)
  }, [defaultChart])

  const selectDataPoint = useCallback(
    (selection: SelectedDataPoint<ProductOutputExportListItem>) => {
      setSelectedDataPoint(selection.dataPoint ? selection : null)
    },
    [],
  )
  const saveDefaultMapConfig = useCallback(() => {
    updateProductRun.mutate(
      { mapConfig: chart },
      {
        onError: (error) =>
          toastError(error, 'Failed to save default map configuration'),
        onSuccess: () => toast.success('Default map configuration saved'),
      },
    )
  }, [chart, updateProductRun])

  return (
    <div className="relative h-96 w-full overflow-hidden rounded-lg">
      <ChartMapRenderer
        chart={chart}
        className="h-full"
        onSelect={selectDataPoint}
      />
      <ChartSelectedItem
        selectedDataPoint={selectedDataPoint}
        onSelect={setSelectedDataPoint}
      />
      <div className="pointer-events-none absolute left-3 right-3 top-3 z-20 flex items-start justify-between gap-3">
        {displayTitle && (
          <h3 className="m-0 min-w-0 w-fit max-w-[calc(100%-18rem)] rounded-md border border-border bg-background/90 px-3 py-2 text-sm font-semibold leading-tight text-foreground shadow-sm backdrop-blur">
            {displayTitle}
          </h3>
        )}
        <div className="pointer-events-auto ml-auto flex shrink-0 items-center gap-2">
          {canEdit ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={updateProductRun.isPending}
                  onClick={saveDefaultMapConfig}
                >
                  <Save className="h-4 w-4" />
                  Save as default
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Saved defaults prefill new map charts for this product run when
                fields are blank.
              </TooltipContent>
            </Tooltip>
          ) : null}
          <ChartFormDialog
            buttonText="Configure map"
            chart={chart}
            enableTimeChange={false}
            firstVisibleStep={2}
            onSubmit={(nextChart) => {
              if (nextChart.type === 'map') {
                const nextGeneratedTitle = getMapGeneratedTitle(run, nextChart)
                const submittedTitle = nextChart.title?.trim()
                const shouldUseGeneratedTitle =
                  !submittedTitle ||
                  (isGeneratedMapTitle(run, chart, chart.title) &&
                    isGeneratedMapTitle(run, chart, submittedTitle))
                const title = shouldUseGeneratedTitle
                  ? nextGeneratedTitle
                  : submittedTitle

                setChart({
                  ...nextChart,
                  title: title || undefined,
                })
                setSelectedDataPoint(null)
              }
            }}
          />
        </div>
      </div>
    </div>
  )
}

export const ProductRunMapPreview = ({
  canEdit = false,
  run,
}: {
  canEdit?: boolean
  run?: ProductRunForMap | null
}) => {
  const defaultChart = useMemo(() => getDefaultMapChart(run), [run])

  if (!run || !defaultChart) return null

  return (
    <ProductRunMapPreviewContent
      key={`${defaultChart.productRunId}:${defaultChart.indicatorId}:${defaultChart.timePoint}:${run.updatedAt}`}
      canEdit={canEdit}
      defaultChart={defaultChart}
      run={run}
    />
  )
}
