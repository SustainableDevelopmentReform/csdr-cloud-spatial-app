import type { ComponentType, ReactNode } from 'react'
import type { ZodType } from 'zod'
import type {
  tableChartDimensionMetadata,
  AppearanceConfig,
  ChartConfiguration,
  ChartConfigurationDraft,
  ChartDataDimension,
  ChartType,
  PlotSubType,
  TableChartDimension,
} from '../chart-core'
import type { SuggestedChartTitleContext } from '../chart-title'
import type { OnSelectCallback } from '../types'

export function tuple<const TValue extends readonly [unknown, ...unknown[]]>(
  ...items: TValue
) {
  return items
}

export type ChartDimensionMode = 'single' | 'multi' | 'optionalMulti'
export type ChartDimensionModes = Record<ChartDataDimension, ChartDimensionMode>
export type ChartAppearanceControl =
  | 'categoricalPalette'
  | 'continuousScale'
  | 'legend'
  | 'mapOptions'
  | 'cartesianOptions'
  | 'lineOptions'
  | 'areaOptions'
  | 'groupedBarOptions'
  | 'donutOptions'
  | 'formatting'
  | 'colorOverrides'

export type ChartProductOutput = {
  id: string
  value: number
  timePoint: Date | string
  indicatorName: string | null | undefined
  geometryOutputName: string | null | undefined
  [key: string]: unknown
}

export type ChartProductOutputQuery = {
  indicatorId?: string | string[]
  geometryOutputId?: string | string[]
  timePoint?: string | string[]
}

export type ChartIcon = ComponentType<{ className?: string }>

/**
 * Data needed by the web adapter before a chart renderer can run.
 *
 * Chart definitions declare requirements; the host app still owns the actual
 * React Query hooks and passes loaded rows into the renderer.
 */
export type ChartDataRequirements = {
  productRunId: string
  productOutputQuery: ChartProductOutputQuery | null
  indicatorId?: string
  loadingMessage: string
  unavailableMessage: string
}

/**
 * Optional state for a chart-type picker entry.
 *
 * Use this for product-dependent guidance such as "works best with multiple
 * time points" without adding boolean strategy flags to chart definitions.
 */
export type ChartTypeOptionState = {
  disabled: boolean
  reason?: string
}

export type ChartTypeOptionContext = {
  timePointCount: number | null
}

export type ChartRenderOptions = {
  showCodeSnippet?: boolean
  showSelectedPointDetails?: boolean
  mapScrollZoom?: boolean
}

export interface ChartRenderAdapters<
  TProductOutput extends ChartProductOutput,
> {
  renderObservableCellsCopy?(_cells: string[]): ReactNode
  renderMap?(_context: ChartRenderContext<TProductOutput>): ReactNode
}

export type ChartRenderContext<
  TProductOutput extends ChartProductOutput = ChartProductOutput,
> = {
  chart: ChartConfiguration
  productRun: unknown | null
  productSummary?: unknown | null
  productOutputs: TProductOutput[]
  geometryOutputs?: unknown[]
  indicator?: unknown | null
  appearance?: AppearanceConfig
  className?: string
  onSelect?: OnSelectCallback<TProductOutput>
  options?: ChartRenderOptions
  adapters?: ChartRenderAdapters<TProductOutput>
}

export type ChartDefinition<
  TChart extends ChartConfiguration = ChartConfiguration,
> = {
  /** Stable definition key. For plot charts this must match persisted `subType`. */
  key: string
  /** Persisted top-level chart family discriminator. */
  type: ChartType
  /** Persisted plot subtype. Leave unset for non-plot chart families. */
  subType?: PlotSubType
  /** Human-readable chart type name shown in chart pickers. */
  label: string
  /** Short picker description that explains what the chart is good for. */
  description: string
  /** Icon component rendered directly by host apps; do not use string keys. */
  icon: ChartIcon
  /** Strict persisted JSON parser for this chart's stored configuration. */
  schema: ZodType<TChart>
  /** Builds the automatic title suggestion for this chart type. */
  getSuggestedTitle(_context: SuggestedChartTitleContext): string
  /**
   * Optional chart-picker state derived from product/run context.
   *
   * Return a disabled state with a reason when the chart is still selectable
   * but should be visually de-emphasized in the picker.
   */
  getTypeOptionState?(_context: ChartTypeOptionContext): ChartTypeOptionState
  /**
   * Declares the product run, product-output filter, optional indicator, and
   * loading/error copy needed by the host app before rendering.
   */
  getDataRequirements(_chart: ChartConfiguration): ChartDataRequirements | null
  /** React renderer. It receives loaded data from the host adapter. */
  renderer: {
    render(_context: ChartRenderContext): ReactNode
  }
  /**
   * Generic form selection model.
   *
   * Prefer the helper functions in `definition-helpers.tsx` so chart files do
   * not repeat field-name plumbing.
   */
  selection: {
    /** Field used for indicator selection in the persisted JSON shape. */
    indicatorField: 'indicatorId' | 'indicatorIds'
    /** Field used for time selection in the persisted JSON shape. */
    timeField: 'timePoint' | 'timePoints'
    /** Field used for boundary selection in the persisted JSON shape. */
    geometryField: 'geometryOutputIds'
    /** Series dimension used when the current data does not imply a better one. */
    defaultSeriesDimension: ChartDataDimension
    /** Dimensions the user can compare or slice by for this chart. */
    selectableDimensions: readonly ChartDataDimension[]
    /** Optional table axis options; only table-like charts should set this. */
    tableDimensions?: typeof tableChartDimensionMetadata
    /** Returns single/multi/optional selection modes for the current form state. */
    getDimensionModes(_context: {
      seriesDimension: ChartDataDimension
      xDimension?: TableChartDimension
      yDimension?: TableChartDimension
    }): ChartDimensionModes
  }
  /** Appearance panels that the generic form should expose for this chart. */
  appearanceControls: readonly ChartAppearanceControl[]
  /** Lenient preview builder used while users are still completing the form. */
  buildPreviewConfig(
    _values: ChartConfigurationDraft,
  ): ChartConfiguration | null
}

/**
 * Advanced escape hatch for unusual charts.
 *
 * Prefer `definePlotChart`, `defineTableChart`, `defineMapChart`, or
 * `defineKpiChart` whenever a chart fits an existing family.
 */
export function defineChart<const TDefinition extends ChartDefinition>(
  definition: TDefinition,
) {
  return definition
}

/**
 * Define a normal product-output plot chart.
 *
 * Prefer this helper for line, area, bar, scatter, donut, and similar charts.
 * The persisted chart JSON remains controlled by the chart's `schema`.
 */
export function definePlotChart<const TDefinition extends ChartDefinition>(
  definition: TDefinition,
) {
  return defineChart(definition)
}

/**
 * Define a table chart using the same chart-definition contract as plots.
 */
export function defineTableChart<const TDefinition extends ChartDefinition>(
  definition: TDefinition,
) {
  return defineChart(definition)
}

/**
 * Define a spatial map chart.
 */
export function defineMapChart<const TDefinition extends ChartDefinition>(
  definition: TDefinition,
) {
  return defineChart(definition)
}

/**
 * Define a KPI card chart.
 */
export function defineKpiChart<const TDefinition extends ChartDefinition>(
  definition: TDefinition,
) {
  return defineChart(definition)
}
