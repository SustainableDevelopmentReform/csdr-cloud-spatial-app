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
import { cn } from '@repo/ui/lib/utils'
import {
  AlertTriangle,
  AreaChart as AreaChartIcon,
  BarChart as BarChartIcon,
  BarChart3,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Layers,
  type LucideIcon,
  Map as MapIcon,
  PieChart as PieChartIcon,
  Table2,
  TrendingUp,
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { z } from 'zod'
import { FieldGroup } from '../../../../components/form/action'
import { ProductGeometryOutputSelect } from '../../product/_components/product-run-geometry-output-select'
import { ProductRunSelect } from '../../product/_components/product-run-select'
import { ProductOutputTimeSelect } from '../../product/_components/product-run-time-select'
import { ProductRunIndicatorsSelect } from '../../product/_components/product-run-indicators-select'
import { ProductSelect } from '../../product/_components/product-select'
import { useGeometryOutputs } from '../../geometries/_hooks'
import { ProductListItem, useProductRun } from '../../product/_hooks'
import { ChartRenderer } from './chart-renderer'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_RECOMMENDED_SERIES = 8

const STEP_LABELS = ['Data Source', 'Chart Type', 'Configure'] as const
const STEP_DESCRIPTIONS = [
  'Select a product and run to source data from',
  'Choose how to visualize your data',
  'Fine-tune data selections and add details',
] as const

type SeriesDimension = 'indicators' | 'geometries' | 'time'

interface VisualTypeOption {
  key: string
  type: 'plot' | 'map' | 'table'
  subType?: PlotSubType
  label: string
  icon: LucideIcon
  description: string
}

const VISUAL_TYPES: VisualTypeOption[] = [
  {
    key: 'line',
    type: 'plot',
    subType: 'line',
    label: 'Line',
    icon: TrendingUp,
    description: 'Trends over time',
  },
  {
    key: 'area',
    type: 'plot',
    subType: 'area',
    label: 'Area',
    icon: AreaChartIcon,
    description: 'Filled trends',
  },
  {
    key: 'stacked-area',
    type: 'plot',
    subType: 'stacked-area',
    label: 'Stacked Area',
    icon: Layers,
    description: 'Part-to-whole over time',
  },
  {
    key: 'stacked-bar',
    type: 'plot',
    subType: 'stacked-bar',
    label: 'Stacked Bar',
    icon: BarChart3,
    description: 'Totals by category',
  },
  {
    key: 'grouped-bar',
    type: 'plot',
    subType: 'grouped-bar',
    label: 'Grouped Bar',
    icon: BarChartIcon,
    description: 'Side-by-side comparison',
  },
  {
    key: 'dot',
    type: 'plot',
    subType: 'dot',
    label: 'Scatter',
    icon: CircleDot,
    description: 'Value distribution',
  },
  {
    key: 'donut',
    type: 'plot',
    subType: 'donut',
    label: 'Donut',
    icon: PieChartIcon,
    description: 'Proportions',
  },
  {
    key: 'table',
    type: 'table',
    label: 'Table',
    icon: Table2,
    description: 'Colour-coded grid',
  },
  {
    key: 'map',
    type: 'map',
    label: 'Map',
    icon: MapIcon,
    description: 'Spatial view',
  },
]

const tableDimensionOptions: { value: TableChartDimension; label: string }[] = [
  { value: 'timePoint', label: 'Time' },
  { value: 'indicatorName', label: 'Indicator' },
  { value: 'geometryOutputName', label: 'Geometry' },
]

// ---------------------------------------------------------------------------
// Schemas (unchanged)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getVisualTypeKey(
  type: string | undefined,
  subType: string | undefined,
): string | undefined {
  if (type === 'plot' && subType) return subType
  if (type === 'table') return 'table'
  if (type === 'map') return 'map'
  return undefined
}

