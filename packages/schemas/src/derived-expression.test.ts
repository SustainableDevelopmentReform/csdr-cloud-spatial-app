import { describe, expect, it } from 'vitest'
import {
  validateDerivedExpression,
  validateDerivedExpressionForIndicators,
} from './derived-expression'

describe('derived expression validation', () => {
  it('accepts scalar arithmetic over dependency variables', () => {
    expect(
      validateDerivedExpressionForIndicators({
        expression: '($1 + sqrt($2)) / 2',
        indicatorIds: ['indicator-1', 'indicator-2'],
      }),
    ).toBeNull()
  })

  it('rejects expensive or unsafe mathjs constructs', () => {
    const allowedSymbols = new Set(['$1'])

    expect(
      validateDerivedExpression({
        expression: 'sum(range(1, 20000000)) + $1',
        allowedSymbols,
      }),
    ).toBe('Function is not allowed.')
    expect(
      validateDerivedExpression({
        expression: 'zeros(10000, 10000)',
        allowedSymbols,
      }),
    ).toBe('Function is not allowed.')
    expect(
      validateDerivedExpression({
        expression: '$2 + 1',
        allowedSymbols,
      }),
    ).toBe('Variable "$2" is not allowed.')
  })
})
