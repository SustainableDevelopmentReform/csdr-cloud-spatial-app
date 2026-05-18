import { describe, expect, it } from 'vitest'
import {
  chartConfigurationSchema,
  extractChartIndicatorSelection,
  getChartConfigKey,
  getChartSeriesGroupBy,
  getPlotChartGroupBy,
  getSuggestedChartTitle,
} from '../src/chart-core'

const timePoint2024 = '2024-01-01T00:00:00.000Z'
const timePoint2025 = '2025-01-01T00:00:00.000Z'

const issuesFor = (
  result: ReturnType<typeof chartConfigurationSchema.safeParse>,
) => {
  if (result.success) {
    throw new Error('Expected schema parsing to fail')
  }

  return result.error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }))
}

describe('chart-core helpers', () => {
  it('resolves stable chart config keys', () => {
    expect(getChartConfigKey({ type: 'plot', subType: 'line' })).toBe('line')
    expect(getChartConfigKey({ type: 'map' })).toBe('map')
    expect(getChartConfigKey({ type: 'table' })).toBe('table')
    expect(getChartConfigKey({ type: 'kpi' })).toBe('kpi')
    expect(getChartConfigKey({})).toBeNull()
  })

  it('infers plot grouping from the first varying selection dimension', () => {
    expect(
      getPlotChartGroupBy({
        indicatorIds: ['indicator-1'],
        geometryOutputIds: ['geometry-1', 'geometry-2'],
        timePoints: [timePoint2024],
      }),
    ).toBe('geometryOutputName')
    expect(
      getPlotChartGroupBy({
        indicatorIds: ['indicator-1', 'indicator-2'],
        geometryOutputIds: ['geometry-1'],
        timePoints: [timePoint2024],
      }),
    ).toBe('indicatorName')
    expect(
      getPlotChartGroupBy({
        indicatorIds: ['indicator-1'],
        geometryOutputIds: ['geometry-1'],
        timePoints: [timePoint2024, timePoint2025],
      }),
    ).toBe('timePoint')
    expect(getChartSeriesGroupBy({ type: 'map' })).toBeNull()
  })

  it('rejects plot configurations that vary all three dimensions', () => {
    expect(
      issuesFor(
        chartConfigurationSchema.safeParse({
          type: 'plot',
          subType: 'line',
          productRunId: 'run-1',
          indicatorIds: ['indicator-1', 'indicator-2'],
          geometryOutputIds: ['geometry-1', 'geometry-2'],
          timePoints: [timePoint2024, timePoint2025],
        }),
      ),
    ).toEqual([
      {
        path: 'indicatorIds',
        message:
          'Each chart element must map to one product output — select a single indicator',
      },
      {
        path: 'geometryOutputIds',
        message:
          'Each chart element must map to one product output — select a single boundary',
      },
      {
        path: 'timePoints',
        message:
          'Each chart element must map to one product output — select a single time point',
      },
    ])
  })

  it('extracts deduplicated indicator selections across chart families', () => {
    const plotChart = chartConfigurationSchema.parse({
      type: 'plot',
      subType: 'line',
      productRunId: 'run-1',
      indicatorIds: ['indicator-1', 'indicator-1', 'indicator-2'],
      geometryOutputIds: ['geometry-1'],
      timePoints: [timePoint2024],
    })
    const mapChart = chartConfigurationSchema.parse({
      type: 'map',
      productRunId: 'run-1',
      indicatorId: 'indicator-3',
      geometryOutputIds: ['geometry-1'],
      timePoint: timePoint2024,
    })

    expect(extractChartIndicatorSelection(plotChart)).toEqual({
      productRunId: 'run-1',
      indicatorIds: ['indicator-1', 'indicator-2'],
    })
    expect(extractChartIndicatorSelection(mapChart)).toEqual({
      productRunId: 'run-1',
      indicatorIds: ['indicator-3'],
    })
  })

  it('builds suggested titles from chart strategy inputs', () => {
    const indicators = [
      { id: 'indicator-1', name: 'Forest cover' },
      { id: 'indicator-2', name: 'Population' },
    ]
    const geometries = [{ id: 'geometry-1', name: 'Tasmania' }]

    expect(
      getSuggestedChartTitle({
        productName: 'Forest product',
        values: {
          indicatorIds: ['indicator-1'],
          geometryOutputIds: ['geometry-1'],
          timePoints: [timePoint2024],
        },
        seriesDimension: 'indicators',
        indicators,
        geometries,
        titleStrategy: 'plot',
        datePrecision: 'year',
      }),
    ).toBe('Forest product — Tasmania — 2024')

    expect(
      getSuggestedChartTitle({
        productName: 'Forest product',
        values: {
          indicatorId: 'indicator-2',
          geometryOutputIds: ['geometry-1'],
          timePoint: timePoint2025,
        },
        seriesDimension: 'indicators',
        indicators,
        geometries,
        titleStrategy: 'map',
        datePrecision: 'year',
      }),
    ).toBe('Population — Tasmania — 2025')
  })
})
