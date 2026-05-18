'use client'

import clsx from 'clsx'
import {
  getPlotChartGroupBy,
  applyTimeChangeTransform,
  isTimeChangeMode,
  tableChartDimensionMetadata,
  type ChartConfiguration,
  type ChartConfigurationDraft,
  type ChartDataDimension,
  type PlotSubType,
  type TableChartDimension,
} from '../chart-core'
import { getPlotCodeSnippet } from '../Plot'
import { PlotChart } from '../plot-chart'
import {
  type ChartDefinition,
  type ChartDimensionModes,
  type ChartProductOutput,
  type ChartProductOutputQuery,
  type ChartRenderContext,
  type ChartTypeOptionState,
} from './core'
import type {
  TimeChangeCapability,
  TimeChangeSupportedMode,
} from '../chart-core'

export { supportsTimeChangeTransform } from '../chart-core'

/**
 * Resolve the active persisted time-change mode for a chart.
 *
 * Returns `null` for omitted transforms and explicit raw-value mode.
 */
export function getChartTimeChangeMode(
  chart: ChartConfiguration,
): TimeChangeSupportedMode | null {
  const mode = chart.transform?.timeChange?.mode
  return isTimeChangeMode(mode) ? mode : null
}

/**
 * Apply the persisted time-change transform for a chart.
 *
 * Use this in chart-owned renderers so host apps do not need subtype-specific
 * transform branches. Raw charts return a shallow copy of the input records.
 */
export function applyChartTimeChangeTransform<
  TRecord extends ChartProductOutput,
>(
  records: readonly TRecord[],
  chart: ChartConfiguration,
  options: {
    groupKeys?: readonly string[]
  } = {},
) {
  return applyTimeChangeTransform(records, {
    mode: chart.transform?.timeChange?.mode ?? 'none',
    baseline: chart.transform?.timeChange?.baseline ?? 'firstTimePoint',
    groupKeys: options.groupKeys,
  })
}

/**
 * Return the time-point query filter a chart should use.
 *
 * Single-time charts that render a delta need all time points loaded so they
 * can calculate the previous-step value before filtering back to the selected
 * target time point.
 */
export function getTimePointQueryForTimeChange(
  chart: ChartConfiguration,
  timePoint: string | string[] | undefined,
) {
  return getChartTimeChangeMode(chart) ? undefined : timePoint
}

/**
 * Build the standard preview configuration for product-output plot charts.
 *
 * Use this when the chart stores the normal plot JSON shape and can preview
 * while the form is still partially filled.
 */
export function createPlotPreviewConfig(subType: PlotSubType) {
  return function buildPlotPreviewConfig(
    values: ChartConfigurationDraft,
  ): ChartConfiguration | null {
    if (!values.productRunId) return null

    return {
      type: 'plot',
      subType,
      productRunId: values.productRunId,
      indicatorIds: values.indicatorIds ?? [],
      geometryOutputIds: values.geometryOutputIds,
      timePoints: values.timePoints,
      title: values.title,
      description: values.description,
      appearance: values.appearance,
      transform: values.transform,
    }
  }
}

/**
 * Return the standard product-output query for plot charts.
 */
export function getPlotProductOutputQuery(
  chart: ChartConfiguration,
): ChartProductOutputQuery | null {
  if (chart.type !== 'plot') return null
  return {
    indicatorId: chart.indicatorIds,
    geometryOutputId: chart.geometryOutputIds,
    timePoint: chart.timePoints,
  }
}

/**
 * Build a data requirement function for standard plot charts.
 */
export function createPlotDataRequirements({
  loadingMessage = 'Loading chart...',
  unavailableMessage = 'Chart data is unavailable.',
}: {
  loadingMessage?: string
  unavailableMessage?: string
} = {}) {
  return function getPlotDataRequirements(chart: ChartConfiguration) {
    if (chart.type !== 'plot') return null
    return {
      productRunId: chart.productRunId,
      productOutputQuery: getPlotProductOutputQuery(chart),
      loadingMessage,
      unavailableMessage,
    }
  }
}

/**
 * Build the standard renderer for Recharts-backed product-output plot charts.
 *
 * Pass a chart-owned `timeChange` capability only for definitions that support
 * rendering change values. Unsupported charts ignore persisted transform data.
 */
