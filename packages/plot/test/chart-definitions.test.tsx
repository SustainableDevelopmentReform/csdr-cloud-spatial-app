import { describe, expect, it } from 'vitest'
import type { ChartConfigurationDraft } from '../src/chart-core'
import { chartConfigurationSchema } from '../src/chart-core'
import {
  buildChartPreviewConfiguration,
  chartDefinitions,
  getChartDefinitionForConfiguration,
  getChartDefinitionForValues,
  getChartDimensionModes,
  toPersistedChartConfiguration,
} from '../src/chart-definitions'
import { sampleChartDefinition } from '../src/chart-template'

const timePoint2024 = '2024-01-01T00:00:00.000Z'
const timePoint2025 = '2025-01-01T00:00:00.000Z'

const basePlotSelections = {
  productRunId: 'run-1',
  indicatorIds: ['indicator-1'],
  geometryOutputIds: ['geometry-1'],
  timePoints: [timePoint2024],
}

const persistedChartSamples = [
  {
    type: 'plot',
    subType: 'line',
    ...basePlotSelections,
    timePoints: [timePoint2024, timePoint2025],
  },
  {
    type: 'plot',
    subType: 'area',
    ...basePlotSelections,
    timePoints: [timePoint2024, timePoint2025],
  },
  {
    type: 'plot',
    subType: 'stacked-area',
    ...basePlotSelections,
    indicatorIds: ['indicator-1', 'indicator-2'],
    timePoints: [timePoint2024, timePoint2025],
  },
  {
    type: 'plot',
    subType: 'stacked-bar',
    ...basePlotSelections,
    geometryOutputIds: ['geometry-1', 'geometry-2'],
    timePoints: [timePoint2024, timePoint2025],
  },
  {
    type: 'plot',
    subType: 'grouped-bar',
    ...basePlotSelections,
    indicatorIds: ['indicator-1', 'indicator-2'],
  },
  {
    type: 'plot',
    subType: 'ranked-bar',
    ...basePlotSelections,
    geometryOutputIds: ['geometry-1', 'geometry-2'],
  },
  {
    type: 'plot',
    subType: 'dot',
    ...basePlotSelections,
    timePoints: [timePoint2024, timePoint2025],
  },
  {
    type: 'plot',
    subType: 'donut',
    ...basePlotSelections,
    indicatorIds: ['indicator-1', 'indicator-2'],
  },
  {
    type: 'map',
    productRunId: 'run-1',
    indicatorId: 'indicator-1',
    timePoint: timePoint2024,
    geometryOutputIds: ['geometry-1'],
  },
  {
    type: 'table',
    ...basePlotSelections,
    indicatorIds: ['indicator-1', 'indicator-2'],
    timePoints: [timePoint2024, timePoint2025],
    xDimension: 'indicatorName',
    yDimension: 'timePoint',
  },
  {
    type: 'kpi',
    productRunId: 'run-1',
    indicatorId: 'indicator-1',
    timePoint: timePoint2024,
    geometryOutputIds: ['geometry-1'],
  },
] satisfies ChartConfigurationDraft[]

