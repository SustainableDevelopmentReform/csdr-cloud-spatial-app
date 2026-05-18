import { Children, isValidElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import type { ChartConfigurationDraft } from '../src/chart-core'
import { chartConfigurationSchema } from '../src/chart-core'
import {
  buildChartPreviewConfiguration,
  chartDefinitions,
  getChartDefinition,
  getChartDefinitionForConfiguration,
  getChartDefinitionForValues,
  getChartDefinitions,
  getChartDimensionModes,
  getChartEstimatedSeriesCount,
  getChartSeriesEntries,
  getSeriesDimensionLabel,
  inferChartSeriesDimension,
  resolveSeriesDimension,
  suggestTitleForDefinition,
  supportsSeriesDimension,
  toPersistedChartConfiguration,
} from '../src/chart-definitions'
import { sampleChartDefinition } from '../src/chart-template'

const timePoint2024 = '2024-01-01T00:00:00.000Z'
const timePoint2025 = '2025-01-01T00:00:00.000Z'

function extractReactText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') {
    return ''
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node)
  }
  if (Array.isArray(node)) {
    return node.map(extractReactText).join('')
  }
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return extractReactText(node.props.children)
  }
  return Children.toArray(node).map(extractReactText).join('')
}

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
    const kpiChart = chartConfigurationSchema.parse({
      type: 'kpi',
      productRunId: 'run-1',
      indicatorId: 'indicator-1',
      timePoint: '2024-01-01T00:00:00Z',
      geometryOutputIds: ['geometry-1'],
    })

    expect(
      getChartDefinitionForConfiguration(mapChart)?.getDataRequirements(
        mapChart,
      )?.productOutputQuery,
    ).toEqual({
      indicatorId: 'indicator-1',
      geometryOutputId: ['geometry-1'],
      timePoint: '2024-01-01T00:00:00.000Z',
    })
    expect(
      getChartDefinitionForConfiguration(tableChart)?.getDataRequirements(
        tableChart,
      )?.productOutputQuery,
    ).toEqual({
      indicatorId: ['indicator-1'],
      geometryOutputId: ['geometry-1'],
      timePoint: ['2024-01-01T00:00:00.000Z'],
    })
    expect(
      getChartDefinitionForConfiguration(kpiChart)?.getDataRequirements(
        kpiChart,
      )?.indicatorId,
    ).toBe('indicator-1')
  })

  it('emits product-output queries for every production chart definition', () => {
    for (const sample of persistedChartSamples) {
      const chart = chartConfigurationSchema.parse(sample)
      const definition = getChartDefinitionForConfiguration(chart)

      if (!definition) {
        throw new Error(`Missing definition for ${JSON.stringify(sample)}`)
      }

      const query = definition.getDataRequirements(chart)?.productOutputQuery

      if (!query) {
        throw new Error(`Missing query for ${definition.key}`)
      }

      if (chart.type === 'plot' || chart.type === 'table') {
        expect(query).toEqual({
          indicatorId: chart.indicatorIds,
          geometryOutputId: chart.geometryOutputIds,
          timePoint: chart.timePoints,
        })
      } else if (chart.type === 'map') {
        expect(query).toEqual({
          indicatorId: chart.indicatorId,
          geometryOutputId: chart.geometryOutputIds,
          timePoint: chart.timePoint,
        })
      } else {
        expect(query).toEqual({
          indicatorId: chart.indicatorId,
          geometryOutputId: chart.geometryOutputIds[0],
          timePoint: chart.timePoint,
        })
      }
    }
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

  it('resolves production definition helpers for series controls', () => {
    const line = getChartDefinition('line')
    const map = getChartDefinition('map')

    expect(getChartDefinitions()).toHaveLength(chartDefinitions.length)
    expect(typeof line?.icon).not.toBe('string')
    expect(supportsSeriesDimension(line)).toBe(true)
    expect(supportsSeriesDimension(map)).toBe(false)
    expect(getSeriesDimensionLabel(line)).toBe('Compare by')
    expect(getSeriesDimensionLabel(getChartDefinition('donut'))).toBe(
      'Slice by',
    )
    expect(
      resolveSeriesDimension({
        definition: line,
        current: 'indicators',
        counts: {
          indicators: 1,
          geometries: 3,
          time: 2,
        },
      }),
    ).toBe('geometries')
    expect(
      getChartEstimatedSeriesCount({
        definition: line,
        seriesDimension: 'time',
        timePointCount: 4,
      }),
    ).toBe(4)
    expect(line?.getTypeOptionState?.({ timePointCount: 1 })).toEqual({
      disabled: true,
      reason:
        'This product only has one time point — this chart type works best with multiple',
    })
    expect(
      getChartEstimatedSeriesCount({
        definition: map,
        seriesDimension: 'geometries',
        geometryOutputIds: ['geometry-1'],
      }),
    ).toBeNull()
  })

  it('exposes time-change support only from chart-owned definitions', () => {
    const supported = [
      'line',
      'stacked-bar',
      'grouped-bar',
      'dot',
      'table',
      'map',
      'kpi',
    ]
    const unsupported = ['area', 'stacked-area', 'ranked-bar', 'donut']

    for (const key of supported) {
      expect(getChartDefinition(key)?.timeChange).toMatchObject({
        modes: ['delta', 'percentDelta'],
        defaultMode: 'none',
        baseline: 'firstTimePoint',
      })
    }

    for (const key of unsupported) {
      expect(getChartDefinition(key)?.timeChange).toBeUndefined()
    }
  })

  it('keeps existing valid chart JSON unchanged when transform is omitted', () => {
    const input = {
      type: 'plot',
      subType: 'line',
      productRunId: 'run-1',
      indicatorIds: ['indicator-1'],
      geometryOutputIds: ['geometry-1'],
      timePoints: [timePoint2024, timePoint2025],
    }

    expect(chartConfigurationSchema.parse(input)).toEqual(input)
  })

  it('parses optional time-change transform config without changing selection rules', () => {
    const parsed = chartConfigurationSchema.parse({
      type: 'plot',
      subType: 'line',
      productRunId: 'run-1',
      indicatorIds: ['indicator-1'],
      geometryOutputIds: ['geometry-1'],
      timePoints: [timePoint2024, timePoint2025],
      transform: {
        timeChange: {
          mode: 'percentDelta',
          baseline: 'firstTimePoint',
        },
      },
    })

    expect(parsed).toMatchObject({
      transform: {
        timeChange: {
          mode: 'percentDelta',
          baseline: 'firstTimePoint',
        },
      },
    })
  })

  it('loads all time points for single-time delta charts', () => {
    const transform = {
      timeChange: {
        mode: 'delta',
        baseline: 'firstTimePoint',
      },
    }
    const mapChart = chartConfigurationSchema.parse({
      type: 'map',
      productRunId: 'run-1',
      indicatorId: 'indicator-1',
      timePoint: timePoint2025,
      geometryOutputIds: ['geometry-1'],
      transform,
    })
    const kpiChart = chartConfigurationSchema.parse({
      type: 'kpi',
      productRunId: 'run-1',
      indicatorId: 'indicator-1',
      timePoint: timePoint2025,
      geometryOutputIds: ['geometry-1'],
      transform,
    })
    const tableChart = chartConfigurationSchema.parse({
      type: 'table',
      productRunId: 'run-1',
      indicatorIds: ['indicator-1'],
      geometryOutputIds: ['geometry-1'],
      timePoints: [timePoint2024, timePoint2025],
      xDimension: 'indicatorName',
      yDimension: 'timePoint',
      transform,
    })

    expect(
      getChartDefinitionForConfiguration(mapChart)?.getDataRequirements(
        mapChart,
      )?.productOutputQuery,
    ).toEqual({
      indicatorId: 'indicator-1',
      geometryOutputId: ['geometry-1'],
    })
    expect(
      getChartDefinitionForConfiguration(kpiChart)?.getDataRequirements(
        kpiChart,
      )?.productOutputQuery,
    ).toEqual({
      indicatorId: 'indicator-1',
      geometryOutputId: 'geometry-1',
    })
    expect(
      getChartDefinitionForConfiguration(tableChart)?.getDataRequirements(
        tableChart,
      )?.productOutputQuery,
    ).toEqual({
      indicatorId: ['indicator-1'],
      geometryOutputId: ['geometry-1'],
    })
  })

  it('applies plot time-change transforms only when the chart definition supports them', () => {
    const transform = {
      timeChange: {
        mode: 'delta',
        baseline: 'firstTimePoint',
      },
    }
    const productOutputs = [
      {
        id: 'output-1',
        value: 10,
        timePoint: timePoint2024,
        indicatorName: 'Forest cover',
        geometryOutputName: 'Tasmania',
      },
      {
        id: 'output-2',
        value: 15,
        timePoint: timePoint2025,
        indicatorName: 'Forest cover',
        geometryOutputName: 'Tasmania',
      },
    ]
    const areaChart = chartConfigurationSchema.parse({
      type: 'plot',
      subType: 'area',
      productRunId: 'run-1',
      indicatorIds: ['indicator-1'],
      geometryOutputIds: ['geometry-1'],
      timePoints: [timePoint2024, timePoint2025],
      transform,
    })
    const lineChart = chartConfigurationSchema.parse({
      type: 'plot',
      subType: 'line',
      productRunId: 'run-1',
      indicatorIds: ['indicator-1'],
      geometryOutputIds: ['geometry-1'],
      timePoints: [timePoint2024, timePoint2025],
      transform,
    })
    const areaDefinition = getChartDefinitionForConfiguration(areaChart)
    const lineDefinition = getChartDefinitionForConfiguration(lineChart)

    if (!areaDefinition || !lineDefinition) {
      throw new Error('Missing chart definition')
    }

    const areaCodeCells: string[][] = []
    areaDefinition.renderer.render({
      chart: areaChart,
      productRun: {},
      productOutputs,
      options: { showCodeSnippet: true },
      adapters: {
        renderObservableCellsCopy: (cells) => {
          areaCodeCells.push(cells)
          return null
        },
      },
    })

    const lineCodeCells: string[][] = []
    lineDefinition.renderer.render({
      chart: lineChart,
      productRun: {},
      productOutputs,
      options: { showCodeSnippet: true },
      adapters: {
        renderObservableCellsCopy: (cells) => {
          lineCodeCells.push(cells)
          return null
        },
      },
    })

    const areaCode = areaCodeCells[0]?.[0] ?? ''
    const lineCode = lineCodeCells[0]?.[0] ?? ''

    expect(areaCode).toContain('"value":10')
    expect(areaCode).toContain('"value":15')
    expect(lineCode).not.toContain('"value":10')
    expect(lineCode).toContain('"value":5')
  })

  it('gets suggested titles from chart definition functions', () => {
    const indicators = [
      { id: 'indicator-1', name: 'Forest cover' },
      { id: 'indicator-2', name: 'Population' },
    ]
    const geometries = [{ id: 'geometry-1', name: 'Tasmania' }]

    expect(
      suggestTitleForDefinition({
        definition: getChartDefinition('line'),
        productName: 'Forest product',
        values: {
          indicatorIds: ['indicator-1'],
          geometryOutputIds: ['geometry-1'],
          timePoints: [timePoint2024],
        },
        seriesDimension: 'indicators',
        indicators,
        geometries,
        datePrecision: 'year',
      }),
    ).toBe('Forest product — Tasmania — 2024')

    expect(
      suggestTitleForDefinition({
        definition: getChartDefinition('map'),
        productName: 'Forest product',
        values: {
          indicatorId: 'indicator-2',
          geometryOutputIds: ['geometry-1'],
          timePoint: timePoint2025,
        },
        seriesDimension: 'indicators',
        indicators,
        geometries,
        datePrecision: 'year',
      }),
    ).toBe('Population — Tasmania — 2025')

    expect(
      suggestTitleForDefinition({
        definition: getChartDefinition('table'),
        productName: 'Forest product',
        values: {
          indicatorIds: ['indicator-1'],
          geometryOutputIds: ['geometry-1'],
          timePoints: [timePoint2024, timePoint2025],
          transform: {
            timeChange: {
              mode: 'delta',
              baseline: 'firstTimePoint',
            },
          },
        },
        seriesDimension: 'time',
        indicators,
        geometries,
        datePrecision: 'year',
      }),
    ).toBe(
      'Change from previous time point: Forest product — Forest cover — Tasmania',
    )

    expect(
      suggestTitleForDefinition({
        definition: getChartDefinition('map'),
        productName: 'Forest product',
        values: {
          indicatorId: 'indicator-2',
          geometryOutputIds: ['geometry-1'],
          timePoint: timePoint2025,
          transform: {
            timeChange: {
              mode: 'percentDelta',
              baseline: 'firstTimePoint',
            },
          },
        },
        seriesDimension: 'indicators',
        indicators,
        geometries,
        availableTimePoints: [timePoint2025, timePoint2024],
        datePrecision: 'year',
      }),
    ).toBe('Percent change from 2024 to 2025: Population — Tasmania')

    expect(
      suggestTitleForDefinition({
        definition: getChartDefinition('kpi'),
        productName: 'Forest product',
        values: {
          indicatorId: 'indicator-1',
          geometryOutputIds: ['geometry-1'],
          timePoint: timePoint2025,
          transform: {
            timeChange: {
              mode: 'delta',
              baseline: 'firstTimePoint',
            },
          },
        },
        seriesDimension: 'indicators',
        indicators,
        geometries,
        availableTimePoints: [timePoint2025, timePoint2024],
        datePrecision: 'year',
      }),
    ).toBe('Forest cover — Tasmania')
  })

  it('renders KPI values with indicator units', () => {
    const chart = chartConfigurationSchema.parse({
      type: 'kpi',
      productRunId: 'run-1',
      indicatorId: 'indicator-1',
      timePoint: timePoint2024,
      geometryOutputIds: ['geometry-1'],
      appearance: { datePrecision: 'year' },
    })
    const definition = getChartDefinitionForConfiguration(chart)

    if (!definition) {
      throw new Error('Missing KPI definition')
    }

    const rendered = definition.renderer.render({
      chart,
      productRun: {},
      productOutputs: [
        {
          id: 'output-1',
          value: 1234,
          timePoint: timePoint2024,
          indicatorName: 'Forest cover',
          geometryOutputName: 'Tasmania',
        },
      ],
      indicator: { unit: 'm^2' },
    })

    const text = extractReactText(rendered)

    expect(text).toContain('1,234 m^2')
    expect(text).toContain('2024')
    expect(text).not.toContain('Forest cover')
    expect(text).not.toContain('Tasmania')
  })

  it('renders KPI time-change values with the compared dates', () => {
    const chart = chartConfigurationSchema.parse({
      type: 'kpi',
      productRunId: 'run-1',
      indicatorId: 'indicator-1',
      timePoint: timePoint2025,
      geometryOutputIds: ['geometry-1'],
      appearance: { datePrecision: 'year' },
      transform: {
        timeChange: {
          mode: 'delta',
          baseline: 'firstTimePoint',
        },
      },
    })
    const definition = getChartDefinitionForConfiguration(chart)

    if (!definition) {
      throw new Error('Missing KPI definition')
    }

    const rendered = definition.renderer.render({
      chart,
      productRun: {},
      productOutputs: [
        {
          id: 'output-1',
          value: 10,
          timePoint: timePoint2024,
          indicatorName: 'Forest cover',
          geometryOutputName: 'Tasmania',
        },
        {
          id: 'output-2',
          value: 15,
          timePoint: timePoint2025,
          indicatorName: 'Forest cover',
          geometryOutputName: 'Tasmania',
        },
      ],
      indicator: { unit: 'm^2' },
    })
    const text = extractReactText(rendered)

    expect(text).toContain('5 m^2')
    expect(text).toContain('Change from 2024 to 2025')
    expect(text).not.toContain('Forest cover')
    expect(text).not.toContain('Tasmania')
  })

  it('infers series dimensions and colour entries from chart selections', () => {
    const line = getChartDefinition('line')
    const chart = chartConfigurationSchema.parse({
      type: 'plot',
      subType: 'line',
      productRunId: 'run-1',
      indicatorIds: ['indicator-1'],
      geometryOutputIds: ['geometry-1', 'geometry-2'],
      timePoints: [timePoint2024],
    })

    expect(inferChartSeriesDimension(chart)).toBe('geometries')
    expect(
      getChartSeriesEntries({
        definition: line,
        values: chart,
        seriesDimension: 'geometries',
        indicators: [{ id: 'indicator-1', name: 'Forest cover' }],
        geometries: [
          { id: 'geometry-1', name: 'Tasmania' },
          { id: 'geometry-2', name: null },
        ],
        productOutputs: [
          {
            geometryOutputName: 'Tasmania',
          },
          {
            geometryOutputName: 'Mainland',
          },
          {
            geometryOutputName: 'Tasmania',
          },
        ],
        datePrecision: 'year',
      }),
    ).toEqual([
      { label: 'Tasmania', overrideKeys: ['Tasmania'] },
      { label: 'Mainland', overrideKeys: ['Mainland'] },
    ])
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
      sampleChartDefinition.getDataRequirements(sampleChart)
        ?.productOutputQuery,
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
