import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { describe, expect, it } from 'vitest'
import { chartConfigurationSchema } from '../src/chart'
import {
  dashboardContentSchema,
  fullDashboardSchema,
  fullReportSchema,
  reportStoredContentSchema,
} from '../src/crud'

const basePlotSelections = {
  productRunId: 'run-1',
  indicatorIds: ['indicator-1'],
  geometryOutputIds: ['geometry-1'],
  timePoints: ['2024'],
}

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

describe('chartConfigurationSchema', () => {
  it.each([
    [
      'line',
      {
        type: 'plot',
        subType: 'line',
        ...basePlotSelections,
        timePoints: ['2024', '2025'],
      },
    ],
    [
      'area',
      {
        type: 'plot',
        subType: 'area',
        ...basePlotSelections,
        timePoints: ['2024', '2025'],
      },
    ],
    [
      'stacked-area',
      {
        type: 'plot',
        subType: 'stacked-area',
        ...basePlotSelections,
        indicatorIds: ['indicator-1', 'indicator-2'],
        timePoints: ['2024', '2025'],
      },
    ],
    [
      'stacked-bar',
      {
        type: 'plot',
        subType: 'stacked-bar',
        ...basePlotSelections,
        geometryOutputIds: ['geometry-1', 'geometry-2'],
        timePoints: ['2024', '2025'],
      },
    ],
    [
      'grouped-bar',
      {
        type: 'plot',
        subType: 'grouped-bar',
        ...basePlotSelections,
        indicatorIds: ['indicator-1', 'indicator-2'],
      },
    ],
    [
      'ranked-bar',
      {
        type: 'plot',
        subType: 'ranked-bar',
        ...basePlotSelections,
        geometryOutputIds: ['geometry-1', 'geometry-2'],
      },
    ],
    [
      'dot',
      {
        type: 'plot',
        subType: 'dot',
        ...basePlotSelections,
        timePoints: ['2024', '2025'],
      },
    ],
    [
      'donut',
      {
        type: 'plot',
        subType: 'donut',
        ...basePlotSelections,
        indicatorIds: ['indicator-1', 'indicator-2'],
      },
    ],
    [
      'map',
      {
        type: 'map',
        productRunId: 'run-1',
        indicatorId: 'indicator-1',
        timePoint: '2024',
        geometryOutputIds: ['geometry-1'],
      },
    ],
    [
      'table',
      {
        type: 'table',
        ...basePlotSelections,
        indicatorIds: ['indicator-1', 'indicator-2'],
        timePoints: ['2024', '2025'],
        xDimension: 'indicatorName',
        yDimension: 'timePoint',
      },
    ],
    [
      'kpi',
      {
        type: 'kpi',
        productRunId: 'run-1',
        indicatorId: 'indicator-1',
        timePoint: '2024',
        geometryOutputIds: ['geometry-1'],
      },
    ],
  ])('accepts %s chart configurations', (_label, chart) => {
    expect(chartConfigurationSchema.parse(chart)).toMatchObject(chart)
  })

  it('strips deprecated productId fields from persisted chart output', () => {
    const parsed = chartConfigurationSchema.parse({
      type: 'plot',
      subType: 'line',
      ...basePlotSelections,
      productId: 'legacy-product',
    })

    expect(parsed).not.toHaveProperty('productId')
  })

  it('returns exact donut validation issues', () => {
    const result = chartConfigurationSchema.safeParse({
      type: 'plot',
      subType: 'donut',
      ...basePlotSelections,
      indicatorIds: ['indicator-1', 'indicator-2'],
      timePoints: ['2024', '2025'],
    })

    expect(issuesFor(result)).toEqual([
      {
        path: 'indicatorIds',
        message:
          'Donut chart can only vary one dimension — select a single indicator',
      },
      {
        path: 'timePoints',
        message:
          'Donut chart can only vary one dimension — select a single time point',
      },
    ])
  })

  it('returns exact ranked bar validation issues', () => {
    const result = chartConfigurationSchema.safeParse({
      type: 'plot',
      subType: 'ranked-bar',
      ...basePlotSelections,
      geometryOutputIds: ['geometry-1', 'geometry-2'],
      timePoints: ['2024', '2025'],
    })

    expect(issuesFor(result)).toEqual([
      {
        path: 'geometryOutputIds',
        message:
          'Ranked bar chart can only vary one dimension — select a single geometry',
      },
      {
        path: 'timePoints',
        message:
          'Ranked bar chart can only vary one dimension — select a single time point',
      },
    ])
  })

  it('returns exact cartesian plot validation issues when every dimension varies', () => {
    const result = chartConfigurationSchema.safeParse({
      type: 'plot',
      subType: 'line',
      ...basePlotSelections,
      indicatorIds: ['indicator-1', 'indicator-2'],
      geometryOutputIds: ['geometry-1', 'geometry-2'],
      timePoints: ['2024', '2025'],
    })

    expect(issuesFor(result)).toEqual([
      {
        path: 'indicatorIds',
        message:
          'Each chart element must map to one product output — select a single indicator',
      },
      {
        path: 'geometryOutputIds',
        message:
          'Each chart element must map to one product output — select a single geometry',
      },
      {
        path: 'timePoints',
        message:
          'Each chart element must map to one product output — select a single time point',
      },
    ])
  })

  it('returns exact cartesian plot validation issues when both indicators and geometries vary', () => {
    const result = chartConfigurationSchema.safeParse({
      type: 'plot',
      subType: 'line',
      ...basePlotSelections,
      indicatorIds: ['indicator-1', 'indicator-2'],
      geometryOutputIds: ['geometry-1', 'geometry-2'],
    })

    expect(issuesFor(result)).toEqual([
      {
        path: 'indicatorIds',
        message:
          'Each chart element must map to one product output — select a single indicator or a single geometry',
      },
      {
        path: 'geometryOutputIds',
        message:
          'Each chart element must map to one product output — select a single indicator or a single geometry',
      },
    ])
  })

  it('returns exact table validation issues for non-axis indicator and geometry selections', () => {
    const result = chartConfigurationSchema.safeParse({
      type: 'table',
      ...basePlotSelections,
      indicatorIds: ['indicator-1', 'indicator-2'],
      geometryOutputIds: ['geometry-1', 'geometry-2'],
      timePoints: ['2024', '2025'],
      xDimension: 'timePoint',
      yDimension: 'indicatorName',
    })

    expect(issuesFor(result)).toEqual([
      {
        path: 'geometryOutputIds',
        message:
          'Geometry output is not used as a table axis, one must be selected.',
      },
    ])
  })

  it('returns exact table validation issues for a non-axis time selection', () => {
    const result = chartConfigurationSchema.safeParse({
      type: 'table',
      ...basePlotSelections,
      indicatorIds: ['indicator-1', 'indicator-2'],
      timePoints: ['2024', '2025'],
      xDimension: 'indicatorName',
      yDimension: 'geometryOutputName',
    })

    expect(issuesFor(result)).toEqual([
      {
        path: 'timePoints',
        message:
          'Time point is not used as a table axis, one must be selected.',
      },
    ])
  })

  it('returns exact KPI validation messages', () => {
    const missingGeometry = chartConfigurationSchema.safeParse({
      type: 'kpi',
      productRunId: 'run-1',
      indicatorId: 'indicator-1',
      timePoint: '2024',
      geometryOutputIds: [],
    })
    const tooManyGeometries = chartConfigurationSchema.safeParse({
      type: 'kpi',
      productRunId: 'run-1',
      indicatorId: 'indicator-1',
      timePoint: '2024',
      geometryOutputIds: ['geometry-1', 'geometry-2'],
    })

    expect(issuesFor(missingGeometry)).toEqual([
      {
        path: 'geometryOutputIds',
        message: 'KPI requires a selected geometry',
      },
    ])
    expect(issuesFor(tooManyGeometries)).toEqual([
      {
        path: 'geometryOutputIds',
        message: 'KPI requires exactly one geometry',
      },
    ])
  })
})