export function createStandardPlotRenderer({
  timeChange,
}: {
  timeChange?: TimeChangeCapability
} = {}) {
  return function renderStandardPlotChart(context: ChartRenderContext) {
    const { chart, className, options, adapters } = context
    if (chart.type !== 'plot') return null

    const groupBy = getPlotChartGroupBy(chart)
    const requestedTimeChangeMode = getChartTimeChangeMode(chart)
    const timeChangeMode =
      requestedTimeChangeMode &&
      timeChange?.modes.some((mode) => mode === requestedTimeChangeMode)
        ? requestedTimeChangeMode
        : null
    const outputs: ChartProductOutput[] = timeChangeMode
      ? applyChartTimeChangeTransform(context.productOutputs, chart)
      : [...context.productOutputs]

    return (
      <div className={clsx('flex flex-1 min-h-0 flex-col gap-2', className)}>
        <div
          className={clsx(
            'flex flex-col flex-1 min-h-0',
            options?.showSelectedPointDetails &&
              'grid grid-cols-2 grid-rows-1 gap-4',
          )}
        >
          <PlotChart
            data={outputs}
            x="timePoint"
            y="value"
            groupBy={groupBy}
            type={chart.subType}
            appearance={chart.appearance}
            valueFormat={
              timeChangeMode === 'percentDelta' ? 'percent' : 'number'
            }
            onSelect={context.onSelect}
          />
        </div>
        {options?.showCodeSnippet &&
          adapters?.renderObservableCellsCopy?.(
            getPlotCodeSnippet({
              data: outputs,
              x: 'timePoint',
              y: 'value',
            }),
          )}
      </div>
    )
  }
}

/**
 * Selection model for plot charts where time is always available as the x-axis
 * and one extra dimension can be compared as series.
 */
export function createCartesianPlotSelection(
  selectableDimensions: readonly ChartDataDimension[],
): ChartDefinition['selection'] {
  return {
    indicatorField: 'indicatorIds',
    timeField: 'timePoints',
    geometryField: 'geometryOutputIds',
    defaultSeriesDimension: 'indicators',
    selectableDimensions,
    getDimensionModes: ({ seriesDimension }) => ({
      indicators: seriesDimension === 'indicators' ? 'multi' : 'single',
      geometries: seriesDimension === 'geometries' ? 'multi' : 'single',
      time: 'multi',
    }),
  }
}

/**
 * Selection model for single-dimension plots such as donut and ranked bar.
 */
export function createSingleDimensionPlotSelection(
  selectableDimensions: readonly ChartDataDimension[],
): ChartDefinition['selection'] {
  return {
    indicatorField: 'indicatorIds',
    timeField: 'timePoints',
    geometryField: 'geometryOutputIds',
    defaultSeriesDimension: 'indicators',
    selectableDimensions,
    getDimensionModes: ({ seriesDimension }) => ({
      indicators: seriesDimension === 'indicators' ? 'multi' : 'single',
      geometries: seriesDimension === 'geometries' ? 'multi' : 'single',
      time: seriesDimension === 'time' ? 'multi' : 'single',
    }),
  }
}

/**
 * Selection model for table charts.
 */
export function createTableSelection(): ChartDefinition['selection'] {
  return {
    indicatorField: 'indicatorIds',
    timeField: 'timePoints',
    geometryField: 'geometryOutputIds',
    defaultSeriesDimension: 'indicators',
    selectableDimensions: ['indicators', 'geometries', 'time'],
    tableDimensions: tableChartDimensionMetadata,
    getDimensionModes: ({
      xDimension,
      yDimension,
    }: {
      xDimension?: TableChartDimension
      yDimension?: TableChartDimension
    }): ChartDimensionModes => ({
      indicators:
        xDimension === 'indicatorName' || yDimension === 'indicatorName'
          ? 'multi'
          : 'single',
      geometries:
        xDimension === 'geometryOutputName' ||
        yDimension === 'geometryOutputName'
          ? 'multi'
          : 'single',
      time:
        xDimension === 'timePoint' || yDimension === 'timePoint'
          ? 'multi'
          : 'single',
    }),
  }
}

/**
 * Selection model for map charts.
 */
export function createMapSelection(): ChartDefinition['selection'] {
  return {
    indicatorField: 'indicatorId',
    timeField: 'timePoint',
    geometryField: 'geometryOutputIds',
    defaultSeriesDimension: 'indicators',
    selectableDimensions: ['geometries'],
    getDimensionModes: (): ChartDimensionModes => ({
      indicators: 'single',
      geometries: 'optionalMulti',
      time: 'single',
    }),
  }
}

/**
 * Selection model for KPI charts.
 */
export function createKpiSelection(): ChartDefinition['selection'] {
  return {
    indicatorField: 'indicatorId',
    timeField: 'timePoint',
    geometryField: 'geometryOutputIds',
    defaultSeriesDimension: 'indicators',
    selectableDimensions: ['geometries'],
    getDimensionModes: (): ChartDimensionModes => ({
      indicators: 'single',
      geometries: 'single',
      time: 'single',
    }),
  }
}

/**
 * Type-picker state for charts that are most useful with multiple time points.
 */
export function needsMultipleTimePoints({
  timePointCount,
}: {
  timePointCount: number | null
}): ChartTypeOptionState {
  const hasMultiTime = timePointCount !== null && timePointCount > 1
  return {
    disabled: !hasMultiTime,
    reason:
      timePointCount === null
        ? 'Select a product first'
        : 'This product only has one time point — this chart type works best with multiple',
  }
}
