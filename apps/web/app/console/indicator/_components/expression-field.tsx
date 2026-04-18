'use client'

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/ui/form'
import { Badge } from '@repo/ui/components/ui/badge'
import { Textarea } from '@repo/ui/components/ui/textarea'
import { parse } from 'mathjs'
import { useMemo } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { z } from 'zod'
import { StatusMessage } from '~/components/status-message'
import { createDerivedIndicatorSchema } from '@repo/schemas/crud'
import { IndicatorListItem } from '../_hooks'

export type DerivedIndicatorFormValues = z.infer<
  typeof createDerivedIndicatorSchema
>

function validateExpression(expression: string | undefined): string | null {
  if (!expression || expression.trim() === '') {
    return null
  }

  try {
    parse(expression)
    return null
  } catch (error) {
    return error instanceof Error ? error.message : 'Invalid expression syntax'
  }
}

export const ExpressionFieldDescription = ({
  indicatorIds,
  indicators,
  disabled,
}: {
  indicatorIds?: string[]
  indicators: IndicatorListItem[]
  disabled?: boolean
}) => {
  const selectedIndicatorIds =
    indicatorIds ?? indicators.map((indicator) => indicator.id)

  return (
    <div className="text-sm text-muted-foreground">
      See{' '}
      <a
        href="https://mathjs.org/docs/expressions/syntax.html"
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 hover:text-blue-600"
      >
        the Math.js syntax
      </a>{' '}
      for more information.{' '}
      {disabled ? 'The expression cannot be changed after creation.' : ''}
      {selectedIndicatorIds.length > 0 && (
        <div className="my-2 flex flex-wrap gap-2">
          <div className="font-medium">Expression variables:</div>
          {selectedIndicatorIds.map((indicatorId: string, index: number) => {
            const indicator = indicators.find(
              (candidate) => candidate.id === indicatorId,
            )

            return (
              <Badge key={indicatorId} variant="secondary">
                ${index + 1}={indicator?.name}
              </Badge>
            )
          })}
        </div>
      )}
    </div>
  )
}

export const ExpressionField = ({
  form,
  indicators,
  disabled,
}: {
  form: UseFormReturn<DerivedIndicatorFormValues>
  indicators: IndicatorListItem[]
  disabled?: boolean
}) => {
  const expression = form.watch('expression')
  const indicatorIds = form.watch('indicatorIds') ?? []
  const error = useMemo(() => validateExpression(expression), [expression])

  return (
    <FormField
      control={form.control}
      name="expression"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Expression</FormLabel>
          <ExpressionFieldDescription
            indicatorIds={indicatorIds}
            indicators={indicators}
          />
          <FormControl>
            <Textarea {...field} className="font-mono" disabled={disabled} />
          </FormControl>
          <FormMessage />
          {error ? (
            <StatusMessage variant="error" className="mt-2">
              {error}
            </StatusMessage>
          ) : null}
          {!error && expression && expression.trim() !== '' ? (
            <StatusMessage variant="primary" className="mt-2">
              Expression is valid
            </StatusMessage>
          ) : null}
        </FormItem>
      )}
    />
  )
}