function inferSeriesDimension(
  chart: ChartConfiguration | null,
): SeriesDimension {
  if (!chart) return 'indicators'
  if (chart.type === 'map') return 'indicators'

  const indicatorIds = 'indicatorIds' in chart ? chart.indicatorIds : undefined
  const geometryOutputIds =
    'geometryOutputIds' in chart ? chart.geometryOutputIds : undefined
  const timePoints = 'timePoints' in chart ? chart.timePoints : undefined

  const multiIndicators = !indicatorIds?.length || indicatorIds.length > 1
  const multiGeometries =
    !geometryOutputIds?.length || geometryOutputIds.length > 1
  const multiTime = !timePoints?.length || timePoints.length > 1

  if (chart.type === 'plot' && chart.subType === 'donut') {
    if (multiTime && !multiIndicators && !multiGeometries) return 'time'
    if (multiGeometries && !multiIndicators) return 'geometries'
    return 'indicators'
  }

  if (multiGeometries && !multiIndicators) return 'geometries'
  return 'indicators'
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const WizardSteps = ({
  current,
  onNavigate,
  canNavigateTo,
}: {
  current: number
  onNavigate: (step: number) => void
  canNavigateTo: (step: number) => boolean
}) => (
  <nav className="flex items-center gap-0.5" aria-label="Wizard steps">
    {STEP_LABELS.map((label, index) => {
      const isCurrent = index === current
      const isPast = index < current
      const isAccessible = canNavigateTo(index)

      return (
        <div key={label} className="flex items-center">
          {index > 0 && (
            <div
              className={cn(
                'mx-1 h-px w-4',
                isPast || isCurrent ? 'bg-primary' : 'bg-border',
              )}
            />
          )}
          <button
            type="button"
            disabled={!isAccessible}
            onClick={() => isAccessible && onNavigate(index)}
            className={cn(
              'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
              isCurrent && 'bg-primary text-primary-foreground',
              !isCurrent &&
                isPast &&
                'bg-primary/10 text-primary hover:bg-primary/20',
              !isCurrent &&
                !isPast &&
                isAccessible &&
                'bg-muted text-muted-foreground hover:bg-muted/80',
              !isAccessible &&
                'cursor-not-allowed bg-muted/50 text-muted-foreground/40',
            )}
          >
            {isPast && !isCurrent ? (
              <Check className="h-3 w-3" />
            ) : (
              <span className="flex h-4 w-4 items-center justify-center text-[10px] font-semibold">
                {index + 1}
              </span>
            )}
            <span className="hidden sm:inline">{label}</span>
          </button>
        </div>
      )
    })}
  </nav>
)

const TypeGrid = ({
  selected,
  onSelect,
}: {
  selected: string | undefined
  onSelect: (vt: VisualTypeOption) => void
}) => (
  <div className="grid grid-cols-3 gap-2">
    {VISUAL_TYPES.map((vt) => {
      const Icon = vt.icon
      const isSelected = selected === vt.key
      return (
        <button
          key={vt.key}
          type="button"
          onClick={() => onSelect(vt)}
          className={cn(
            'flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-center transition-colors',
            isSelected
              ? 'border-primary bg-primary/5'
              : 'border-transparent bg-muted/40 hover:border-border hover:bg-muted/60',
          )}
        >
          <Icon
            className={cn(
              'h-6 w-6',
              isSelected ? 'text-primary' : 'text-muted-foreground',
            )}
          />
          <span
            className={cn(
              'text-xs font-medium leading-none',
              isSelected ? 'text-primary' : 'text-foreground',
            )}
          >
            {vt.label}
          </span>
          <span className="text-[10px] leading-tight text-muted-foreground">
            {vt.description}
          </span>
        </button>
      )
    })}
  </div>
)

const SeriesDimensionToggle = ({
  value,
  onChange,
  isDonut,
}: {
  value: SeriesDimension
  onChange: (dim: SeriesDimension) => void
  isDonut: boolean
}) => {
  const options: { key: SeriesDimension; label: string }[] = isDonut
    ? [
        { key: 'indicators', label: 'Indicators' },
        { key: 'geometries', label: 'Geometries' },
        { key: 'time', label: 'Time points' },
      ]
    : [
        { key: 'indicators', label: 'Indicators' },
        { key: 'geometries', label: 'Geometries' },
      ]

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">
        {isDonut ? 'Slice by' : 'Compare by'}
      </span>
      <div className="flex gap-1.5">
        {options.map((opt) => (
          <Button
            key={opt.key}
            type="button"
            size="sm"
            variant={value === opt.key ? 'default' : 'outline'}
            className="h-7 text-xs"
            onClick={() => onChange(opt.key)}
          >
            {opt.label}
          </Button>
        ))}
      </div>
    </div>
  )
}

