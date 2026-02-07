'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  ChartConfiguration,
  MapChartConfiguration,
  PlotChartConfiguration,
  PlotSubType,
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
import { Input } from '@repo/ui/components/ui/input'
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
import { ProductRunIndicatorsSelect } from '../../product/_components/product-run-indicators-select'
import { ProductSelect } from '../../product/_components/product-select'
import { ProductListItem } from '../../product/_hooks'
import { ChartRenderer } from './chart-renderer'

const tableDimensionOptions: { value: TableChartDimension; label: string }[] = [
  { value: 'timePoint', label: 'Time' },
  { value: 'indicatorName', label: 'Indicator' },
  { value: 'geometryOutputName', label: 'Geometry' },
]

const baseChartSchema = z.object({
  productId: z.string(),
  productRunId: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
})

const multiSeriesSelectionSchema = baseChartSchema.extend({
  indicatorIds: z.array(z.string()).optional(),
  geometryOutputIds: z.array(z.string()).optional(),
  timePoints: z.array(z.string()).optional(),
})

const plotSchema = multiSeriesSelectionSchema
  .extend({
    type: z.literal('plot'),
    subType: z.enum([
      'line',
      'area',
      'stacked-area',
      'stacked-bar',
      'grouped-bar',
      'dot',
      'donut',
    ] satisfies PlotSubType[]),
  })
  .superRefine((data, context) => {
    const multipleIndicatorsSelected =
      (data.indicatorIds?.length ?? 0) > 1 || !data.indicatorIds?.length
    const multipleGeometryOutputsSelected =
      (data.geometryOutputIds?.length ?? 0) > 1 ||
      !data.geometryOutputIds?.length
    const multipleTimePointsSelected =
      (data.timePoints?.length ?? 0) > 1 || !data.timePoints?.length

    if (data.subType === 'donut') {
      // Donut charts can only vary ONE dimension — the other two must be
      // narrowed to a single selection so each slice maps 1:1 to a record.
      const multipleCount =
        (multipleIndicatorsSelected ? 1 : 0) +
        (multipleGeometryOutputsSelected ? 1 : 0) +
        (multipleTimePointsSelected ? 1 : 0)

      if (multipleCount > 1) {
        if (multipleIndicatorsSelected) {
          context.addIssue({
            code: 'custom',
            message:
              'Donut chart can only vary one dimension — select a single indicator',
            path: ['indicatorIds'],
            input: data.indicatorIds,
          })
        }
        if (multipleGeometryOutputsSelected) {
          context.addIssue({
            code: 'custom',
            message:
              'Donut chart can only vary one dimension — select a single geometry',
            path: ['geometryOutputIds'],
            input: data.geometryOutputIds,
          })
        }
        if (multipleTimePointsSelected) {
          context.addIssue({
            code: 'custom',
            message:
              'Donut chart can only vary one dimension — select a single time point',
            path: ['timePoints'],
            input: data.timePoints,
          })
        }
      }
    } else {
      // Non-donut plot types: can't have both indicators and geometry multiple
      if (multipleIndicatorsSelected && multipleGeometryOutputsSelected) {
        context.addIssue({
          code: 'custom',
          message:
            'Can only have multiple indicators or multiple geometry outputs - not both',
          path: ['indicatorIds'],
          input: data.indicatorIds,
        })
        context.addIssue({
          code: 'custom',
          message:
            'Can only have multiple indicators or multiple geometry outputs - not both',
          path: ['geometryOutputIds'],
          input: data.geometryOutputIds,
        })
      }
    }
  }) satisfies z.ZodType<PlotChartConfiguration>

const mapSchema = baseChartSchema.extend({
  type: z.literal('map'),
  indicatorId: z.string(),
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
    xDimension: z.enum(['timePoint', 'indicatorName', 'geometryOutputName']),
    yDimension: z.enum(['timePoint', 'indicatorName', 'geometryOutputName']),
  })
  .superRefine((data, context) => {
    const multipleIndicatorsSelected =
      (data.indicatorIds?.length ?? 0) > 1 || !data.indicatorIds?.length
    const multipleGeometryOutputsSelected =
      (data.geometryOutputIds?.length ?? 0) > 1 ||
      !data.geometryOutputIds?.length
    const multipleTimePointsSelected =
      (data.timePoints?.length ?? 0) > 1 || !data.timePoints?.length

    const allowsMultipleIndicators =
      data.xDimension === 'indicatorName' || data.yDimension === 'indicatorName'
    if (!allowsMultipleIndicators && multipleIndicatorsSelected) {
      context.addIssue({
        code: 'custom',
        message: 'Indicator is not used as a table axis, one must be selected.',
        path: ['indicatorIds'],
        input: data.indicatorIds,
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
  plotSchema,
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
        <ChartRenderer
          chart={parsedFormValues.data}
          config={{
            showTitleAndDescription: true,
          }}
        />
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

  const allowsMultipleIndicators =
    chartType === 'plot' ||
    (chartType === 'table' &&
      (xDimension === 'indicatorName' || yDimension === 'indicatorName'))

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

      // Use the first indicator if available
      const firstIndicator = product.mainRun?.outputSummary?.indicators?.[0]
      if (firstIndicator) {
        form.setValue('indicatorId', firstIndicator.id)
        form.setValue('indicatorIds', [firstIndicator.id])
      } else {
        form.resetField('indicatorId')
        form.resetField('indicatorIds')
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
                      <SelectItem value="plot">Plot</SelectItem>
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
                        <SelectItem value="area">Area</SelectItem>
                        <SelectItem value="stacked-area">
                          Stacked Area
                        </SelectItem>
                        <SelectItem value="stacked-bar">Stacked Bar</SelectItem>
                        <SelectItem value="grouped-bar">Grouped Bar</SelectItem>
                        <SelectItem value="dot">Scatter</SelectItem>
                        <SelectItem value="donut">Donut</SelectItem>
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
                      form.resetField('indicatorId')
                      form.resetField('indicatorIds')
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
                name={'indicatorIds'}
                render={({ field }) => {
                  const isMultiple = allowsMultipleIndicators
                  return (
                    <FormItem>
                      {isMultiple ? (
                        <ProductRunIndicatorsSelect
                          productRunId={form.getValues('productRunId')}
                          value={field.value ?? []}
                          placeholder={'All Indicators'}
                          isMulti
                          onChange={(value) =>
                            field.onChange(value.map((v) => v.id))
                          }
                        />
                      ) : (
                        <ProductRunIndicatorsSelect
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
                name={'indicatorId'}
                render={({ field }) => (
                  <FormItem>
                    <ProductRunIndicatorsSelect
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
                        placeholder={'Select a geometry output'}
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
                    'indicatorIds',
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

            {/* Name and description */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <Input {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <Input {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />
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