describe('reportStoredContentSchema', () => {
  it('keeps the public report payload schema opaque', () => {
    expect(
      reportStoredContentSchema.parse({
        type: 'doc',
        content: [{ type: 'paragraph' }],
      }),
    ).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph' }],
    })
  })
})

describe('dashboardContentSchema', () => {
  it('parses typed chart records and strips deprecated productId fields', () => {
    const parsed = dashboardContentSchema.parse({
      charts: {
        main: {
          type: 'plot',
          subType: 'line',
          ...basePlotSelections,
          productId: 'legacy-product',
        },
      },
      layout: [{ i: 'main', x: 0, y: 0, w: 4, h: 3 }],
    })

    expect(parsed.charts.main).not.toHaveProperty('productId')
    expect(parsed.layout).toEqual([{ i: 'main', x: 0, y: 0, w: 4, h: 3 }])
  })
})

describe('OpenAPI generation', () => {
  it('includes report and dashboard chart schemas in the generated document', () => {
    const app = new OpenAPIHono()

    app.openapi(
      createRoute({
        method: 'get',
        path: '/reports/{id}',
        request: {
          params: z.object({ id: z.string() }),
        },
        responses: {
          200: {
            description: 'Report response',
            content: {
              'application/json': {
                schema: fullReportSchema,
              },
            },
          },
        },
      }),
      (() => new Response()) as never,
    )

    app.openapi(
      createRoute({
        method: 'get',
        path: '/dashboards/{id}',
        request: {
          params: z.object({ id: z.string() }),
        },
        responses: {
          200: {
            description: 'Dashboard response',
            content: {
              'application/json': {
                schema: fullDashboardSchema,
              },
            },
          },
        },
      }),
      (() => new Response()) as never,
    )

    const document = app.getOpenAPIDocument({
      openapi: '3.0.0',
      info: {
        title: 'Schema smoke test',
        version: '1.0.0',
      },
    })

    expect(
      document.components?.schemas?.ReportStoredContentSchema,
    ).toBeDefined()
    expect(document.components?.schemas?.DashboardContentSchema).toBeDefined()
    expect(document.components?.schemas?.ChartConfigurationSchema).toBeDefined()
    expect(
      (
        document.components?.schemas?.ChartConfigurationSchema as {
          description?: string
        }
      )?.description,
    ).toContain('Persisted chart configuration')
    expect(
      JSON.stringify(document.components?.schemas?.DashboardContentSchema),
    ).toContain('ChartConfigurationSchema')
    expect(document.components?.schemas?.ReportContentSchema).toBeUndefined()
    expect(
      JSON.stringify(document.components?.schemas?.ReportSchemaFull),
    ).toContain('ReportStoredContentSchema')
  })
})
