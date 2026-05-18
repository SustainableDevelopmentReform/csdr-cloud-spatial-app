import { describe, expect, it } from 'vitest'
import {
  getContrastingTextColor,
  makeDateFormatter,
  makeNumberFormatter,
} from '../src/types'

describe('shared plot formatters', () => {
  it('creates number formatters with explicit decimal and compact options', () => {
    expect(makeNumberFormatter().resolvedOptions().maximumFractionDigits).toBe(
      3,
    )
    expect(makeNumberFormatter(2).resolvedOptions().maximumFractionDigits).toBe(
      2,
    )
    expect(
      makeNumberFormatter(undefined, true).resolvedOptions().notation,
    ).toBe('compact')
  })

  it('creates date formatters for supported precisions', () => {
    const date = new Date('2024-05-20T10:30:00.000Z')

    expect(
      makeDateFormatter('year')
        .formatToParts(date)
        .some((part) => part.type === 'year' && part.value === '2024'),
    ).toBe(true)
    expect(
      makeDateFormatter('year-month-day')
        .formatToParts(date)
        .some((part) => part.type === 'day' && part.value === '20'),
    ).toBe(true)
    expect(
      makeDateFormatter('full')
        .formatToParts(date)
        .some((part) => part.type === 'hour'),
    ).toBe(true)
  })

  it('chooses readable text colours for light, dark, and invalid colours', () => {
    expect(getContrastingTextColor('#000000')).toBe('#F9FAFB')
    expect(getContrastingTextColor('#ffffff')).toBe('#111827')
    expect(getContrastingTextColor('not-a-color')).toBe('#111827')
  })
})
