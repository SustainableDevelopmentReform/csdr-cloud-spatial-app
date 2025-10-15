'use client'

import { LinePlot } from '@repo/plot/LinePlot'
import {
  ChartConfiguration,
  LinePlotChartConfiguration,
  MapChartConfiguration,
} from '@repo/plot/types'
import type { ChartFormBuilder } from '@repo/ui/components/tip-tap/node/chart-node/chart-node-shared'
import * as React from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
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
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/ui/form'
import {
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from '@repo/ui/components/ui/select'
import { toast } from '@repo/ui/components/ui/sonner'
import { useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { FieldGroup } from '../../../../components/action'
import { ProductGeometryOutputSelect } from '../../products/_components/product-geometry-output-select'
import { ProductOutputTimeSelect } from '../../products/_components/product-output-time-select'
import { ProductSelect } from '../../products/_components/product-select'
import { useProductOutputsExport } from '../../products/_hooks'
import { VariablesSelect } from '../../variables/_components/variables-select'
import { ProductRunSelect } from '../../products/_components/product-run-select'
import { useGeometriesRun } from '../../geometries/_hooks'
import { useProductRun } from '../../products/_hooks'
import { useVariable } from '../../variables/_hooks'
import GeometriesMapViewer from '../../geometries/_components/geometries-map-viewer'

const noop = () => {}

const ChartPlaceholder = () => (
  <div className="flex h-full min-h-[240px] items-center justify-center px-4 text-center text-sm text-muted-foreground">
    No chart configured yet. Use the edit button to choose a chart type.
  </div>
)

const UnsupportedChart = ({ type }: { type: string }) => (
  <div className="flex h-full min-h-[240px] items-center justify-center px-4 text-center text-sm text-muted-foreground">
    Chart type <strong className="ml-1 font-semibold">{type}</strong> is not
    supported yet.
  </div>
)

const LinePlotContainer = ({
  chart,
}: {
  chart: LinePlotChartConfiguration
}) => {
  const { data: productOutputs } = useProductOutputsExport(chart.productRunId, {
    variableId: chart.variableId,
    geometryOutputId: chart.geometryOutputId,
  })
  return (
    <LinePlot
      data={productOutputs?.data ?? []}
      x={'timePoint'}
      y={'value'}
      onSelect={noop}
    />
  )
}

const MapContainer = ({ chart }: { chart: MapChartConfiguration }) => {
  const { data: productRun } = useProductRun(chart.productRunId)
  const { data: geometriesRun } = useGeometriesRun(productRun?.geometriesRun.id)
  const { data: variable } = useVariable(chart.variableId)
  const { data: productOutputs } = useProductOutputsExport(chart.productRunId, {
    variableId: chart.variableId,
    timePoint: chart.timePoint,
  })
  return (
    <GeometriesMapViewer
      geometriesRun={geometriesRun}
      variable={variable}
      productRun={productRun}
      productOutputs={productOutputs?.data}
      onSelect={noop}
    />
  )
}

const renderChart = (chart: ChartConfiguration | null) => {
  if (!chart) {
    return <ChartPlaceholder />
  }

  switch (chart.type) {
    case 'linePlot': {
      return <LinePlotContainer chart={chart} />
    }
    case 'map': {
      return <MapContainer chart={chart} />
    }
    default:
      return <UnsupportedChart type={(chart as any).type} />
  }
}

const linePlotSchema = z.object({
  type: z.literal('linePlot'),
  productId: z.string(),
  productRunId: z.string(),
  variableId: z.string(),
  geometryOutputId: z.string(),
}) satisfies z.ZodType<LinePlotChartConfiguration>

const mapSchema = z.object({
  type: z.literal('map'),
  productId: z.string(),
  productRunId: z.string(),
  variableId: z.string(),
  timePoint: z.string(),
}) satisfies z.ZodType<MapChartConfiguration>

const chartSchema = z.union([
  linePlotSchema,
  mapSchema,
]) satisfies z.ZodType<ChartConfiguration>

const useReportChartEditor = ({
  chart,
  onChartChange,
}: {
  chart: ChartConfiguration | null
  onChartChange: (chart: ChartConfiguration | null) => void
}) => {
  const [open, setOpen] = React.useState(false)

  const form = useForm<z.infer<typeof chartSchema>>({
    resolver: zodResolver(chartSchema),
    defaultValues: chart ?? undefined,
  })

  console.log(form.getValues())

  const handleSubmit = useCallback(
    (data: z.infer<typeof chartSchema>) => {
      if (data.type === 'linePlot') {
        onChartChange(data)
        setOpen(false)
        return
      } else if (data.type === 'map') {
        onChartChange(data)
        setOpen(false)
        return
      }

      toast.error('Invalid chart type')
      setOpen(false)
    },
    [onChartChange, setOpen],
  )

  const controls = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Edit chart
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <Form {...form}>
          <form
            className="grid gap-3 border-b border-gray-200 pb-8"
            onSubmit={form.handleSubmit(handleSubmit)}
          >
            <DialogHeader>
              <DialogTitle>Edit chart</DialogTitle>
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
                      onValueChange={(value) => field.onChange(value)}
                    >
                      <SelectTrigger id="report-chart-type">
                        <SelectValue placeholder="Select a chart type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="linePlot">Line plot</SelectItem>
                      </SelectContent>
                      <SelectContent>
                        <SelectItem value="map">Map</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </FieldGroup>

            <FormField
              control={form.control}
              name={'productId'}
              render={({ field }) => (
                <FormItem>
                  <ProductSelect {...field} />
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
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={'variableId'}
              render={({ field }) => (
                <FormItem>
                  <VariablesSelect
                    productRunId={form.getValues('productRunId')}
                    {...field}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.getValues('type') === 'linePlot' && (
              <FormField
                control={form.control}
                name={'geometryOutputId'}
                render={({ field }) => (
                  <FormItem>
                    <ProductGeometryOutputSelect
                      productRunId={form.getValues('productRunId')}
                      {...field}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {form.getValues('type') === 'map' && (
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

  return { controls }
}

export const reportChartFormBuilder: ChartFormBuilder = {
  renderChart,
  useChartEditor: ({ chart, onChartChange }) =>
    useReportChartEditor({ chart, onChartChange }),
}