const SeriesWarning = ({ count }: { count: number | null }) => {
  if (count === null || count <= MAX_RECOMMENDED_SERIES) return null
  return (
    <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/50 dark:text-amber-200">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      <span>
        {count} series selected — charts work best with {MAX_RECOMMENDED_SERIES}{' '}
        or fewer. Consider narrowing your selection.
      </span>
    </div>
  )
}

/**
 * Build a ChartConfiguration from form values leniently — bypasses superRefine
 * so the preview renders even while the user is still filling in fields.
 * Returns null only when the essential fields are missing.
 */
function buildPreviewConfig(
  formValues: z.infer<typeof chartSchema>,
): ChartConfiguration | null {
  if (!formValues.productRunId) return null

  // Strict parse: if it passes, use it (includes superRefine)
  const strict = chartSchema.safeParse(formValues)
  if (strict.success) return strict.data

  // Lenient fallback: construct directly, skip cross-field validation
  if (formValues.type === 'plot') {
    if (!formValues.subType) return null
    return {
      type: 'plot',
      subType: formValues.subType,
      productRunId: formValues.productRunId,
      indicatorIds: formValues.indicatorIds,
      geometryOutputIds: formValues.geometryOutputIds,
      timePoints: formValues.timePoints,
      title: formValues.title,
      description: formValues.description,
    }
  }
  if (formValues.type === 'map') {
    if (!formValues.indicatorId || !formValues.timePoint) return null
    return {
      type: 'map',
      productRunId: formValues.productRunId,
      indicatorId: formValues.indicatorId,
      timePoint: formValues.timePoint,
      geometryOutputIds: formValues.geometryOutputIds,
      title: formValues.title,
      description: formValues.description,
    }
  }
  if (formValues.type === 'table') {
    if (!formValues.xDimension || !formValues.yDimension) return null
    return {
      type: 'table',
      productRunId: formValues.productRunId,
      xDimension: formValues.xDimension,
      yDimension: formValues.yDimension,
      indicatorIds: formValues.indicatorIds,
      geometryOutputIds: formValues.geometryOutputIds,
      timePoints: formValues.timePoints,
      title: formValues.title,
      description: formValues.description,
    }
  }
  return null
}

