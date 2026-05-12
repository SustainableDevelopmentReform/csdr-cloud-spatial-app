import type { ReactNode } from 'react'
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
import type { OnSelectCallback } from '../types'

export function tuple<const TValue extends readonly [unknown, ...unknown[]]>(
  ...items: TValue
) {
  return items
}

export type ChartIconKey =
  | 'line'
  | 'area'
  | 'layers'
  | 'stacked-bar'
  | 'grouped-bar'
  | 'ranked-bar'
  | 'dot'
  | 'donut'
  | 'table'
  | 'map'
  | 'kpi'

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
  key: string
  type: ChartType
  subType?: PlotSubType
  label: string
  description: string
  icon: ChartIconKey
  requiresMultiTime?: boolean
  schema: ZodType<TChart>
  titleStrategy: 'plot' | 'map' | 'product' | 'table'
  renderer: {
    render(_context: ChartRenderContext): ReactNode
  }
  data: {
    loadingMessage: string
    unavailableMessage: string
    requiresProductRun: boolean
    requiresIndicator: boolean
    getProductOutputsQuery(
      _chart: ChartConfiguration,
    ): ChartProductOutputQuery | null
  }
  selection: {
    indicatorField: 'indicatorId' | 'indicatorIds'
    timeField: 'timePoint' | 'timePoints'
    geometryField: 'geometryOutputIds'
    defaultSeriesDimension: ChartDataDimension
    selectableDimensions: readonly ChartDataDimension[]
    tableDimensions?: typeof tableChartDimensionMetadata
    getDimensionModes(_context: {
      seriesDimension: ChartDataDimension
      xDimension?: TableChartDimension
      yDimension?: TableChartDimension
    }): ChartDimensionModes
  }
  appearanceControls: readonly ChartAppearanceControl[]
  buildPreviewConfig(
    _values: ChartConfigurationDraft,
  ): ChartConfiguration | null
}

export function defineChart<const TDefinition extends ChartDefinition>(
  definition: TDefinition,
) {
  return definition
}
