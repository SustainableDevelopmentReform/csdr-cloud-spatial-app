import { z } from '@hono/zod-openapi'
import { values } from '@repo/plot/chart-primitives'
import {
  areaChartConfigurationSchema,
  areaPlotSchemaContract,
  areaSubType,
} from '@repo/plot/chart-definitions/area.schema'
import {
  donutChartConfigurationSchema,
  donutPlotSchemaContract,
  donutSubType,
} from '@repo/plot/chart-definitions/donut.schema'
import {
  dotChartConfigurationSchema,
  dotPlotSchemaContract,
  dotSubType,
} from '@repo/plot/chart-definitions/dot.schema'
import {
  groupedBarChartConfigurationSchema,
  groupedBarPlotSchemaContract,
  groupedBarSubType,
} from '@repo/plot/chart-definitions/grouped-bar.schema'
import { kpiChartConfigurationSchema } from '@repo/plot/chart-definitions/kpi.schema'
import {
  lineChartConfigurationSchema,
  linePlotSchemaContract,
  lineSubType,
} from '@repo/plot/chart-definitions/line.schema'
import { mapChartConfigurationSchema } from '@repo/plot/chart-definitions/map.schema'
import {
  rankedBarChartConfigurationSchema,
  rankedBarPlotSchemaContract,
  rankedBarSubType,
} from '@repo/plot/chart-definitions/ranked-bar.schema'
import {
  sampleChartConfigurationSchema,
  samplePlotSchemaContract,
  sampleSubType,
} from '@repo/plot/chart-definitions/sample.schema'
import {
  stackedAreaChartConfigurationSchema,
  stackedAreaPlotSchemaContract,
  stackedAreaSubType,
} from '@repo/plot/chart-definitions/stacked-area.schema'
import {
  stackedBarChartConfigurationSchema,
  stackedBarPlotSchemaContract,
  stackedBarSubType,
} from '@repo/plot/chart-definitions/stacked-bar.schema'
import { tableChartConfigurationSchema } from '@repo/plot/chart-definitions/table.schema'
import { createUnifiedPlotConfigurationSchema } from '@repo/plot/chart-definitions/schema-helpers'

export {
  areaChartConfigurationSchema,
  donutChartConfigurationSchema,
  dotChartConfigurationSchema,
  groupedBarChartConfigurationSchema,
  kpiChartConfigurationSchema,
  lineChartConfigurationSchema,
  mapChartConfigurationSchema,
  rankedBarChartConfigurationSchema,
  sampleChartConfigurationSchema,
  stackedAreaChartConfigurationSchema,
  stackedBarChartConfigurationSchema,
  tableChartConfigurationSchema,
}

export const plotSubTypeValues = values(
  lineSubType,
  areaSubType,
  stackedAreaSubType,
  stackedBarSubType,
  groupedBarSubType,
  rankedBarSubType,
  dotSubType,
  donutSubType,
  sampleSubType,
)

export type PlotSubType = (typeof plotSubTypeValues)[number]

export const plotChartConfigurationSchema =
  createUnifiedPlotConfigurationSchema({
    subTypes: plotSubTypeValues,
    validationModes: [
      linePlotSchemaContract,
      areaPlotSchemaContract,
      stackedAreaPlotSchemaContract,
      stackedBarPlotSchemaContract,
      groupedBarPlotSchemaContract,
      rankedBarPlotSchemaContract,
      dotPlotSchemaContract,
      donutPlotSchemaContract,
      samplePlotSchemaContract,
    ],
  })

export type PlotChartConfiguration = z.infer<
  typeof plotChartConfigurationSchema
>
export type MapChartConfiguration = z.infer<typeof mapChartConfigurationSchema>
export type KpiChartConfiguration = z.infer<typeof kpiChartConfigurationSchema>
export type TableChartConfiguration = z.infer<
  typeof tableChartConfigurationSchema
>

export const chartConfigurationSchema = z
  .discriminatedUnion('type', [
    plotChartConfigurationSchema,
    mapChartConfigurationSchema,
    kpiChartConfigurationSchema,
    tableChartConfigurationSchema,
  ])
  .openapi('ChartConfigurationSchema', {
    description:
      'Persisted chart configuration used by report chart nodes and dashboard cards.',
  })

export type ChartConfiguration = z.infer<typeof chartConfigurationSchema>