const ChartPreview = ({
  form,
}: {
  form: UseFormReturn<z.infer<typeof chartSchema>>
}) => {
  const formValues = form.watch()

  const chartConfig = useMemo(
    () => buildPreviewConfig(formValues),
    [formValues],
  )

  if (!chartConfig) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed bg-muted/20 px-4 text-center text-xs text-muted-foreground">
        Complete the configuration to see a preview
      </div>
    )
  }

  return (
    <div className="flex h-[300px] flex-col overflow-hidden rounded-lg border bg-card">
      <ChartRenderer
        chart={chartConfig}
        config={{ showTitleAndDescription: true }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

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
  const isEditing = chart !== null

  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(isEditing ? 2 : 0)

  const form = useForm<z.infer<typeof chartSchema>>({
    resolver: zodResolver(chartSchema),
    defaultValues: chart ?? undefined,
    mode: 'all',
    criteriaMode: 'all',
  })

  // Watch fields needed for conditional rendering
  const chartType = form.watch('type')
  const subType = form.watch('subType')
  const productId = form.watch('productId')
  const productRunId = form.watch('productRunId')
  const indicatorIds = form.watch('indicatorIds')
  const geometryOutputIds = form.watch('geometryOutputIds')
  const timePoints = form.watch('timePoints')
  const xDimension = form.watch('xDimension')
  const yDimension = form.watch('yDimension')

  const [seriesDimension, setSeriesDimension] = useState<SeriesDimension>(() =>
    inferSeriesDimension(chart),
  )

  // Product summary for series count warnings + default values for auto-fill
  const [productSummary, setProductSummary] = useState<{
    indicatorCount: number
    timePointCount: number
    firstIndicatorId: string | null
    firstTimePoint: string | null
  } | null>(null)

  // Fetch first geometry output for auto-fill defaults
  const { data: productRunDetail } = useProductRun(
    productRunId ?? undefined,
    !!productRunId,
  )
  const { data: geometryOutputsData } = useGeometryOutputs(
    productRunDetail?.geometriesRun?.id,
    { size: 1 },
    false,
    !!productRunDetail?.geometriesRun?.id,
  )
  const firstGeometryId = geometryOutputsData?.data?.[0]?.id ?? null

  // Derive defaults from fetched product run detail (works for both create and edit flows)
  const hookDefaults = useMemo(() => {
    const summary = productRunDetail?.outputSummary
    if (!summary) return null
    const firstInd = summary.indicators?.[0]
    const firstTp = summary.timePoints?.[0]
    return {
      firstIndicatorId: firstInd?.indicator?.id ?? null,
      firstTimePoint: firstTp
        ? typeof firstTp === 'string'
          ? firstTp
          : (firstTp as Date).toISOString()
        : null,
    }
  }, [productRunDetail])

  // --- Derived state ---

  const visualTypeKey = getVisualTypeKey(chartType, subType)
  const isDonut = chartType === 'plot' && subType === 'donut'

  const sourceComplete = !!productId && !!productRunId
  const typeComplete = !!chartType && (chartType !== 'plot' || !!subType)

  const canNavigateTo = useCallback(
    (targetStep: number) => {
      if (targetStep === 0) return true
      if (targetStep === 1) return sourceComplete
      if (targetStep === 2) return sourceComplete && typeComplete
      return false
    },
    [sourceComplete, typeComplete],
  )

  // Multi/single select logic per data dimension
  const { isIndicatorsMulti, isGeometriesMulti, isTimeMulti } = useMemo(() => {
    if (chartType === 'map') {
      return {
        isIndicatorsMulti: false,
        isGeometriesMulti: true,
        isTimeMulti: false,
      }
    }
    if (chartType === 'table') {
      return {
        isIndicatorsMulti:
          xDimension === 'indicatorName' || yDimension === 'indicatorName',
        isGeometriesMulti:
          xDimension === 'geometryOutputName' ||
          yDimension === 'geometryOutputName',
        isTimeMulti: xDimension === 'timePoint' || yDimension === 'timePoint',
      }
    }
    // Plot types
    if (isDonut) {
      return {
        isIndicatorsMulti: seriesDimension === 'indicators',
        isGeometriesMulti: seriesDimension === 'geometries',
        isTimeMulti: seriesDimension === 'time',
      }
    }
    // Cartesian plots: time always multi, series dimension multi, other single
    return {
      isIndicatorsMulti: seriesDimension === 'indicators',
      isGeometriesMulti: seriesDimension === 'geometries',
      isTimeMulti: true,
    }
  }, [chartType, isDonut, seriesDimension, xDimension, yDimension])

  // Estimate series count for warnings
  const estimatedSeriesCount = useMemo(() => {
    if (chartType !== 'plot') return null
    switch (seriesDimension) {
      case 'indicators':
        return indicatorIds?.length || productSummary?.indicatorCount || null
      case 'geometries':
        return geometryOutputIds?.length || null
      case 'time':
        return timePoints?.length || productSummary?.timePointCount || null
    }
  }, [
    chartType,
    seriesDimension,
    indicatorIds,
    geometryOutputIds,
    timePoints,
    productSummary,
  ])

  // --- Callbacks ---

  const setDefaultsForProduct = useCallback(
    (product: ProductListItem) => {
      form.setValue('productId', product.id)
      if (product.mainRunId) form.setValue('productRunId', product.mainRunId)

      const firstIndicator = product.mainRun?.outputSummary?.indicators?.[0]
      if (firstIndicator) {
        form.setValue('indicatorId', firstIndicator.id)
        form.setValue('indicatorIds', [firstIndicator.id])
      } else {
        form.resetField('indicatorId')
        form.resetField('indicatorIds')
      }
      form.resetField('geometryOutputIds')

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

      // Capture summary for series count warnings + defaults for auto-fill
      const summary = product.mainRun?.outputSummary
      setProductSummary({
        indicatorCount: summary?.indicators?.length ?? 0,
        timePointCount: summary?.timePoints?.length ?? 0,
        firstIndicatorId: summary?.indicators?.[0]?.id ?? null,
        firstTimePoint: summary?.timePoints?.[0] ?? null,
      })

      form.trigger()
    },
    [form],
  )

  // Helper: given a chart type's constraints, set each dimension to either
  // "all" (undefined) if it's multi, or a single default if it's single.
  // This is the single source of truth for dimension defaults.
  const applyDimensionDefaults = useCallback(
    (opts: {
      indicatorsMulti: boolean
      geometriesMulti: boolean
      timeMulti: boolean
    }) => {
      const sv = { shouldValidate: false }

      const defaultIndicator =
        hookDefaults?.firstIndicatorId ?? productSummary?.firstIndicatorId
      const defaultGeometry = firstGeometryId
      const defaultTime =
        hookDefaults?.firstTimePoint ?? productSummary?.firstTimePoint

      // Read each array field individually (avoids discriminated-union issues)
      const curIndicators = form.getValues('indicatorIds') as
        | string[]
        | undefined
      const curGeometries = form.getValues('geometryOutputIds') as
        | string[]
        | undefined
      const curTime = form.getValues('timePoints') as string[] | undefined

      // Indicators
      if (opts.indicatorsMulti) {
        form.setValue('indicatorIds', undefined, sv)
      } else {
        const single = curIndicators?.[0] ?? defaultIndicator
        form.setValue('indicatorIds', single ? [single] : undefined, sv)
      }

      // Geometries
      if (opts.geometriesMulti) {
        form.setValue('geometryOutputIds', undefined, sv)
      } else {
        const single = curGeometries?.[0] ?? defaultGeometry
        form.setValue('geometryOutputIds', single ? [single] : undefined, sv)
      }

      // Time
      if (opts.timeMulti) {
        form.setValue('timePoints', undefined, sv)
      } else {
        const single = curTime?.[0] ?? defaultTime
        form.setValue('timePoints', single ? [single] : undefined, sv)
      }

      form.trigger()
    },
    [form, productSummary, firstGeometryId, hookDefaults],
  )

  const handleSeriesDimensionChange = useCallback(
    (dim: SeriesDimension) => {
      setSeriesDimension(dim)

      const values = form.getValues()
      if (values.type === 'map') return

      const isDonutChart = values.type === 'plot' && values.subType === 'donut'

      if (isDonutChart) {
        // Donut: series dim is multi, other two are single
        applyDimensionDefaults({
          indicatorsMulti: dim === 'indicators',
          geometriesMulti: dim === 'geometries',
          timeMulti: dim === 'time',
        })
      } else {
        // Cartesian plots: series dim is multi, time is ALWAYS multi, remaining is single
        applyDimensionDefaults({
          indicatorsMulti: dim === 'indicators',
          geometriesMulti: dim === 'geometries',
          timeMulti: true,
        })
      }
    },
    [form, applyDimensionDefaults],
  )

  const handleTypeSelect = useCallback(
    (vt: VisualTypeOption) => {
      const oldType = form.getValues('type')
      const sv = { shouldValidate: false }

      form.setValue('type', vt.type, sv)

      if (vt.type === 'plot' && vt.subType) {
        form.setValue('subType', vt.subType, sv)
      }

      // Defaults for each dimension (prefer hook data, fall back to productSummary)
      const defaultIndicator =
        hookDefaults?.firstIndicatorId ?? productSummary?.firstIndicatorId
      const defaultTime =
        hookDefaults?.firstTimePoint ?? productSummary?.firstTimePoint

      // Convert between map (singular fields) and plot/table (array fields)
      if (oldType === 'map' && vt.type !== 'map') {
        const mapIndicatorId = form.getValues('indicatorId')
        const mapTimePoint = form.getValues('timePoint')
        if (mapIndicatorId) {
          form.setValue('indicatorIds', [mapIndicatorId], sv)
        }
        if (mapTimePoint) {
          form.setValue('timePoints', [mapTimePoint], sv)
        }
      } else if (oldType !== 'map' && vt.type === 'map') {
        // Map needs singular indicatorId and timePoint — use current array
        // values, fall back to fetched defaults.
        const ids = form.getValues('indicatorIds')
        const tps = form.getValues('timePoints')
        form.setValue('indicatorId', ids?.[0] ?? defaultIndicator ?? '', sv)
        form.setValue('timePoint', tps?.[0] ?? defaultTime ?? '', sv)
      }

      // Set default table dimensions
      if (vt.type === 'table') {
        if (!form.getValues('xDimension')) {
          form.setValue('xDimension', 'timePoint', sv)
        }
        if (!form.getValues('yDimension')) {
          form.setValue('yDimension', 'indicatorName', sv)
        }
      }

      // Apply dimension defaults based on the chart type's implicit rules.
      if (vt.type === 'plot') {
        const isDonut = vt.subType === 'donut'
        const dim = isDonut ? 'indicators' : seriesDimension
        setSeriesDimension(dim)

        if (isDonut) {
          // Donut: series dim multi, other two single
          applyDimensionDefaults({
            indicatorsMulti: dim === 'indicators',
            geometriesMulti: dim === 'geometries',
            timeMulti: dim === 'time',
          })
        } else {
          // Cartesian: series dim multi, time ALWAYS multi, remaining single
          applyDimensionDefaults({
            indicatorsMulti: dim === 'indicators',
            geometriesMulti: dim === 'geometries',
            timeMulti: true,
          })
        }
      } else if (vt.type === 'table') {
        const xd = form.getValues('xDimension')
        const yd = form.getValues('yDimension')
        applyDimensionDefaults({
          indicatorsMulti: xd === 'indicatorName' || yd === 'indicatorName',
          geometriesMulti:
            xd === 'geometryOutputName' || yd === 'geometryOutputName',
          timeMulti: xd === 'timePoint' || yd === 'timePoint',
        })
      } else {
        // Map — just trigger validation
        form.trigger()
      }
    },
    [
      form,
      seriesDimension,
      hookDefaults,
      productSummary,
      applyDimensionDefaults,
    ],
  )

  // --- Render ---

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (nextOpen) {
          // Reset form and step each time the dialog opens
          if (chart) {
            form.reset(chart)
            form.trigger()
            setStep(2)
            setSeriesDimension(inferSeriesDimension(chart))
          } else {
            form.reset()
            setStep(0)
            setSeriesDimension('indicators')
            setProductSummary(null)
          }
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
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl">
        <Form {...form}>
          <form
            className="flex flex-1 flex-col gap-4 overflow-hidden"
            onSubmit={(e) => {
              e.preventDefault()
              e.stopPropagation()
              form.handleSubmit((data) => {
                onSubmit(data)
                setOpen(false)
                onClose?.()
              })(e)
            }}
          >
            {/* Header + Step indicator */}
            <DialogHeader className="space-y-3">
              <DialogTitle>{buttonText}</DialogTitle>
              <WizardSteps
                current={step}
                onNavigate={setStep}
                canNavigateTo={canNavigateTo}
              />
              <DialogDescription>{STEP_DESCRIPTIONS[step]}</DialogDescription>
            </DialogHeader>

            {/* Scrollable content */}
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-0.5 pb-1">
              {/* ---- Step 0: Data Source ---- */}
              {step === 0 && (
                <div className="flex flex-col gap-3">
                  <FormField
                    control={form.control}
                    name="productId"
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
                    name="productRunId"
                    render={({ field }) => (
                      <FormItem>
                        <ProductRunSelect
                          productId={productId}
                          {...field}
                          onChange={(productRun) => {
                            field.onChange(productRun?.id ?? null)
                            form.resetField('indicatorId')
                            form.resetField('indicatorIds')
                            form.resetField('geometryOutputIds')
                            form.resetField('timePoint')
                            form.resetField('timePoints')
                          }}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* ---- Step 1: Chart Type ---- */}
              {step === 1 && (
                <TypeGrid
                  selected={visualTypeKey}
                  onSelect={handleTypeSelect}
                />
              )}

              {/* ---- Step 2: Configure ---- */}
              {step === 2 && (
                <div className="flex flex-col gap-4">
                  {/* Series dimension toggle for plot types */}
                  {chartType === 'plot' && (
                    <SeriesDimensionToggle
                      value={seriesDimension}
                      onChange={handleSeriesDimensionChange}
                      isDonut={isDonut}
                    />
                  )}

                  {/* Table axis selectors */}
                  {chartType === 'table' && (
                    <FieldGroup title="Table Axes">
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
                                <SelectTrigger>
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
                                <SelectTrigger>
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

                  {/* Data selectors */}
                  <FieldGroup title="Data">
                    {/* Indicators */}
                    {chartType === 'map' ? (
                      <FormField
                        control={form.control}
                        name="indicatorId"
                        render={({ field }) => (
                          <FormItem>
                            <ProductRunIndicatorsSelect
                              productRunId={productRunId}
                              value={field.value ?? null}
                              onChange={(value) =>
                                field.onChange(value?.id ?? null)
                              }
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : (
                      <FormField
                        control={form.control}
                        name="indicatorIds"
                        render={({ field }) =>
                          isIndicatorsMulti ? (
                            <FormItem key="indicators-multi">
                              <ProductRunIndicatorsSelect
                                productRunId={productRunId}
                                value={field.value ?? []}
                                placeholder="All Indicators"
                                isMulti
                                onChange={(value) =>
                                  field.onChange(value.map((v) => v.id))
                                }
                              />
                              <FormMessage />
                            </FormItem>
                          ) : (
                            <FormItem key="indicators-single">
                              <ProductRunIndicatorsSelect
                                productRunId={productRunId}
                                value={field.value?.[0] ?? null}
                                onChange={(value) =>
                                  field.onChange(value ? [value.id] : undefined)
                                }
                              />
                              <FormMessage />
                            </FormItem>
                          )
                        }
                      />
                    )}

                    {/* Geometries */}
                    <FormField
                      control={form.control}
                      name="geometryOutputIds"
                      render={({ field }) =>
                        isGeometriesMulti ? (
                          <FormItem key="geo-multi">
                            <ProductGeometryOutputSelect
                              title={
                                chartType === 'map'
                                  ? 'Zoom to selected geometry'
                                  : undefined
                              }
                              productRunId={productRunId}
                              value={field.value ?? []}
                              placeholder="All Geometry Outputs"
                              isMulti
                              onChange={(value) => {
                                field.onChange(value.map((v) => v.id))
                              }}
                            />
                            <FormMessage />
                          </FormItem>
                        ) : (
                          <FormItem key="geo-single">
                            <ProductGeometryOutputSelect
                              productRunId={productRunId}
                              placeholder="Select a geometry output"
                              value={field.value?.find((id) => id) ?? null}
                              onChange={(value) =>
                                field.onChange(value ? [value.id] : undefined)
                              }
                            />
                            <FormMessage />
                          </FormItem>
                        )
                      }
                    />

                    {/* Time */}
                    {chartType === 'map' ? (
                      <FormField
                        control={form.control}
                        name="timePoint"
                        render={({ field }) => (
                          <FormItem>
                            <ProductOutputTimeSelect
                              productRunId={productRunId}
                              value={field.value ?? null}
                              onChange={(value) => field.onChange(value)}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : (
                      <FormField
                        control={form.control}
                        name="timePoints"
                        rules={{
                          deps: [
                            'geometryOutputIds',
                            'indicatorIds',
                            'xDimension',
                            'yDimension',
                          ],
                        }}
                        render={({ field }) =>
                          isTimeMulti ? (
                            <FormItem key="time-multi">
                              <ProductOutputTimeSelect
                                productRunId={productRunId}
                                value={field.value ?? []}
                                placeholder="All Time Points"
                                isMulti
                                onChange={(value) => field.onChange(value)}
                              />
                              <FormMessage />
                            </FormItem>
                          ) : (
                            <FormItem key="time-single">
                              <ProductOutputTimeSelect
                                productRunId={productRunId}
                                value={field.value?.[0] ?? null}
                                onChange={(value) =>
                                  field.onChange(value ? [value] : undefined)
                                }
                              />
                              <FormMessage />
                            </FormItem>
                          )
                        }
                      />
                    )}

                    <SeriesWarning count={estimatedSeriesCount} />
                  </FieldGroup>

                  {/* Title & Description */}
                  <FieldGroup title="Details">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <Input
                            placeholder="Optional chart title"
                            {...field}
                          />
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
                          <Input
                            placeholder="Optional description"
                            {...field}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </FieldGroup>
                </div>
              )}

              {/* Preview — visible whenever form is valid */}
              <ChartPreview form={form} />
            </div>

            {/* Footer with navigation */}
            <DialogFooter className="flex-row justify-between gap-2 border-t pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <div className="flex gap-2">
                {step > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setStep((s) => s - 1)}
                  >
                    <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                    Back
                  </Button>
                )}
                {step < 2 && (
                  <Button
                    type="button"
                    size="sm"
                    disabled={!canNavigateTo(step + 1)}
                    onClick={() => setStep((s) => s + 1)}
                  >
                    Next
                    <ChevronRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                )}
                {step === 2 && (
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!form.formState.isValid}
                  >
                    Save
                  </Button>
                )}
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