describe('chartDefinitions', () => {
  it('has unique production definition keys', () => {
    const keys = chartDefinitions.map((definition) => definition.key)

    expect(new Set(keys).size).toBe(keys.length)
  })

  it('resolves every persisted chart sample to exactly one definition', () => {
    for (const sample of persistedChartSamples) {
      const chart = chartConfigurationSchema.parse(sample)
      const matchingDefinitions = chartDefinitions.filter(
        (definition) =>
          definition.type === chart.type &&
          definition.subType ===
            ('subType' in chart ? chart.subType : undefined),
      )

      expect(matchingDefinitions).toHaveLength(1)
      expect(getChartDefinitionForConfiguration(chart)).toBe(
        matchingDefinitions[0],
      )
    }
  })

  it('emits normalized product-output queries for map and table charts', () => {
    const mapChart = chartConfigurationSchema.parse({
      type: 'map',
      productRunId: 'run-1',
      indicatorId: 'indicator-1',
      timePoint: '2024-01-01T00:00:00Z',
      geometryOutputIds: ['geometry-1'],
    })
    const tableChart = chartConfigurationSchema.parse({
      type: 'table',
      productRunId: 'run-1',
      indicatorIds: ['indicator-1'],
      geometryOutputIds: ['geometry-1'],
      timePoints: ['2024-01-01T00:00:00Z'],
      xDimension: 'indicatorName',
      yDimension: 'timePoint',
    })

    expect(
      getChartDefinitionForConfiguration(mapChart)?.data.getProductOutputsQuery(
        mapChart,
      ),
    ).toEqual({
      indicatorId: 'indicator-1',
      geometryOutputId: ['geometry-1'],
      timePoint: '2024-01-01T00:00:00.000Z',
    })
    expect(
      getChartDefinitionForConfiguration(
        tableChart,
      )?.data.getProductOutputsQuery(tableChart),
    ).toEqual({
      indicatorId: ['indicator-1'],
      geometryOutputId: ['geometry-1'],
      timePoint: ['2024-01-01T00:00:00.000Z'],
    })
  })

  it('keeps selection rules aligned with existing chart behavior', () => {
    const line = getChartDefinitionForValues({ type: 'plot', subType: 'line' })
    const donut = getChartDefinitionForValues({
      type: 'plot',
      subType: 'donut',
    })
    const table = getChartDefinitionForValues({ type: 'table' })
    const map = getChartDefinitionForValues({ type: 'map' })
    const kpi = getChartDefinitionForValues({ type: 'kpi' })

    expect(
      getChartDimensionModes({
        definition: line,
        seriesDimension: 'geometries',
      }),
    ).toEqual({ indicators: 'single', geometries: 'multi', time: 'multi' })
    expect(
      getChartDimensionModes({
        definition: donut,
        seriesDimension: 'time',
      }),
    ).toEqual({ indicators: 'single', geometries: 'single', time: 'multi' })
    expect(
      getChartDimensionModes({
        definition: table,
        seriesDimension: 'indicators',
        xDimension: 'indicatorName',
        yDimension: 'timePoint',
      }),
    ).toEqual({ indicators: 'multi', geometries: 'single', time: 'multi' })
    expect(
      getChartDimensionModes({
        definition: map,
        seriesDimension: 'indicators',
      }),
    ).toEqual({
      indicators: 'single',
      geometries: 'optionalMulti',
      time: 'single',
    })
    expect(
      getChartDimensionModes({
        definition: kpi,
        seriesDimension: 'indicators',
      }),
    ).toEqual({ indicators: 'single', geometries: 'single', time: 'single' })
  })

  it('keeps preview parsing lenient while submit parsing stays strict', () => {
    const invalidForSubmit = {
      type: 'plot',
      subType: 'line',
      productRunId: 'run-1',
      indicatorIds: ['indicator-1', 'indicator-2'],
      geometryOutputIds: ['geometry-1', 'geometry-2'],
      timePoints: [timePoint2024, timePoint2025],
    } satisfies ChartConfigurationDraft

    expect(buildChartPreviewConfiguration(invalidForSubmit)).toMatchObject({
      type: 'plot',
      subType: 'line',
      productRunId: 'run-1',
    })
    expect(() => toPersistedChartConfiguration(invalidForSubmit)).toThrow()
  })

  it('typechecks the sample chart template without adding it to production definitions', () => {
    expect(sampleChartDefinition.key).toBe('sample')
    expect(
      chartDefinitions.some(
        (definition) => definition.key === sampleChartDefinition.key,
      ),
    ).toBe(false)
  })

  it('keeps the sample chart template executable outside the production manifest', () => {
    const sampleInput = {
      type: 'plot',
      subType: 'sample',
      productRunId: 'run-1',
      indicatorIds: ['indicator-1'],
      geometryOutputIds: ['geometry-1'],
      timePoints: [timePoint2024],
      sampleOption: 'example',
    } satisfies ChartConfigurationDraft
    const sampleChart = sampleChartDefinition.schema.parse(sampleInput)

    expect(chartConfigurationSchema.parse(sampleInput)).toMatchObject({
      type: 'plot',
      subType: 'sample',
    })
    expect(getChartDefinitionForConfiguration(sampleChart)).toBeNull()
    expect(
      sampleChartDefinition.data.getProductOutputsQuery(sampleChart),
    ).toEqual({
      indicatorId: ['indicator-1'],
      geometryOutputId: ['geometry-1'],
      timePoint: [timePoint2024],
    })
    expect(
      sampleChartDefinition.buildPreviewConfig({
        type: 'plot',
        subType: 'sample',
        productRunId: 'run-1',
        indicatorIds: ['indicator-1'],
        geometryOutputIds: ['geometry-1'],
        timePoints: [timePoint2024],
      }),
    ).toMatchObject({
      type: 'plot',
      subType: 'sample',
      productRunId: 'run-1',
    })
    expect(
      sampleChartDefinition.renderer.render({
        chart: sampleChart,
        productRun: null,
        productOutputs: [],
      }),
    ).not.toBeNull()
  })
})
