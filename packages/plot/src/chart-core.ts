import type {
  AppearanceConfig,
  ChartType,
  PlotGroupBy,
  TableChartDimension,
} from './chart-primitives'
import type {
  ChartConfiguration,
  PlotChartConfiguration,
  PlotSubType,
} from './chart-schemas'

export {
  appearanceConfigSchema,
  baseChartConfigurationSchema,
  categoricalColorSchemeValues,
  chartDataDimensionValues,
  curveTypeValues,
  datePrecisionValues,
  divergingColorSchemeValues,
  legendPositionValues,
  sequentialColorSchemeValues,
  tableChartDimensionMetadata,
  tableChartDimensionValues,
} from './chart-primitives'
export type {
  AppearanceConfig,
  BaseChartConfiguration,
  CategoricalColorScheme,
  ChartDataDimension,
  ChartType,
  CurveType,
  DatePrecision,
  DivergingColorScheme,
  LegendPosition,
  PlotGroupBy,
  SequentialColorScheme,
  TableChartDimension,
} from './chart-primitives'
export {
  chartConfigurationSchema,
  kpiChartConfigurationSchema,
  mapChartConfigurationSchema,
  plotChartConfigurationSchema,
  plotSubTypeValues,
  tableChartConfigurationSchema,
} from './chart-schemas'
export type {
  ChartConfiguration,
  KpiChartConfiguration,
  MapChartConfiguration,
  PlotChartConfiguration,
  PlotSubType,
  TableChartConfiguration,
} from './chart-schemas'
export { getSuggestedChartTitle } from './chart-title'
export type { ChartTitleGeometry, ChartTitleIndicator } from './chart-title'

export type ChartIndicatorSelection = {
  productRunId: string
  indicatorIds: string[]
}

export type ChartConfigurationDraft = Partial<{
  productId: string
  productRunId: string
  type: ChartType
  subType: PlotSubType
  indicatorId: string | null
  indicatorIds: string[]
  geometryOutputIds: string[]
  timePoint: string | null
  timePoints: string[]
  xDimension: TableChartDimension
  yDimension: TableChartDimension
  title: string
  description: string
  appearance: AppearanceConfig
}>

export function getChartConfigKey(
  values: Pick<ChartConfigurationDraft, 'type' | 'subType'>,
): string | null {
  if (values.type === 'plot') return values.subType ?? null
  if (values.type === 'map') return 'map'
  if (values.type === 'table') return 'table'
  if (values.type === 'kpi') return 'kpi'
  return null
}

export function getPlotChartGroupBy({
  geometryOutputIds,
  indicatorIds,
  timePoints,
}: Pick<
  PlotChartConfiguration,
  'geometryOutputIds' | 'indicatorIds' | 'timePoints'
>): PlotGroupBy {
  const geoMulti = !geometryOutputIds || geometryOutputIds.length > 1
  const indMulti = !indicatorIds || indicatorIds.length > 1
  const timeMulti = !timePoints || timePoints.length > 1

  if (geoMulti) return 'geometryOutputName'
  if (indMulti) return 'indicatorName'
  if (timeMulti) return 'timePoint'
  return 'indicatorName'
}

export function getChartSeriesGroupBy(
  values: Pick<
    ChartConfigurationDraft,
    'type' | 'subType' | 'geometryOutputIds' | 'indicatorIds' | 'timePoints'
  >,
): PlotGroupBy | null {
  if (values.type !== 'plot') return null
  return getPlotChartGroupBy({
    geometryOutputIds: values.geometryOutputIds,
    indicatorIds: values.indicatorIds ?? [],
    timePoints: values.timePoints,
  })
}

const dedupeIndicatorIds = (indicatorIds: string[]): string[] =>
  Array.from(new Set(indicatorIds))

export function extractChartIndicatorSelection(
  chart: ChartConfiguration,
): ChartIndicatorSelection {
  if (chart.type === 'plot' || chart.type === 'table') {
    return {
      productRunId: chart.productRunId,
      indicatorIds: dedupeIndicatorIds(chart.indicatorIds),
    }
  }

  return {
    productRunId: chart.productRunId,
    indicatorIds: [chart.indicatorId],
  }
}
