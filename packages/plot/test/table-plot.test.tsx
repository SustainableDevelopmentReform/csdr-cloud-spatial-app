import { describe, expect, it } from 'vitest'
import { buildTablePlotModel } from '../src/table-plot'

const dateFmt = new Intl.DateTimeFormat('en-AU', {
  timeZone: 'UTC',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

const expectValidModel = (model: ReturnType<typeof buildTablePlotModel>) => {
  if ('error' in model) {
    throw new Error(model.error)
  }

  return model
}

describe('buildTablePlotModel', () => {
  it('builds sorted columns and rows from valid table data', () => {
    const model = expectValidModel(
      buildTablePlotModel({
        data: [
          {
            id: 'output-3',
            indicatorName: 'Population',
            geometryOutputName: 'Tasmania',
            timePoint: '2025-01-01T00:00:00.000Z',
            value: 3,
          },
          {
            id: 'output-1',
            indicatorName: 'Forest cover',
            geometryOutputName: 'Tasmania',
            timePoint: '2024-01-01T00:00:00.000Z',
            value: 1,
          },
          {
            id: 'output-2',
            indicatorName: 'Population',
            geometryOutputName: 'Tasmania',
            timePoint: new Date('2024-01-01T00:00:00.000Z'),
            value: 2,
          },
        ],
        dateFmt,
        xDimension: 'indicatorName',
        yDimension: 'timePoint',
      }),
    )

    expect(model.columns.map((column) => column.key)).toEqual([
      'Forest cover',
      'Population',
    ])
    expect(model.rows.map((row) => row.meta.key)).toEqual([
      '2024-01-01T00:00:00.000Z',
      '2025-01-01T00:00:00.000Z',
    ])
    expect(model.rows[0]?.cells['Forest cover']?.id).toBe('output-1')
    expect(model.rows[0]?.cells['Population']?.id).toBe('output-2')
    expect(model.rows[1]?.cells['Population']?.id).toBe('output-3')
  })

  it('skips records that do not have values for selected dimensions', () => {
    const model = expectValidModel(
      buildTablePlotModel({
        data: [
          {
            id: 'output-1',
            indicatorName: null,
            geometryOutputName: 'Tasmania',
            timePoint: '2024-01-01T00:00:00.000Z',
            value: 1,
          },
          {
            id: 'output-2',
            indicatorName: 'Population',
            geometryOutputName: 'Tasmania',
            timePoint: '2024-01-01T00:00:00.000Z',
            value: 2,
          },
        ],
        dateFmt,
        xDimension: 'indicatorName',
        yDimension: 'timePoint',
      }),
    )

    expect(model.columns.map((column) => column.key)).toEqual(['Population'])
    expect(model.rows).toHaveLength(1)
    expect(model.rows[0]?.cells['Population']?.id).toBe('output-2')
  })

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
      dateFmt,
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
