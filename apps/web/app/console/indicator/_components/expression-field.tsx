'use client'

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/ui/form'
import { Badge } from '@repo/ui/components/ui/badge'
import { Button } from '@repo/ui/components/ui/button'
import { Textarea } from '@repo/ui/components/ui/textarea'
import { Info } from 'lucide-react'
import { useMemo } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { z } from 'zod'
import { StatusMessage } from '~/components/status-message'
import {
  createDerivedIndicatorSchema,
  updateDerivedIndicatorSchema,
} from '@repo/schemas/crud'
import {
  allowedDerivedExpressionFunctions,
  allowedDerivedExpressionOperators,
  derivedExpressionLimits,
  validateDerivedExpressionForIndicators,
} from '@repo/schemas/derived-expression'
import { IndicatorListItem } from '../_hooks'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@repo/ui/components/ui/tooltip'

export type DerivedIndicatorFormValues = z.infer<
  typeof createDerivedIndicatorSchema
>

export type UpdateDerivedIndicatorFormValues = z.infer<
  typeof updateDerivedIndicatorSchema
>

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
      for the broader syntax reference. This form accepts a restricted numeric
      subset.
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
      {disabled ? (
        <div className="mt-2">Expression editing is unavailable here.</div>
      ) : null}
    </div>
  )
}

const ExpressionRules = () => (
  <details className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
    <summary className="cursor-pointer font-medium text-foreground">
      Allowed expression syntax
    </summary>
    <div className="mt-3 grid gap-2">
      <div>
        Variables must use the listed placeholders, such as{' '}
        <code className="rounded bg-background px-1 py-0.5">$1</code> and{' '}
        <code className="rounded bg-background px-1 py-0.5">$2</code>.
      </div>
      <div>
        Operators:{' '}
        {allowedDerivedExpressionOperators.map((operator) => (
          <code
            key={operator}
            className="mr-1 rounded bg-background px-1 py-0.5"
          >
            {operator}
          </code>
        ))}
      </div>
      <div>
        Functions: {allowedDerivedExpressionFunctions.join(', ')}. Functions can
        use at most {derivedExpressionLimits.maxFunctionArgs} arguments.
      </div>
      <div>
        Numeric constants and parentheses are allowed. Assignments, property
        access, custom functions, strings, arrays, and objects are not allowed.
      </div>
      <div>
        Limits: {derivedExpressionLimits.maxExpressionLength} characters,{' '}
        {derivedExpressionLimits.maxNodeCount} parsed nodes, nesting depth{' '}
        {derivedExpressionLimits.maxDepth}.
      </div>
    </div>
  </details>
)

const ExpressionLabel = () => (
  <FormLabel className="flex items-center gap-2">
    Expression
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6 text-muted-foreground"
          aria-label="Derived expression syntax limits"
        >
          <Info className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-72">
        Derived expressions are restricted to numeric calculations over the
        selected indicator variables.
      </TooltipContent>
    </Tooltip>
  </FormLabel>
)

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
  const watchedIndicatorIds = form.watch('indicatorIds')
  const indicatorIds = useMemo(
    () => watchedIndicatorIds ?? [],
    [watchedIndicatorIds],
  )
  const error = useMemo(
    () => validateDerivedExpressionForIndicators({ expression, indicatorIds }),
    [expression, indicatorIds],
  )

  return (
    <FormField
      control={form.control}
      name="expression"
      rules={{
        validate: (value) =>
          validateDerivedExpressionForIndicators({
            expression: value,
            indicatorIds,
          }) ?? true,
      }}
      render={({ field }) => (
        <FormItem>
          <ExpressionLabel />
          <ExpressionFieldDescription
            indicatorIds={indicatorIds}
            indicators={indicators}
            disabled={disabled}
          />
          <ExpressionRules />
          <FormControl>
            <Textarea
              {...field}
              className="font-mono"
              disabled={disabled}
              value={field.value ?? ''}
            />
          </FormControl>
          <FormMessage />
          {error ? (
            <StatusMessage variant="error" className="mt-2">
              {error}
            </StatusMessage>
          ) : null}
          {!error && expression && expression.trim() !== '' ? (
            <StatusMessage variant="success" className="mt-2">
              Expression is valid
            </StatusMessage>
          ) : null}
        </FormItem>
      )}
    />
  )
}

export const UpdateExpressionField = ({
  form,
  indicators,
  disabled,
}: {
  form: UseFormReturn<UpdateDerivedIndicatorFormValues>
  indicators: IndicatorListItem[]
  disabled?: boolean
}) => {
  const expression = form.watch('expression')
  const indicatorIds = useMemo(
    () => indicators.map((indicator) => indicator.id),
    [indicators],
  )
  const error = useMemo(
    () => validateDerivedExpressionForIndicators({ expression, indicatorIds }),
    [expression, indicatorIds],
  )

  return (
    <FormField
      control={form.control}
      name="expression"
      rules={{
        validate: (value) =>
          validateDerivedExpressionForIndicators({
            expression: value,
            indicatorIds,
          }) ?? true,
      }}
      render={({ field }) => (
        <FormItem>
          <ExpressionLabel />
          <ExpressionFieldDescription
            indicatorIds={indicatorIds}
            indicators={indicators}
            disabled={disabled}
          />
          <ExpressionRules />
          <FormControl>
            <Textarea
              {...field}
              className="font-mono"
              disabled={disabled}
              value={field.value ?? ''}
            />
          </FormControl>
          <FormMessage />
          {error ? (
            <StatusMessage variant="error" className="mt-2">
              {error}
            </StatusMessage>
          ) : null}
          {!error && expression && expression.trim() !== '' ? (
            <StatusMessage variant="success" className="mt-2">
              Expression is valid
            </StatusMessage>
          ) : null}
        </FormItem>
      )}
    />
  )
}
