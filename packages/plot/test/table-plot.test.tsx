import { describe, expect, it } from 'vitest'
import { buildTablePlotModel } from '../src/TablePlot'

describe('buildTablePlotModel', () => {
  it('returns an error when multiple records map to the same table cell', () => {
    const model = buildTablePlotModel({
      data: [
        {
          id: 'output-1',
          indicatorName: 'Population',
          geometryOutputName: 'Tasmania',
          timePoint: '2024-01-01T00:00:00.000Z',
          value: 1,
        },
        {
          id: 'output-2',
          indicatorName: 'Population',
          geometryOutputName: 'Hobart',
          timePoint: '2024-01-01T00:00:00.000Z',
          value: 2,
        },
      ],
      dateFmt: new Intl.DateTimeFormat('en-AU'),
      xDimension: 'indicatorName',
      yDimension: 'timePoint',
    })

    expect(model).toEqual({
      error: expect.stringContaining(
        'Each table cell must map to exactly one product output.',
      ),
    })
  })
})
