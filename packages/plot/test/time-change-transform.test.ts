import { describe, expect, it } from 'vitest'
import {
  applyTimeChangeTransform,
  getTimeChangeBaseline,
  groupRecordsForTimeChange,
} from '../src/chart-core'

const timePoint2024 = '2024-01-01T00:00:00.000Z'
const timePoint2025 = '2025-01-01T00:00:00.000Z'
const timePoint2026 = '2026-01-01T00:00:00.000Z'

const records = [
  {
    id: 'a-2026',
    value: 21,
    timePoint: timePoint2026,
    indicatorName: 'Forest cover',
    geometryOutputName: 'Tasmania',
  },
  {
    id: 'a-2025',
    value: 15,
    timePoint: timePoint2025,
    indicatorName: 'Forest cover',
    geometryOutputName: 'Tasmania',
  },
  {
    id: 'a-2024',
    value: 10,
    timePoint: timePoint2024,
    indicatorName: 'Forest cover',
    geometryOutputName: 'Tasmania',
  },
  {
    id: 'b-2024',
    value: 20,
    timePoint: timePoint2024,
    indicatorName: 'Population',
    geometryOutputName: 'Tasmania',
  },
  {
    id: 'b-2025',
    value: 25,
    timePoint: timePoint2025,
    indicatorName: 'Population',
    geometryOutputName: 'Tasmania',
  },
]

describe('time-change transforms', () => {
  it('groups records independently by indicator and boundary', () => {
    const groups = groupRecordsForTimeChange(records)

    expect(groups.size).toBe(2)
    expect(Array.from(groups.values()).map((group) => group.length)).toEqual([
      3, 2,
    ])
  })

  it('selects the first chronological record as the baseline', () => {
    const baseline = getTimeChangeBaseline(records)

    expect(baseline?.id).toBe('a-2024')
  })

  it('applies step-over-step delta per group', () => {
    const transformed = applyTimeChangeTransform(records, {
      mode: 'delta',
      baseline: 'firstTimePoint',
    })

    expect(transformed.map(({ id, value }) => ({ id, value }))).toEqual([
      { id: 'a-2025', value: 5 },
      { id: 'a-2026', value: 6 },
      { id: 'b-2025', value: 5 },
    ])
    expect(transformed[0]).toMatchObject({
      id: 'a-2025',
      rawValue: 15,
      baselineValue: 10,
      baselineTimePoint: timePoint2024,
      baselineProductOutputId: 'a-2024',
      timeChangeMode: 'delta',
    })
  })

  it('applies step-over-step percent change per group', () => {
    const transformed = applyTimeChangeTransform(records, {
      mode: 'percentDelta',
      baseline: 'firstTimePoint',
    })

    expect(transformed.map(({ id, value }) => ({ id, value }))).toEqual([
      { id: 'a-2025', value: 50 },
      { id: 'a-2026', value: 40 },
      { id: 'b-2025', value: 25 },
    ])
  })

  it('sorts unsorted input before choosing each group baseline', () => {
    const transformed = applyTimeChangeTransform(
      [
        {
          id: 'late',
          value: 13,
          timePoint: timePoint2026,
          indicatorName: 'Forest cover',
          geometryOutputName: 'Tasmania',
        },
        {
          id: 'early',
          value: 10,
          timePoint: timePoint2024,
          indicatorName: 'Forest cover',
          geometryOutputName: 'Tasmania',
        },
      ],
      { mode: 'delta', baseline: 'firstTimePoint' },
    )

    expect(transformed.map(({ id, value }) => ({ id, value }))).toEqual([
      { id: 'late', value: 3 },
    ])
  })

  it('skips percent-change points with a zero previous value', () => {
    const transformed = applyTimeChangeTransform(
      [
        {
          id: 'zero-start',
          value: 0,
          timePoint: timePoint2024,
          indicatorName: 'Forest cover',
          geometryOutputName: 'Tasmania',
        },
        {
          id: 'zero-later',
          value: 10,
          timePoint: timePoint2025,
          indicatorName: 'Forest cover',
          geometryOutputName: 'Tasmania',
        },
        {
          id: 'zero-latest',
          value: 15,
          timePoint: timePoint2026,
          indicatorName: 'Forest cover',
          geometryOutputName: 'Tasmania',
        },
        {
          id: 'other-start',
          value: 10,
          timePoint: timePoint2024,
          indicatorName: 'Population',
          geometryOutputName: 'Tasmania',
        },
        {
          id: 'other-later',
          value: 15,
          timePoint: timePoint2025,
          indicatorName: 'Population',
          geometryOutputName: 'Tasmania',
        },
      ],
      { mode: 'percentDelta', baseline: 'firstTimePoint' },
    )

    expect(transformed.map(({ id, value }) => ({ id, value }))).toEqual([
      { id: 'zero-latest', value: 50 },
      { id: 'other-later', value: 50 },
    ])
  })

  it('leaves raw values unchanged for none mode', () => {
    const transformed = applyTimeChangeTransform(records, {
      mode: 'none',
      baseline: 'firstTimePoint',
    })

    expect(transformed).toEqual(records)
  })
})
