'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  ChartConfiguration,
  MapChartConfiguration,
  PlotChartConfiguration,
  TableChartConfiguration,
  TableChartDimension,
} from '@repo/plot/types'
import { Button } from '@repo/ui/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@repo/ui/components/ui/dialog'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/ui/select'
import { useCallback, useMemo, useState } from 'react'
import { useForm, UseFormReturn } from 'react-hook-form'
import { z } from 'zod'
import { FieldGroup } from '../../../../components/form/action'
import { ProductGeometryOutputSelect } from '../../product/_components/product-run-geometry-output-select'
import { ProductRunSelect } from '../../product/_components/product-run-select'
import { ProductOutputTimeSelect } from '../../product/_components/product-run-time-select'
import { ProductRunVariablesSelect } from '../../product/_components/product-run-variables-select'
import { ProductSelect } from '../../product/_components/product-select'
import { ProductListItem } from '../../product/_hooks'
import { ChartRenderer } from './chart-renderer'

const tableDimensionOptions: { value: TableChartDimension; label: string }[] = [
  { value: 'timePoint', label: 'Time' },
  { value: 'variableName', label: 'Variable' },
  { value: 'geometryOutputName', label: 'Geometry' },
]

const baseChartSchema = z.object({
  productId: z.string(),
  productRunId: z.string(),
})

const multiSeriesSelectionSchema = baseChartSchema.extend({
  variableIds: z.array(z.string()).optional(),
  geometryOutputIds: z.array(z.string()).optional(),
  timePoints: z.array(z.string()).optional(),
})

const linePlotSchema = multiSeriesSelectionSchema
  .extend({
    type: z.literal('plot'),
    subType: z.enum(['line', 'bar', 'grouped-bar', 'dot']),
  })
  .superRefine((data, context) => {
    const multipleVariablesSelected =
      (data.variableIds?.length ?? 0) > 1 || !data.variableIds?.length
    const multipleGeometryOutputsSelected =
      (data.geometryOutputIds?.length ?? 0) > 1 ||
      !data.geometryOutputIds?.length

    if (multipleVariablesSelected && multipleGeometryOutputsSelected) {
      context.addIssue({
        code: 'custom',
        message:
          'Can only have multiple variables or multiple geometry outputs - not both',
        path: ['variableIds'],
        input: data.variableIds,
      })
      context.addIssue({
        code: 'custom',
        message:
          'Can only have multiple variables or multiple geometry outputs - not both',
        path: ['geometryOutputIds'],
        input: data.geometryOutputIds,
      })
    }
  }) satisfies z.ZodType<PlotChartConfiguration>

const mapSchema = baseChartSchema.extend({
  type: z.literal('map'),
  variableId: z.string(),
  timePoint: z.string(),
  geometryOutputIds: z
    .array(z.string())
    .optional()
    .refine((val) => (val?.length ?? 0) <= 10, {
      message: 'At most 10 geometry outputs can be selected',
    }),
}) satisfies z.ZodType<MapChartConfiguration>

const tablePlotSchema = multiSeriesSelectionSchema
  .extend({
    type: z.literal('table'),
    xDimension: z.enum(['timePoint', 'variableName', 'geometryOutputName']),
    yDimension: z.enum(['timePoint', 'variableName', 'geometryOutputName']),
  })
  .superRefine((data, context) => {
    const multipleVariablesSelected =
      (data.variableIds?.length ?? 0) > 1 || !data.variableIds?.length
    const multipleGeometryOutputsSelected =
      (data.geometryOutputIds?.length ?? 0) > 1 ||
      !data.geometryOutputIds?.length
    const multipleTimePointsSelected =
      (data.timePoints?.length ?? 0) > 1 || !data.timePoints?.length

    const allowsMultipleVariables =
      data.xDimension === 'variableName' || data.yDimension === 'variableName'
    if (!allowsMultipleVariables && multipleVariablesSelected) {
      context.addIssue({
        code: 'custom',
        message: 'Variable is not used as a table axis, one must be selected.',
        path: ['variableIds'],
        input: data.variableIds,
      })
    }

    const allowsMultipleGeometry =
      data.xDimension === 'geometryOutputName' ||
      data.yDimension === 'geometryOutputName'
    if (!allowsMultipleGeometry && multipleGeometryOutputsSelected) {
      context.addIssue({
        code: 'custom',
        message:
          'Geometry output is not used as a table axis, one must be selected.',
        path: ['geometryOutputIds'],
        input: data.geometryOutputIds,
      })
    }

    const allowsMultipleTimePoints =
      data.xDimension === 'timePoint' || data.yDimension === 'timePoint'
    if (!allowsMultipleTimePoints && multipleTimePointsSelected) {
      context.addIssue({
        code: 'custom',
        message:
          'Time point is not used as a table axis, one must be selected.',
        path: ['timePoints'],
        input: data.timePoints,
      })
    }
  }) satisfies z.ZodType<TableChartConfiguration>

