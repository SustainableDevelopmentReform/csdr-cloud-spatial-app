'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  ChartConfiguration,
  PlotChartConfiguration,
  MapChartConfiguration,
  TableChartConfiguration,
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
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { FieldGroup } from '../../../../components/action'
import { ProductGeometryOutputSelect } from '../../products/_components/product-geometry-output-select'
import { ProductOutputTimeSelect } from '../../products/_components/product-output-time-select'
import { ProductRunSelect } from '../../products/_components/product-run-select'
import { ProductSelect } from '../../products/_components/product-select'
import { VariablesSelect } from '../../variables/_components/variables-select'

const multiSeriesSelectionSchema = z
  .object({
    productId: z.string(),
    productRunId: z.string(),
    variableIds: z.array(z.string()).optional(),
    geometryOutputIds: z.array(z.string()).optional(),
  })
  .superRefine((data, context) => {
    if (
      (data.variableIds?.length ?? 0) > 1 &&
      (data.geometryOutputIds?.length ?? 0) > 1
    ) {
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
  })

const linePlotSchema = multiSeriesSelectionSchema.extend({
  type: z.literal('plot'),
  subType: z.enum(['line', 'bar', 'grouped-bar', 'dot']),
}) satisfies z.ZodType<PlotChartConfiguration>

const mapSchema = z.object({
  type: z.literal('map'),
  productId: z.string(),
  productRunId: z.string(),
  variableId: z.string(),
  timePoint: z.string(),
}) satisfies z.ZodType<MapChartConfiguration>

const tablePlotSchema = multiSeriesSelectionSchema.extend({
  type: z.literal('table'),
  groupBy: z.enum(['variableName', 'geometryOutputName']),
}) satisfies z.ZodType<TableChartConfiguration>

const chartSchema = z.union([
  linePlotSchema,
  mapSchema,
  tablePlotSchema,
]) satisfies z.ZodType<ChartConfiguration>

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
  })
  const chartType = form.watch('type')
  const groupBy = form.watch('groupBy')

  useEffect(() => {
    if (chartType === 'table' && !groupBy) {
      form.setValue('groupBy', 'variableName', {
        shouldValidate: true,
        shouldDirty: false,
      })
    }
  }, [chartType, groupBy, form])

  useEffect(() => {
    if (chartType !== 'table' && form.getValues('groupBy')) {
      form.resetField('groupBy')
    }
  }, [chartType, form])

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
            onSubmit={form.handleSubmit((values) => {
              onSubmit(values)
              setOpen(false)
              onClose?.()
            })}
          >
            <DialogHeader>
              <DialogTitle>{buttonText}</DialogTitle>
              <DialogDescription>
                Choose the type of chart to render inside this report.
              </DialogDescription>
            </DialogHeader>

            <FieldGroup className="flex-1" title="Select Chart Type">
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
                        if (value === 'plot') {
                          form.resetField('subType')
                          form.resetField('variableId')
                          form.resetField('timePoint')
                        } else if (value === 'map') {
                          form.resetField('subType')
                          form.resetField('groupBy')
                          form.resetField('variableIds')
                          form.resetField('geometryOutputIds')
                        } else if (value === 'table') {
                          form.resetField('subType')
                          form.resetField('variableId')
                          form.resetField('timePoint')
                          if (!form.getValues('groupBy')) {
                            form.setValue('groupBy', 'variableName', {
                              shouldValidate: true,
                              shouldDirty: false,
                            })
                          }
                        }
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
            </FieldGroup>

            {chartType === 'plot' && (
              <FieldGroup className="flex-1" title="Sub Type">
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
                          <SelectItem value="grouped-bar">
                            Grouped Bar
                          </SelectItem>
                          <SelectItem value="dot">Dot</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </FieldGroup>
            )}

            {chartType === 'table' && (
              <FieldGroup className="flex-1" title="Grouping">
                <FormField
                  control={form.control}
                  name="groupBy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Group By</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value)
                          if (value === 'variableName') {
                            const geometryOutputs =
                              form.getValues('geometryOutputIds')
                            if ((geometryOutputs?.length ?? 0) > 1) {
                              form.setValue(
                                'geometryOutputIds',
                                geometryOutputs?.slice(0, 1),
                                { shouldValidate: true },
                              )
                            }
                          } else if (value === 'geometryOutputName') {
                            const variableIds = form.getValues('variableIds')
                            if ((variableIds?.length ?? 0) > 1) {
                              form.setValue(
                                'variableIds',
                                variableIds?.slice(0, 1),
                                { shouldValidate: true },
                              )
                            }
                          }
                        }}
                      >
                        <SelectTrigger id="report-chart-group-by">
                          <SelectValue placeholder="Select grouping dimension" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="variableName">Variable</SelectItem>
                          <SelectItem value="geometryOutputName">
                            Geometry Output
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FieldGroup>
            )}

            <FormField
              control={form.control}
              name={'productId'}
              render={({ field }) => (
                <FormItem>
                  <ProductSelect
                    {...field}
                    onChange={(id, product) => {
                      field.onChange(id)
                      form.resetField('productRunId')
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

            <FormField
              control={form.control}
              name={'productRunId'}
              render={({ field }) => (
                <FormItem>
                  <ProductRunSelect
                    productId={form.getValues('productId')}
                    {...field}
                    onChange={(id, productRun) => {
                      field.onChange(id)
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
                  const isMultiple =
                    chartType === 'plot' || groupBy === 'variableName'
                  return (
                    <FormItem>
                      {isMultiple ? (
                        <VariablesSelect
                          productRunId={form.getValues('productRunId')}
                          value={field.value ?? []}
                          multiple
                          onSelect={(value) => field.onChange(value)}
                        />
                      ) : (
                        <VariablesSelect
                          productRunId={form.getValues('productRunId')}
                          value={field.value?.[0] ?? null}
                          onSelect={(value) =>
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
                name={'variableId'}
                render={({ field }) => (
                  <FormItem>
                    <VariablesSelect
                      productRunId={form.getValues('productRunId')}
                      value={field.value ?? null}
                      onSelect={(value) => field.onChange(value)}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {(chartType === 'plot' || chartType === 'table') && (
              <FormField
                control={form.control}
                name={'geometryOutputIds'}
                render={({ field }) => {
                  const isMultiple =
                    chartType === 'plot' || groupBy === 'geometryOutputName'
                  return (
                    <FormItem>
                      {isMultiple ? (
                        <ProductGeometryOutputSelect
                          productRunId={form.getValues('productRunId')}
                          value={field.value ?? []}
                          multiple
                          onSelect={(value) => field.onChange(value)}
                        />
                      ) : (
                        <ProductGeometryOutputSelect
                          productRunId={form.getValues('productRunId')}
                          value={field.value?.[0] ?? null}
                          onSelect={(value) =>
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
                      {...field}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
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