const chartSchema = z.discriminatedUnion('type', [
  linePlotSchema,
  mapSchema,
  tablePlotSchema,
]) satisfies z.ZodType<ChartConfiguration>

const ChartPreview = ({
  form,
}: {
  form: UseFormReturn<z.infer<typeof chartSchema>>
}) => {
  const formValues = form.watch()

  const parsedFormValues = useMemo(() => {
    return form.formState.isValid ? chartSchema.safeParse(formValues) : null
  }, [form.formState.isValid, formValues])

  return (
    <FieldGroup className="flex-1 min-h-96" title="Preview">
      {parsedFormValues?.success ? (
        <ChartRenderer chart={parsedFormValues.data} />
      ) : (
        <div className="flex h-full min-h-[240px] items-center justify-center px-4 text-center text-sm text-muted-foreground">
          Invalid chart configuration
        </div>
      )}
    </FieldGroup>
  )
}

export const ChartFormDialog = ({
  buttonText,
  chart,
  onSubmit,
  onOpen,
  onClose,
}: {
  buttonText?: string
  chart: ChartConfiguration | null
  onSubmit: (data: z.infer<typeof chartSchema>) => void
  onOpen?: () => void
  onClose?: () => void
}) => {
  const [open, setOpen] = useState(false)
  const form = useForm<z.infer<typeof chartSchema>>({
    resolver: zodResolver(chartSchema),
    defaultValues: chart ?? undefined,
    mode: 'all',
    criteriaMode: 'all',
  })
  const chartType = form.watch('type')
  const xDimension = form.watch('xDimension')
  const yDimension = form.watch('yDimension')

  const allowsMultipleVariables =
    chartType === 'plot' ||
    (chartType === 'table' &&
      (xDimension === 'variableName' || yDimension === 'variableName'))

  const allowsMultipleGeometry =
    chartType === 'plot' ||
    chartType === 'map' ||
    (chartType === 'table' &&
      (xDimension === 'geometryOutputName' ||
        yDimension === 'geometryOutputName'))

  const allowsMultipleTimePoints =
    chartType === 'plot' ||
    (chartType === 'table' &&
      (xDimension === 'timePoint' || yDimension === 'timePoint'))

  const setDefaultsForProduct = useCallback(
    (product: ProductListItem) => {
      form.setValue('productId', product.id)
      if (product.mainRunId) form.setValue('productRunId', product.mainRunId)

      // Use the first variable if available
      const firstVariable = product.mainRun?.outputSummary?.variables?.[0]
      if (firstVariable) {
        form.setValue('variableId', firstVariable.variable.id)
        form.setValue('variableIds', [firstVariable.variable.id])
      } else {
        form.resetField('variableId')
        form.resetField('variableIds')
      }
      form.resetField('geometryOutputIds')

      // If there is only one time point, set it and the time points array
      if (product.mainRun?.outputSummary?.timePoints?.length === 1) {
        form.setValue(
          'timePoint',
          product.mainRun?.outputSummary?.timePoints?.[0] ?? '',
        )
        form.setValue(
          'timePoints',
          product.mainRun?.outputSummary?.timePoints ?? [],
        )
      } else {
        form.resetField('timePoint')
        form.resetField('timePoints')
      }

      form.trigger()
    },
    [form],
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        setOpen(open)
        if (open) {
          onOpen?.()
        } else {
          onClose?.()
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <Form {...form}>
          <form
            className="grid gap-3 border-b border-gray-200 pb-8"
            onSubmit={(e) => {
              form.handleSubmit(onSubmit)(e)
              setOpen(false)
              onClose?.()
              e.preventDefault()
              e.stopPropagation()
            }}
          >
            <DialogHeader>
              <DialogTitle>{buttonText}</DialogTitle>
              <DialogDescription>
                Choose the type of chart to render inside this report.
              </DialogDescription>
            </DialogHeader>

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chart Type</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value)
                      form.resetField('subType')
                      form.resetField('xDimension')
                      form.resetField('yDimension')
                    }}
                  >
                    <SelectTrigger id="report-chart-type">
                      <SelectValue placeholder="Select a chart type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="plot">Line plot</SelectItem>
                      <SelectItem value="table">Table</SelectItem>
                      <SelectItem value="map">Map</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            {chartType === 'plot' && (
              <FormField
                control={form.control}
                name="subType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sub Type</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => field.onChange(value)}
                    >
                      <SelectTrigger id="report-chart-sub-type">
                        <SelectValue placeholder="Select a sub type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="line">Line</SelectItem>
                        <SelectItem value="bar">Bar</SelectItem>
                        <SelectItem value="grouped-bar">Grouped Bar</SelectItem>
                        <SelectItem value="dot">Dot</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            )}

            {chartType === 'table' && (
              <FieldGroup className="flex-1" title="Table Axes">
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="xDimension"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>X (Columns)</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={(value) =>
                            field.onChange(value as TableChartDimension)
                          }
                        >
                          <SelectTrigger id="report-chart-x-dimension">
                            <SelectValue placeholder="Select column dimension" />
                          </SelectTrigger>
                          <SelectContent>
                            {tableDimensionOptions.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="yDimension"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Y (Rows)</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={(value) =>
                            field.onChange(value as TableChartDimension)
                          }
                        >
                          <SelectTrigger id="report-chart-y-dimension">
                            <SelectValue placeholder="Select row dimension" />
                          </SelectTrigger>
                          <SelectContent>
                            {tableDimensionOptions.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </FieldGroup>
            )}

            <FormField
              control={form.control}
              name={'productId'}
              render={({ field }) => (
                <FormItem>
                  <ProductSelect
                    {...field}
                    onChange={(product) => {
                      field.onChange(product?.id ?? null)
                      if (product) setDefaultsForProduct(product)
                    }}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={'productRunId'}
              render={({ field }) => (
                <FormItem>
                  <ProductRunSelect
                    productId={form.getValues('productId')}
                    {...field}
                    onChange={(productRun) => {
                      field.onChange(productRun?.id ?? null)
                      form.resetField('variableId')
                      form.resetField('variableIds')
                      form.resetField('geometryOutputIds')
                      form.resetField('timePoint')
                    }}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            {(chartType === 'plot' || chartType === 'table') && (
              <FormField
                control={form.control}
                name={'variableIds'}
                render={({ field }) => {
                  const isMultiple = allowsMultipleVariables
                  return (
                    <FormItem>
                      {isMultiple ? (
                        <ProductRunVariablesSelect
                          productRunId={form.getValues('productRunId')}
                          value={field.value ?? []}
                          placeholder={'All Variables'}
                          isMulti
                          onChange={(value) =>
                            field.onChange(value.map((v) => v.id))
                          }
                        />
                      ) : (
                        <ProductRunVariablesSelect
                          productRunId={form.getValues('productRunId')}
                          value={field.value?.[0] ?? null}
                          onChange={(value) =>
                            field.onChange(value ? [value.id] : undefined)
                          }
                        />
                      )}
                      <FormMessage />
                    </FormItem>
                  )
                }}
              />
            )}

            {chartType === 'map' && (
              <FormField
                control={form.control}
                name={'variableId'}
                render={({ field }) => (
                  <FormItem>
                    <ProductRunVariablesSelect
                      productRunId={form.getValues('productRunId')}
                      value={field.value ?? null}
                      onChange={(value) => field.onChange(value?.id ?? null)}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name={'geometryOutputIds'}
              render={({ field }) => {
                const isMultiple = allowsMultipleGeometry
                return (
                  <FormItem>
                    {isMultiple ? (
                      <ProductGeometryOutputSelect
                        title={
                          chartType === 'map'
                            ? 'Zoom to selected geometry'
                            : undefined
                        }
                        productRunId={form.getValues('productRunId')}
                        value={field.value ?? []}
                        placeholder={'All Geometry Outputs'}
                        isMulti
                        onChange={(value) => {
                          field.onChange(value.map((v) => v.id))
                        }}
                      />
                    ) : (
                      <ProductGeometryOutputSelect
                        productRunId={form.getValues('productRunId')}
                        value={field.value?.find((id) => id) ?? null}
                        onChange={(value) =>
                          field.onChange(value ? [value.id] : undefined)
                        }
                      />
                    )}
                    <FormMessage />
                  </FormItem>
                )
              }}
            />

            {(chartType === 'plot' || chartType === 'table') && (
              <FormField
                control={form.control}
                name={'timePoints'}
                rules={{
                  deps: [
                    'geometryOutputIds',
                    'variableIds',
                    'xDimension',
                    'yDimension',
                  ],
                }}
                render={({ field }) => {
                  const isMultiple = allowsMultipleTimePoints
                  return (
                    <FormItem>
                      {isMultiple ? (
                        <ProductOutputTimeSelect
                          productRunId={form.getValues('productRunId')}
                          value={field.value ?? []}
                          placeholder={'All Time Points'}
                          isMulti
                          onChange={(value) => field.onChange(value)}
                        />
                      ) : (
                        <ProductOutputTimeSelect
                          productRunId={form.getValues('productRunId')}
                          value={field.value?.[0] ?? null}
                          onChange={(value) =>
                            field.onChange(value ? [value] : undefined)
                          }
                        />
                      )}
                      <FormMessage />
                    </FormItem>
                  )
                }}
              />
            )}

            {chartType === 'map' && (
              <FormField
                control={form.control}
                name={'timePoint'}
                render={({ field }) => (
                  <FormItem>
                    <ProductOutputTimeSelect
                      productRunId={form.getValues('productRunId')}
                      value={field.value ?? null}
                      onChange={(value) => field.onChange(value)}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <ChartPreview form={form} />

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!form.formState.isValid}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
