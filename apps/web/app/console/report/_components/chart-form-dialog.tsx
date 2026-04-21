'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  type AppearanceConfig,
  type CategoricalColorScheme,
  type CurveType,
  ChartConfiguration,
  type DivergingColorScheme,
  type LegendPosition,
  makeDateFormatter,
  PlotSubType,
  type SequentialColorScheme,
  TableChartDimension,
} from '@repo/plot/types'
import {
  chartConfigurationSchema,
  chartVisualTypeMetadata,
  tableChartDimensionMetadata,
} from '@repo/schemas/chart'
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
import { Switch } from '@repo/ui/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@repo/ui/components/ui/tooltip'
import {
  schemeTableau10,
  schemeCategory10,
  schemePaired,
  schemeSet1,
  schemeSet2,
  schemeSet3,
  schemeDark2,
  schemeAccent,
  schemeObservable10,
} from 'd3-scale-chromatic'
import {
  AlertTriangle,
  AreaChart as AreaChartIcon,
  BarChart as BarChartIcon,
  BarChart3,
  ChartBarDecreasing,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Crosshair,
  Hash,
  Layers,
  type LucideIcon,
  Map as MapIcon,
  PieChart as PieChartIcon,
  Table2,
  TrendingUp,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { FieldGroup } from '../../../../components/form/action'
import {
  MapPreviewProvider,
  useMapPreview,
} from '../../geometries/_components/map-preview-context'
import { ProductGeometryOutputSelect } from '../../product/_components/product-run-geometry-output-select'
import { ProductRunSelect } from '../../product/_components/product-run-select'
import { ProductOutputTimeSelect } from '../../product/_components/product-run-time-select'
import { ProductRunIndicatorsSelect } from '../../product/_components/product-run-indicators-select'
import { ProductSelect } from '../../product/_components/product-select'
import { IndicatorsSelect } from '../../indicator/_components/indicators-select'
import { useGeometryOutputs } from '../../geometries/_hooks'
import {
  ProductListItem,
  useProductOutputsExport,
  useProductRun,
} from '../../product/_hooks'
import {
  chartFormSchema,
  type ChartFormValues,
  toPersistedChartConfiguration,
} from './chart-form-schema'
import { ChartRenderer, getPlotChartGroupBy } from './chart-renderer'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_RECOMMENDED_SERIES = 8
const DEFAULT_MULTI_COUNT = 10

const CATEGORICAL_PALETTES: Record<CategoricalColorScheme, readonly string[]> =
  {
    tableau10: schemeTableau10,
    category10: schemeCategory10,
    paired: schemePaired,
    set1: schemeSet1,
    set2: schemeSet2,
    set3: schemeSet3,
    dark2: schemeDark2,
    accent: schemeAccent,
    observable10: schemeObservable10,
  }

/** Return the scheme colour for `index`, respecting per-key overrides. */
function resolveSeriesColor(
  index: number,
  scheme: CategoricalColorScheme | undefined,
  overrides: Record<string, string> | undefined,
  key: string | string[],
): string {
  const lookupKeys = Array.isArray(key) ? key : [key]
  for (const lookupKey of lookupKeys) {
    if (overrides?.[lookupKey]) return overrides[lookupKey]
  }
  const palette = CATEGORICAL_PALETTES[scheme ?? 'tableau10'] ?? schemeTableau10
  return palette[index % palette.length]!
}

type SeriesColorEntry = {
  label: string
  overrideKeys: string[]
}

function toSeriesKey(value: unknown): string {
  if (value instanceof Date) return value.toISOString()
  const key = String(value ?? '')
  return key === '' ? 'Value' : key
}

/** Default date precision for product-backed chart previews and labels. */
const DEFAULT_PRODUCT_DATE_PRECISION: AppearanceConfig['datePrecision'] =
  'year-month'

const STEP_LABELS = [
  'Data Source',
  'Chart Type',
  'Configure',
  'Appearance',
] as const
const STEP_DESCRIPTIONS = [
  'Select a product and run to source data from',
  'Choose how to visualize your data',
  'Fine-tune data selections and add details',
  'Customise colours, axes and formatting',
] as const

type SeriesDimension = 'indicators' | 'geometries' | 'time'

interface VisualTypeOption {
  key: string
  type: 'plot' | 'map' | 'table' | 'kpi'
  subType?: PlotSubType
  label: string
  icon: LucideIcon
  /** Extra Tailwind classes applied to the icon (e.g. rotation). */
  iconClassName?: string
  description: string
  /** True if the chart type needs more than one time point to be useful. */
  requiresMultiTime?: boolean
}

const VISUAL_TYPES: VisualTypeOption[] = [
  {
    ...chartVisualTypeMetadata[0],
    icon: TrendingUp,
    requiresMultiTime: true,
  },
  {
    ...chartVisualTypeMetadata[1],
    icon: AreaChartIcon,
    requiresMultiTime: true,
  },
  {
    ...chartVisualTypeMetadata[2],
    icon: Layers,
    requiresMultiTime: true,
  },
  {
    ...chartVisualTypeMetadata[3],
    icon: BarChart3,
    requiresMultiTime: true,
  },
  {
    ...chartVisualTypeMetadata[4],
    icon: BarChartIcon,
  },
  {
    ...chartVisualTypeMetadata[5],
    icon: ChartBarDecreasing,
  },
  {
    ...chartVisualTypeMetadata[6],
    icon: CircleDot,
    requiresMultiTime: true,
  },
  {
    ...chartVisualTypeMetadata[7],
    icon: PieChartIcon,
  },
  {
    ...chartVisualTypeMetadata[8],
    icon: Table2,
  },
  {
    ...chartVisualTypeMetadata[9],
    icon: MapIcon,
  },
  {
    ...chartVisualTypeMetadata[10],
    icon: Hash,
  },
]

const tableDimensionOptions = [...tableChartDimensionMetadata]

// ---------------------------------------------------------------------------
// Appearance option lists
// ---------------------------------------------------------------------------

const CATEGORICAL_SCHEME_OPTIONS: {
  value: CategoricalColorScheme
  label: string
}[] = [
  { value: 'tableau10', label: 'Tableau 10' },
  { value: 'category10', label: 'Category 10' },
  { value: 'paired', label: 'Paired' },
  { value: 'set1', label: 'Set 1' },
  { value: 'set2', label: 'Set 2' },
  { value: 'set3', label: 'Set 3' },
  { value: 'dark2', label: 'Dark 2' },
  { value: 'accent', label: 'Accent' },
  { value: 'observable10', label: 'Observable 10' },
]

const COLOR_SCALE_OPTIONS: {
  value: string
  label: string
  type: 'sequential' | 'diverging'
}[] = [
  { value: 'ylOrRd', label: 'Yellow → Red (Sequential)', type: 'sequential' },
  { value: 'viridis', label: 'Viridis (Sequential)', type: 'sequential' },
  { value: 'plasma', label: 'Plasma (Sequential)', type: 'sequential' },
  { value: 'inferno', label: 'Inferno (Sequential)', type: 'sequential' },
  { value: 'blues', label: 'Blues (Sequential)', type: 'sequential' },
  { value: 'greens', label: 'Greens (Sequential)', type: 'sequential' },
  { value: 'oranges', label: 'Oranges (Sequential)', type: 'sequential' },
  {
    value: 'ylGnBu',
    label: 'Yellow → Green → Blue (Sequential)',
    type: 'sequential',
  },
  { value: 'buPu', label: 'Blue → Purple (Sequential)', type: 'sequential' },
  { value: 'rdBu', label: 'Red ↔ Blue (Diverging)', type: 'diverging' },
  { value: 'brBG', label: 'Brown ↔ Teal (Diverging)', type: 'diverging' },
  { value: 'piYG', label: 'Pink ↔ Green (Diverging)', type: 'diverging' },
  { value: 'prGn', label: 'Purple ↔ Green (Diverging)', type: 'diverging' },
  {
    value: 'rdYlGn',
    label: 'Red ↔ Yellow ↔ Green (Diverging)',
    type: 'diverging',
  },
]

const LEGEND_POSITION_OPTIONS: { value: LegendPosition; label: string }[] = [
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'none', label: 'Hidden' },
]

const CURVE_TYPE_OPTIONS: { value: CurveType; label: string }[] = [
  { value: 'monotone', label: 'Smooth' },
  { value: 'linear', label: 'Linear' },
  { value: 'step', label: 'Step' },
]

const DATE_PRECISION_OPTIONS: {
  value: NonNullable<AppearanceConfig['datePrecision']>
  label: string
}[] = [
  { value: 'year', label: 'Year' },
  { value: 'year-month', label: 'Year + Month' },
  { value: 'year-month-day', label: 'Year + Month + Day' },
  { value: 'full', label: 'Full (with time)' },
]

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

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
  if (type === 'kpi') return 'kpi'
  return undefined
}

function inferSeriesDimension(
  chart: ChartConfiguration | null,
): SeriesDimension {
  if (!chart) return 'indicators'
  if (chart.type === 'map' || chart.type === 'kpi') return 'indicators'

  const indicatorIds = 'indicatorIds' in chart ? chart.indicatorIds : undefined
  const geometryOutputIds =
    'geometryOutputIds' in chart ? chart.geometryOutputIds : undefined
  const timePoints = 'timePoints' in chart ? chart.timePoints : undefined

  const multiIndicators = (indicatorIds?.length ?? 0) > 1
  const multiGeometries =
    !geometryOutputIds?.length || geometryOutputIds.length > 1
  const multiTime = !timePoints?.length || timePoints.length > 1

  // For donut / ranked-bar: time can be the series dimension
  if (
    chart.type === 'plot' &&
    (chart.subType === 'donut' || chart.subType === 'ranked-bar')
  ) {
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
  timePointCount,
}: {
  selected: string | undefined
  onSelect: (vt: VisualTypeOption) => void
  timePointCount: number | null
}) => {
  const hasMultiTime = timePointCount !== null && timePointCount > 1
  return (
    <div className="grid grid-cols-3 gap-2">
      {VISUAL_TYPES.map((vt) => {
        const Icon = vt.icon
        const isSelected = selected === vt.key
        const isLimited = vt.requiresMultiTime && !hasMultiTime

        const btn = (
          <button
            key={vt.key}
            type="button"
            onClick={() => onSelect(vt)}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-center transition-colors',
              isSelected
                ? 'border-primary bg-primary/5'
                : 'border-transparent bg-muted/40 hover:border-border hover:bg-muted/60',
              isLimited && !isSelected && 'opacity-40',
            )}
          >
            <Icon
              className={cn(
                'h-6 w-6',
                isSelected ? 'text-primary' : 'text-muted-foreground',
                vt.iconClassName,
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

        if (isLimited) {
          return (
            <Tooltip key={vt.key}>
              <TooltipTrigger asChild>{btn}</TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="max-w-[200px] text-center"
              >
                {timePointCount === null
                  ? 'Select a product first'
                  : 'This product only has one time point — this chart type works best with multiple'}
              </TooltipContent>
            </Tooltip>
          )
        }

        return btn
      })}
    </div>
  )
}

const SeriesDimensionToggle = ({
  value,
  onChange,
  isSingleXChart,
  indicatorCount,
  geometryCount,
  timePointCount,
}: {
  value: SeriesDimension
  onChange: (dim: SeriesDimension) => void
  isSingleXChart: boolean
  indicatorCount: number
  geometryCount: number
  timePointCount: number
}) => {
  const options: { key: SeriesDimension; label: string; count: number }[] =
    isSingleXChart
      ? [
          { key: 'indicators', label: 'Indicators', count: indicatorCount },
          { key: 'geometries', label: 'Geometries', count: geometryCount },
          { key: 'time', label: 'Time points', count: timePointCount },
        ]
      : [
          { key: 'indicators', label: 'Indicators', count: indicatorCount },
          { key: 'geometries', label: 'Geometries', count: geometryCount },
        ]

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">
        {isSingleXChart ? 'Slice by' : 'Compare by'}
      </span>
      <div className="flex gap-1.5">
        {options.map((opt) => {
          const disabled = opt.count <= 1
          return (
            <Button
              key={opt.key}
              type="button"
              size="sm"
              variant={value === opt.key ? 'default' : 'outline'}
              className="h-7 text-xs"
              disabled={disabled}
              onClick={() => onChange(opt.key)}
            >
              {opt.label}
            </Button>
          )
        })}
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
  formValues: ChartFormValues,
): ChartConfiguration | null {
  if (!formValues.productRunId) return null

  // Strict parse: if it passes, use it (includes superRefine)
  const strict = chartConfigurationSchema.safeParse(formValues)
  if (strict.success) return strict.data

  const appearance = formValues.appearance ?? undefined

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
      appearance,
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
      appearance,
    }
  }
  if (formValues.type === 'kpi') {
    if (!formValues.indicatorId || !formValues.timePoint) return null
    if (
      !formValues.geometryOutputIds ||
      formValues.geometryOutputIds.length !== 1
    )
      return null
    return {
      type: 'kpi',
      productRunId: formValues.productRunId,
      indicatorId: formValues.indicatorId,
      timePoint: formValues.timePoint,
      geometryOutputIds: formValues.geometryOutputIds,
      title: formValues.title,
      description: formValues.description,
      appearance,
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
      appearance,
    }
  }
  return null
}

/** Small component rendered inside the MapPreviewProvider so it can use the context hook. */
const MapExtentButton = ({
  onBounds,
}: {
  onBounds: (bounds: {
    minLon: number
    minLat: number
    maxLon: number
    maxLat: number
  }) => void
}) => {
  const mapPreview = useMapPreview()
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={() => {
            const bounds = mapPreview?.getMapBounds()
            if (bounds) onBounds(bounds)
          }}
        >
          <Crosshair className="h-3 w-3" />
          From map extent
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        Set bounding box from the current map preview viewport
      </TooltipContent>
    </Tooltip>
  )
}

const ChartPreview = ({ form }: { form: UseFormReturn<ChartFormValues> }) => {
  const formValues = form.watch()

  const chartConfig = useMemo(
    () => buildPreviewConfig(formValues),
    [formValues],
  )

  if (!chartConfig) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed bg-muted/20 px-4 text-center text-xs text-muted-foreground lg:h-full">
        Choose a chart type to see a preview
      </div>
    )
  }

  return (
    <div className="flex h-[300px] flex-col overflow-hidden rounded-lg border bg-card lg:h-full">
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
  onSubmit: (data: ChartConfiguration) => void
  onOpen?: () => void
  onClose?: () => void
}) => {
  const isEditing = chart !== null

  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(isEditing ? 2 : 0)

  const form = useForm<ChartFormValues>({
    resolver: zodResolver(chartFormSchema),
    defaultValues: chart as Partial<ChartFormValues> | undefined,
    mode: 'all',
    criteriaMode: 'all',
  })

  // Watch fields needed for conditional rendering
  const chartType = form.watch('type')
  const subType = form.watch('subType')
  const productId = form.watch('productId')
  const productRunId = form.watch('productRunId')
  const indicatorId = form.watch('indicatorId')
  const indicatorIds = form.watch('indicatorIds')
  const geometryOutputIds = form.watch('geometryOutputIds')
  const timePoint = form.watch('timePoint')
  const timePoints = form.watch('timePoints')
  const xDimension = form.watch('xDimension')
  const yDimension = form.watch('yDimension')
  const appearanceDatePrecision = form.watch('appearance.datePrecision')

  const [seriesDimension, setSeriesDimension] = useState<SeriesDimension>(() =>
    inferSeriesDimension(chart),
  )

  // Indicator filter for the product selector (not part of the chart config)
  const [indicatorFilter, setIndicatorFilter] = useState<string | undefined>(
    undefined,
  )

  // Product summary for series count warnings + default values for auto-fill
  const [productSummary, setProductSummary] = useState<{
    productName: string
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
  const resolvedProductId = productId ?? productRunDetail?.product?.id
  const { data: geometryOutputsData } = useGeometryOutputs(
    productRunDetail?.geometriesRun?.id,
    { size: DEFAULT_MULTI_COUNT },
    false,
    !!productRunDetail?.geometriesRun?.id,
  )
  const firstGeometryId = geometryOutputsData?.data?.[0]?.id ?? null

  // Fetch the specifically selected geometry outputs so we always have their
  // names available (the default fetch above only gets the first N).
  const hasSelectedGeometries =
    !!geometryOutputIds && geometryOutputIds.length > 0
  const { data: selectedGeometryOutputsData } = useGeometryOutputs(
    productRunDetail?.geometriesRun?.id,
    {
      geometryOutputIds: hasSelectedGeometries ? geometryOutputIds : undefined,
      size: hasSelectedGeometries ? geometryOutputIds.length : undefined,
    },
    false,
    hasSelectedGeometries && !!productRunDetail?.geometriesRun?.id,
  )

  // First N indicator / geometry IDs used as defaults when a multi dimension is enabled
  const defaultMultiIndicatorIds = useMemo(() => {
    return (productRunDetail?.outputSummary?.indicators ?? [])
      .slice(0, DEFAULT_MULTI_COUNT)
      .map((i) => i.indicator?.id)
      .filter((id): id is string => !!id)
  }, [productRunDetail])

  const defaultMultiGeometryIds = useMemo(() => {
    return (geometryOutputsData?.data ?? [])
      .slice(0, DEFAULT_MULTI_COUNT)
      .map((g) => g.id)
  }, [geometryOutputsData])

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

  useEffect(() => {
    if (!productRunDetail?.outputSummary) return

    if (!form.getValues('productId') && productRunDetail.product?.id) {
      form.setValue('productId', productRunDetail.product.id, {
        shouldValidate: false,
        shouldDirty: false,
        shouldTouch: false,
      })
    }

    const firstTimePoint = hookDefaults?.firstTimePoint ?? null
    setProductSummary((current) => ({
      productName: productRunDetail.product?.name ?? current?.productName ?? '',
      indicatorCount: productRunDetail.outputSummary?.indicators?.length ?? 0,
      timePointCount: productRunDetail.outputSummary?.timePoints?.length ?? 0,
      firstIndicatorId: hookDefaults?.firstIndicatorId ?? null,
      firstTimePoint,
    }))
  }, [form, hookDefaults, productRunDetail])

  // --- Derived state ---

  const visualTypeKey = getVisualTypeKey(chartType, subType)
  const isDonut = chartType === 'plot' && subType === 'donut'
  const isRankedBar = chartType === 'plot' && subType === 'ranked-bar'
  /** Chart types where only the series dimension is multi; all others are single. */
  const isSingleXChart = isDonut || isRankedBar

  const sourceComplete = !!productRunId
  const typeComplete = !!chartType && (chartType !== 'plot' || !!subType)

  const canNavigateTo = useCallback(
    (targetStep: number) => {
      if (targetStep === 0) return true
      if (targetStep === 1) return sourceComplete
      if (targetStep === 2) return sourceComplete && typeComplete
      if (targetStep === 3) return sourceComplete && typeComplete
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
    if (chartType === 'kpi') {
      return {
        isIndicatorsMulti: false,
        isGeometriesMulti: false,
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
    // Plot types where only the series dimension is multi (donut, ranked-bar).
    if (isSingleXChart) {
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
  }, [chartType, isSingleXChart, seriesDimension, xDimension, yDimension])

  // Estimate series count for warnings
  const estimatedSeriesCount = useMemo(() => {
    if (chartType !== 'plot') return null
    switch (seriesDimension) {
      case 'indicators':
        return indicatorIds?.length || null
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

  // Series labels used for the colour-override list in Step 3.
  // These mirror the keys that pivotData / groupBySeries produce at render time.
  const effectiveDatePrecision =
    appearanceDatePrecision ?? DEFAULT_PRODUCT_DATE_PRECISION

  const previewPlotGroupBy = useMemo(() => {
    if (chartType !== 'plot') return null
    return getPlotChartGroupBy({
      geometryOutputIds,
      indicatorIds,
      timePoints,
    })
  }, [chartType, geometryOutputIds, indicatorIds, timePoints])

  const { data: previewProductOutputs } = useProductOutputsExport(
    chartType === 'plot' ? (productRunId ?? undefined) : undefined,
    chartType === 'plot' && productRunId
      ? {
          indicatorId: indicatorIds,
          geometryOutputId: geometryOutputIds,
          timePoint: timePoints,
        }
      : undefined,
    false,
  )

  const currentSeriesEntries: SeriesColorEntry[] = useMemo(() => {
    if (chartType !== 'plot') return []
    const allIndicators = productRunDetail?.outputSummary?.indicators ?? []
    const allGeometries = geometryOutputsData?.data ?? []
    const fallbackEntries = (() => {
      switch (seriesDimension) {
        case 'indicators': {
          // Each summary indicator has a nested `.indicator` (measured or derived)
          const ids = indicatorIds
          if (ids && ids.length > 0) {
            const idSet = new Set(ids)
            return allIndicators
              .filter((si) => {
                const indId = si.indicator?.id
                return indId !== undefined && idSet.has(indId)
              })
              .map((si) => {
                const label =
                  si.indicator?.name ?? si.indicator?.id ?? 'Unknown'
                return { label, overrideKeys: [label] }
              })
          }
          return allIndicators.map((si) => {
            const label = si.indicator?.name ?? si.indicator?.id ?? 'Unknown'
            return { label, overrideKeys: [label] }
          })
        }
        case 'geometries': {
          const ids = geometryOutputIds
          if (ids && ids.length > 0) {
            const idSet = new Set(ids)
            return allGeometries
              .filter((g) => idSet.has(g.id))
              .map((g) => {
                const label = g.name ?? g.id
                return { label, overrideKeys: [label] }
              })
          }
          return allGeometries.map((g) => {
            const label = g.name ?? g.id
            return { label, overrideKeys: [label] }
          })
        }
        case 'time': {
          const allTimePoints =
            productRunDetail?.outputSummary?.timePoints ?? []
          const selected = timePoints
          const fmt = makeDateFormatter(effectiveDatePrecision)
          const points =
            selected && selected.length > 0 ? selected : allTimePoints
          return points.map((tp) => {
            const rawKey = String(tp)
            const label = fmt.format(new Date(rawKey))
            return {
              label,
              overrideKeys: label === rawKey ? [rawKey] : [rawKey, label],
            }
          })
        }
      }
    })()

    const plotData = previewProductOutputs?.data ?? []
    if (!previewPlotGroupBy || plotData.length === 0) {
      return fallbackEntries
    }

    const seriesEntries: SeriesColorEntry[] = []
    const seenKeys = new Set<string>()
    const dateFormatter = makeDateFormatter(effectiveDatePrecision)

    for (const output of plotData) {
      const rawKey = toSeriesKey(output[previewPlotGroupBy])
      if (seenKeys.has(rawKey)) continue
      seenKeys.add(rawKey)

      if (previewPlotGroupBy === 'timePoint') {
        const label = dateFormatter.format(new Date(rawKey))
        seriesEntries.push({
          label,
          overrideKeys: label === rawKey ? [rawKey] : [rawKey, label],
        })
        continue
      }

      seriesEntries.push({
        label: rawKey,
        overrideKeys: [rawKey],
      })
    }

    return seriesEntries.length > 0 ? seriesEntries : fallbackEntries
  }, [
    chartType,
    seriesDimension,
    indicatorIds,
    geometryOutputIds,
    timePoints,
    productRunDetail,
    geometryOutputsData,
    effectiveDatePrecision,
    previewPlotGroupBy,
    previewProductOutputs,
  ])

  // Build a sensible default title from the current configuration.
  //
  // Rules:
  //  - Always include the product name.
  //  - Include the name of every single-selected (non-series) dimension:
  //      * indicator name  — when only one indicator is selected
  //      * geometry name   — when only one geometry is selected
  //      * time            — when only one time point is selected
  //  - For map: uses indicatorId (singular) and timePoint (singular).
  //  - For table: include whatever single dimensions are selected.
  //  - Parts are joined with " — ".
  const suggestedTitle = useMemo(() => {
    const productName = productSummary?.productName
    if (!productName) return ''

    const allIndicators = productRunDetail?.outputSummary?.indicators ?? []
    // Use the dedicated selected-geometry fetch so we always resolve the name,
    // even if the geometry isn't in the first-N default fetch.
    const selectedGeometries = selectedGeometryOutputsData?.data ?? []

    // Resolve a single indicator name from an array of IDs.
    const resolveIndicatorName = (ids: string[] | undefined): string | null => {
      if (!ids || ids.length !== 1) return null
      const match = allIndicators.find((si) => si.indicator?.id === ids[0])
      return match?.indicator?.name ?? null
    }

    // Resolve a single geometry name from an array of IDs.
    const resolveGeometryName = (ids: string[] | undefined): string | null => {
      if (!ids || ids.length !== 1) return null
      const match = selectedGeometries.find((g) => g.id === ids[0])
      return match?.name ?? null
    }

    // Format a single time point for the title.
    const resolveTimeName = (tp: string | undefined): string | null => {
      if (!tp) return null
      const fmt = makeDateFormatter(DEFAULT_PRODUCT_DATE_PRECISION)
      return fmt.format(new Date(tp))
    }

    // Join non-null parts with " — ".
    const join = (...parts: (string | null)[]) =>
      parts.filter(Boolean).join(' — ')

    if (chartType === 'map') {
      // Map: single indicator (indicatorId), single time (timePoint),
      // optional geometry filter.
      const indMatch = allIndicators.find(
        (si) => si.indicator?.id === indicatorId,
      )
      const indName = indMatch?.indicator?.name ?? null
      const timeName = resolveTimeName(timePoint)
      const geoName = resolveGeometryName(geometryOutputIds)
      return join(indName, geoName, timeName) || productName
    }

    if (chartType === 'kpi') {
      return productName
    }

    if (chartType === 'table') {
      const indName = resolveIndicatorName(indicatorIds)
      const geoName = resolveGeometryName(geometryOutputIds)
      const timeName =
        timePoints?.length === 1 ? resolveTimeName(timePoints[0]) : null
      return join(productName, indName, geoName, timeName) || productName
    }

    // Plot types — include the product name and every single-selected
    // (non-series) dimension.
    const indName = resolveIndicatorName(indicatorIds)
    const geoName = resolveGeometryName(geometryOutputIds)
    const timeName =
      timePoints?.length === 1 ? resolveTimeName(timePoints[0]) : null

    switch (seriesDimension) {
      case 'indicators':
        // Series = indicators → indicator is multi, geometry & time are single
        return join(productName, geoName, timeName) || productName
      case 'geometries':
        // Series = geometries → geometry is multi, indicator & time are single
        return join(indName, productName, timeName) || productName
      case 'time':
        // Series = time → time is multi, indicator & geometry are single
        return join(indName, productName, geoName) || productName
    }
  }, [
    productSummary?.productName,
    chartType,
    seriesDimension,
    indicatorId,
    indicatorIds,
    geometryOutputIds,
    timePoint,
    timePoints,
    productRunDetail,
    selectedGeometryOutputsData,
  ])

  // Track whether the title was auto-generated (true) or manually typed by the
  // user (false).  When auto, we keep it in sync with `suggestedTitle`.
  const titleAutoRef = useRef(!chart?.title)

  useEffect(() => {
    if (!titleAutoRef.current) return
    if (!suggestedTitle) return
    form.setValue('title', suggestedTitle, { shouldValidate: false })
  }, [suggestedTitle, form])

  // --- Callbacks ---

  const setDefaultsForProduct = useCallback(
    (product: ProductListItem) => {
      const sv = { shouldValidate: false }

      // Nuke the entire form so nothing from the previous product lingers,
      // then re-populate only product-level fields.
      form.reset(undefined, { keepDefaultValues: true })

      form.setValue('productId', product.id, sv)

      if (product.mainRunId) {
        form.setValue('productRunId', product.mainRunId, sv)
      }

      const indicators = product.mainRun?.outputSummary?.indicators ?? []
      const firstNIndicatorIds = indicators
        .slice(0, DEFAULT_MULTI_COUNT)
        .map((i) => i.id)
      if (firstNIndicatorIds.length > 0) {
        form.setValue('indicatorId', firstNIndicatorIds[0]!, sv)
        form.setValue('indicatorIds', firstNIndicatorIds, sv)
      }

      if (product.mainRun?.outputSummary?.timePoints?.length === 1) {
        form.setValue(
          'timePoint',
          product.mainRun?.outputSummary?.timePoints?.[0] ?? '',
          sv,
        )
        form.setValue(
          'timePoints',
          product.mainRun?.outputSummary?.timePoints ?? [],
          sv,
        )
      }

      // Capture summary for series count warnings + defaults for auto-fill
      const summary = product.mainRun?.outputSummary
      setProductSummary({
        productName: product.name,
        indicatorCount: summary?.indicators?.length ?? 0,
        timePointCount: summary?.timePoints?.length ?? 0,
        firstIndicatorId: summary?.indicators?.[0]?.id ?? null,
        firstTimePoint: summary?.timePoints?.[0] ?? null,
      })

      // Set appearance defaults
      form.setValue('appearance.compactNumbers', true, sv)
      form.setValue(
        'appearance.datePrecision',
        DEFAULT_PRODUCT_DATE_PRECISION,
        sv,
      )

      // Reset wizard state back to the type selection step
      setStep(0)
      setSeriesDimension('indicators')
      titleAutoRef.current = true
    },
    [form],
  )

  // Helper: given a chart type's constraints, set each dimension to either
  // the first N defaults if it's multi, or a single default if it's single.
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
      const rawIndicators = form.getValues('indicatorIds')
      const curIndicators = Array.isArray(rawIndicators)
        ? rawIndicators
        : undefined
      const rawGeometries = form.getValues('geometryOutputIds')
      const curGeometries = Array.isArray(rawGeometries)
        ? rawGeometries
        : undefined
      const rawTimePoints = form.getValues('timePoints')
      const curTime = Array.isArray(rawTimePoints) ? rawTimePoints : undefined

      // Indicators
      if (opts.indicatorsMulti) {
        const defaults =
          defaultMultiIndicatorIds.length > 0 ? defaultMultiIndicatorIds : []
        form.setValue('indicatorIds', defaults, sv)
      } else {
        const single = curIndicators?.[0] ?? defaultIndicator
        form.setValue('indicatorIds', single ? [single] : [], sv)
      }

      // Geometries
      if (opts.geometriesMulti) {
        const defaults =
          defaultMultiGeometryIds.length > 0
            ? defaultMultiGeometryIds
            : undefined
        form.setValue('geometryOutputIds', defaults, sv)
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
    [
      form,
      productSummary,
      firstGeometryId,
      hookDefaults,
      defaultMultiIndicatorIds,
      defaultMultiGeometryIds,
    ],
  )

  const handleSeriesDimensionChange = useCallback(
    (dim: SeriesDimension) => {
      setSeriesDimension(dim)

      const values = form.getValues()
      if (values.type === 'map') return

      const isSingleX =
        values.type === 'plot' &&
        (values.subType === 'donut' || values.subType === 'ranked-bar')

      if (isSingleX) {
        // Donut / Ranked-bar: only the series dim is multi, others single
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

      const oldTypeIsSingular = oldType === 'map' || oldType === 'kpi'
      const nextTypeIsArray = vt.type === 'plot' || vt.type === 'table'
      const oldTypeIsArray = oldType === 'plot' || oldType === 'table'
      const nextTypeIsSingular = vt.type === 'map' || vt.type === 'kpi'

      if (oldTypeIsSingular && nextTypeIsArray) {
        const singularIndicatorId = form.getValues('indicatorId')
        const singularTimePoint = form.getValues('timePoint')
        if (singularIndicatorId) {
          form.setValue('indicatorIds', [singularIndicatorId], sv)
        }
        if (singularTimePoint) {
          form.setValue('timePoints', [singularTimePoint], sv)
        }
      }

      if (oldTypeIsArray && nextTypeIsSingular) {
        const ids = form.getValues('indicatorIds')
        const tps = form.getValues('timePoints')
        form.setValue('indicatorId', ids?.[0] ?? defaultIndicator ?? '', sv)
        form.setValue('timePoint', tps?.[0] ?? defaultTime ?? '', sv)
      }

      if (vt.type === 'map') {
        form.setValue('geometryOutputIds', undefined, sv)
      }

      if (vt.type === 'kpi') {
        const currentGeo = form.getValues('geometryOutputIds')?.[0]
        const resolvedGeo = currentGeo ?? firstGeometryId
        form.setValue(
          'geometryOutputIds',
          resolvedGeo ? [resolvedGeo] : undefined,
          sv,
        )

        if (!form.getValues('indicatorId')) {
          form.setValue('indicatorId', defaultIndicator ?? '', sv)
        }
        if (!form.getValues('timePoint')) {
          form.setValue('timePoint', defaultTime ?? '', sv)
        }
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
        const isSingleX = vt.subType === 'donut' || vt.subType === 'ranked-bar'
        const indCount = productSummary?.indicatorCount ?? 0
        const geoCount = geometryOutputsData?.data?.length ?? 0
        const timeCount = productSummary?.timePointCount ?? 0

        // Keep the current dimension if it's viable; only override if not
        let dim: SeriesDimension = seriesDimension
        // Cartesian charts don't support 'time' as the series dimension
        if (!isSingleX && dim === 'time') dim = 'indicators'
        if (
          (dim === 'indicators' && indCount <= 1) ||
          (dim === 'geometries' && geoCount <= 1) ||
          (dim === 'time' && timeCount <= 1)
        ) {
          if (indCount > 1) dim = 'indicators'
          else if (geoCount > 1) dim = 'geometries'
          else if (isSingleX && timeCount > 1) dim = 'time'
          else dim = 'indicators' // fallback
        }
        setSeriesDimension(dim)

        if (isSingleX) {
          // Donut / Ranked-bar: only the series dim is multi, others single
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
        // Map / KPI — just trigger validation
        form.trigger()
      }
    },
    [
      form,
      seriesDimension,
      hookDefaults,
      productSummary,
      geometryOutputsData,
      firstGeometryId,
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
            // Preserve manually-set title in edit mode
            titleAutoRef.current = !chart.title
          } else {
            form.reset()
            setStep(0)
            setSeriesDimension('indicators')
            setProductSummary(null)
            titleAutoRef.current = true
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
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:w-2xl lg:w-[900px] max-w-full">
        <MapPreviewProvider>
          <Form {...form}>
            <form
              className="flex flex-1 min-h-0 flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault()
                e.stopPropagation()
                form.handleSubmit((data) => {
                  onSubmit(toPersistedChartConfiguration(data))
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

              {/* Content — vertical on small screens, horizontal split on lg */}
              <div className="space-y-4 overflow-y-auto px-1 pb-1 lg:flex lg:min-h-[400px] lg:gap-4 lg:space-y-0 lg:overflow-hidden">
                {/* Form fields — scrolls independently on lg */}
                <div className="lg:w-[40%] lg:shrink-0 lg:space-y-4 lg:overflow-y-auto lg:px-1">
                  {/* ---- Step 0: Data Source ---- */}
                  {step === 0 && (
                    <div className="flex flex-col gap-3">
                      <IndicatorsSelect
                        value={indicatorFilter ?? null}
                        onChange={(ind) => {
                          const next = ind?.id ?? undefined

                          if (next !== indicatorFilter) {
                            setIndicatorFilter(next)
                            // Reset product and product run if the indicator changes
                            if (next) {
                              form.resetField('productId')
                              form.resetField('productRunId')
                            }
                          }
                        }}
                        title="Filter by Indicator"
                        placeholder="Any Indicator"
                        isClearable
                      />

                      <FormField
                        control={form.control}
                        name="productId"
                        render={({ field }) => (
                          <FormItem>
                            <ProductSelect
                              {...field}
                              queryOptions={{
                                hasRun: 'true',
                                indicatorId: indicatorFilter,
                              }}
                              onChange={(product) => {
                                field.onChange(product?.id ?? undefined)
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
                              productId={resolvedProductId}
                              {...field}
                              onChange={(productRun) => {
                                const sv = { shouldValidate: false }
                                field.onChange(productRun?.id ?? undefined)
                                form.resetField('indicatorId')
                                form.setValue('indicatorIds', [], sv)
                                form.setValue(
                                  'geometryOutputIds',
                                  undefined,
                                  sv,
                                )
                                form.resetField('timePoint')
                                form.setValue('timePoints', undefined, sv)
                                setProductSummary(null)
                                form.trigger()
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
                      timePointCount={productSummary?.timePointCount ?? null}
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
                          isSingleXChart={isSingleXChart}
                          indicatorCount={productSummary?.indicatorCount ?? 0}
                          geometryCount={geometryOutputsData?.data?.length ?? 0}
                          timePointCount={productSummary?.timePointCount ?? 0}
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
                                      field.onChange(
                                        value as TableChartDimension,
                                      )
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
                                      field.onChange(
                                        value as TableChartDimension,
                                      )
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
                        {chartType === 'map' || chartType === 'kpi' ? (
                          <FormField
                            control={form.control}
                            name="indicatorId"
                            render={({ field }) => (
                              <FormItem>
                                <ProductRunIndicatorsSelect
                                  productRunId={productRunId}
                                  value={field.value ?? null}
                                  isClearable={false}
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
                                    placeholder="Select indicators…"
                                    isMulti
                                    onChange={(value) => {
                                      const ids = value.map((v) => v.id)
                                      // Prevent clearing to empty — keep at least
                                      // one item so we don't fetch all indicators.
                                      if (ids.length === 0) return
                                      field.onChange(ids)
                                    }}
                                  />
                                  <FormMessage />
                                </FormItem>
                              ) : (
                                <FormItem key="indicators-single">
                                  <ProductRunIndicatorsSelect
                                    productRunId={productRunId}
                                    value={field.value?.[0] ?? null}
                                    isClearable={false}
                                    onChange={(value) =>
                                      field.onChange(
                                        value ? [value.id] : undefined,
                                      )
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
                                  placeholder="Select geometry outputs…"
                                  isMulti
                                  onChange={(value) => {
                                    const ids = value.map((v) => v.id)
                                    // For map, clearing means "show all" which is
                                    // fine.  For other chart types prevent clearing
                                    // to empty so we don't fetch unlimited items.
                                    if (ids.length === 0 && chartType !== 'map')
                                      return
                                    field.onChange(
                                      ids.length > 0 ? ids : undefined,
                                    )
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
                                  isClearable={false}
                                  onChange={(value) =>
                                    field.onChange(
                                      value ? [value.id] : undefined,
                                    )
                                  }
                                />
                                <FormMessage />
                              </FormItem>
                            )
                          }
                        />

                        {/* Time */}
                        {chartType === 'map' || chartType === 'kpi' ? (
                          <FormField
                            control={form.control}
                            name="timePoint"
                            render={({ field }) => (
                              <FormItem>
                                <ProductOutputTimeSelect
                                  productRunId={productRunId}
                                  value={field.value ?? null}
                                  isClearable={false}
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
                                    onChange={(value) => {
                                      // Prevent clearing to empty when time is the
                                      // series dimension — keeps at least one value.
                                      if (
                                        Array.isArray(value) &&
                                        value.length === 0 &&
                                        seriesDimension === 'time'
                                      )
                                        return
                                      field.onChange(value)
                                    }}
                                  />
                                  <FormMessage />
                                </FormItem>
                              ) : (
                                <FormItem key="time-single">
                                  <ProductOutputTimeSelect
                                    productRunId={productRunId}
                                    value={field.value?.[0] ?? null}
                                    isClearable={false}
                                    onChange={(value) =>
                                      field.onChange(
                                        value ? [value] : undefined,
                                      )
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
                                placeholder={
                                  suggestedTitle || 'Optional chart title'
                                }
                                {...field}
                                value={field.value ?? ''}
                                onChange={(e) => {
                                  field.onChange(e)
                                  // Once the user manually edits the title, stop
                                  // auto-updating it from suggestedTitle.
                                  titleAutoRef.current = false
                                }}
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
                                value={field.value ?? ''}
                              />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </FieldGroup>
                    </div>
                  )}

                  {/* ---- Step 3: Appearance ---- */}
                  {step === 3 && (
                    <div className="flex flex-col gap-4">
                      {/* Colour scheme — plot types use categorical */}
                      {(chartType === 'plot' || chartType === undefined) && (
                        <FieldGroup title="Colour Palette">
                          <FormField
                            control={form.control}
                            name="appearance.categoricalScheme"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Colour Scheme</FormLabel>
                                <Select
                                  value={field.value ?? 'tableau10'}
                                  onValueChange={(v) =>
                                    field.onChange(v as CategoricalColorScheme)
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {CATEGORICAL_SCHEME_OPTIONS.map((o) => (
                                      <SelectItem key={o.value} value={o.value}>
                                        {o.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                        </FieldGroup>
                      )}

                      {/* Colour scheme — table/map use sequential/diverging */}
                      {(chartType === 'table' || chartType === 'map') && (
                        <FieldGroup title="Colour and Scale">
                          <FormItem>
                            <FormLabel>Colour Map</FormLabel>
                            <Select
                              value={
                                form.watch('appearance.colorScaleType') ===
                                'diverging'
                                  ? (form.watch('appearance.divergingScheme') ??
                                    'rdBu')
                                  : (form.watch(
                                      'appearance.sequentialScheme',
                                    ) ?? 'ylOrRd')
                              }
                              onValueChange={(v) => {
                                const opt = COLOR_SCALE_OPTIONS.find(
                                  (o) => o.value === v,
                                )
                                if (!opt) return
                                const sv = { shouldValidate: false }
                                if (opt.type === 'sequential') {
                                  form.setValue(
                                    'appearance.sequentialScheme',
                                    v as SequentialColorScheme,
                                    sv,
                                  )
                                  form.setValue(
                                    'appearance.divergingScheme',
                                    undefined,
                                    sv,
                                  )
                                  form.setValue(
                                    'appearance.colorScaleType',
                                    'sequential',
                                    sv,
                                  )
                                } else {
                                  form.setValue(
                                    'appearance.divergingScheme',
                                    v as DivergingColorScheme,
                                    sv,
                                  )
                                  form.setValue(
                                    'appearance.sequentialScheme',
                                    undefined,
                                    sv,
                                  )
                                  form.setValue(
                                    'appearance.colorScaleType',
                                    'diverging',
                                    sv,
                                  )
                                  if (
                                    form.getValues(
                                      'appearance.divergingMidpoint',
                                    ) === undefined
                                  ) {
                                    form.setValue(
                                      'appearance.divergingMidpoint',
                                      0,
                                      sv,
                                    )
                                  }
                                }
                                form.trigger()
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {COLOR_SCALE_OPTIONS.map((o) => (
                                  <SelectItem key={o.value} value={o.value}>
                                    {o.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>

                          {form.watch('appearance.colorScaleType') ===
                            'diverging' && (
                            <FormField
                              control={form.control}
                              name="appearance.divergingMidpoint"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Midpoint Value</FormLabel>
                                  <Input
                                    type="number"
                                    value={field.value ?? 0}
                                    onChange={(e) =>
                                      field.onChange(
                                        e.target.value === ''
                                          ? undefined
                                          : Number(e.target.value),
                                      )
                                    }
                                  />
                                </FormItem>
                              )}
                            />
                          )}

                          <div className="grid gap-3 sm:grid-cols-2">
                            <FormField
                              control={form.control}
                              name="appearance.colorScaleMin"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Min Value</FormLabel>
                                  <Input
                                    type="number"
                                    placeholder="Auto"
                                    value={field.value ?? ''}
                                    onChange={(e) =>
                                      field.onChange(
                                        e.target.value === ''
                                          ? undefined
                                          : Number(e.target.value),
                                      )
                                    }
                                  />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="appearance.colorScaleMax"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Max Value</FormLabel>
                                  <Input
                                    type="number"
                                    placeholder="Auto"
                                    value={field.value ?? ''}
                                    onChange={(e) =>
                                      field.onChange(
                                        e.target.value === ''
                                          ? undefined
                                          : Number(e.target.value),
                                      )
                                    }
                                  />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={form.control}
                            name="appearance.reverseColorScale"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                                <FormLabel className="m-0">
                                  Reverse colour scale
                                </FormLabel>
                                <Switch
                                  checked={field.value ?? false}
                                  onCheckedChange={field.onChange}
                                />
                              </FormItem>
                            )}
                          />
                        </FieldGroup>
                      )}

                      {/* Legend position — applies to plot and map */}
                      {(chartType === 'plot' || chartType === 'map') && (
                        <FieldGroup title="Legend">
                          <FormField
                            control={form.control}
                            name="appearance.legendPosition"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Position</FormLabel>
                                <Select
                                  value={field.value ?? 'bottom'}
                                  onValueChange={(v) =>
                                    field.onChange(v as LegendPosition)
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {LEGEND_POSITION_OPTIONS.map((o) => (
                                      <SelectItem key={o.value} value={o.value}>
                                        {o.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                        </FieldGroup>
                      )}

                      {/* Chart-specific options — Map type */}
                      {chartType === 'map' && (
                        <FieldGroup title="Map Options">
                          {/* Show outlines */}
                          <FormField
                            control={form.control}
                            name="appearance.showOutlines"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                                <FormLabel className="m-0">
                                  Show outlines
                                </FormLabel>
                                <Switch
                                  checked={field.value ?? true}
                                  onCheckedChange={field.onChange}
                                />
                              </FormItem>
                            )}
                          />

                          {/* Bounding box */}
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <FormLabel>Bounding Box</FormLabel>
                              <MapExtentButton
                                onBounds={(bounds) => {
                                  form.setValue('appearance.mapBbox', bounds, {
                                    shouldValidate: false,
                                  })
                                  form.trigger()
                                }}
                              />
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <FormField
                                control={form.control}
                                name="appearance.mapBbox.minLon"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Min Longitude</FormLabel>
                                    <Input
                                      type="number"
                                      step="any"
                                      placeholder="Auto"
                                      value={field.value ?? ''}
                                      onChange={(e) =>
                                        field.onChange(
                                          e.target.value === ''
                                            ? undefined
                                            : Number(e.target.value),
                                        )
                                      }
                                    />
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="appearance.mapBbox.minLat"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Min Latitude</FormLabel>
                                    <Input
                                      type="number"
                                      step="any"
                                      placeholder="Auto"
                                      value={field.value ?? ''}
                                      onChange={(e) =>
                                        field.onChange(
                                          e.target.value === ''
                                            ? undefined
                                            : Number(e.target.value),
                                        )
                                      }
                                    />
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="appearance.mapBbox.maxLon"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Max Longitude</FormLabel>
                                    <Input
                                      type="number"
                                      step="any"
                                      placeholder="Auto"
                                      value={field.value ?? ''}
                                      onChange={(e) =>
                                        field.onChange(
                                          e.target.value === ''
                                            ? undefined
                                            : Number(e.target.value),
                                        )
                                      }
                                    />
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="appearance.mapBbox.maxLat"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Max Latitude</FormLabel>
                                    <Input
                                      type="number"
                                      step="any"
                                      placeholder="Auto"
                                      value={field.value ?? ''}
                                      onChange={(e) =>
                                        field.onChange(
                                          e.target.value === ''
                                            ? undefined
                                            : Number(e.target.value),
                                        )
                                      }
                                    />
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            {form.watch('appearance.mapBbox') && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="self-start text-xs text-muted-foreground"
                                onClick={() => {
                                  form.setValue(
                                    'appearance.mapBbox',
                                    undefined,
                                    { shouldValidate: false },
                                  )
                                  form.trigger()
                                }}
                              >
                                Clear bounding box
                              </Button>
                            )}
                          </div>
                        </FieldGroup>
                      )}

                      {/* Chart-specific options — Plot types */}
                      {chartType === 'plot' && (
                        <FieldGroup title="Chart Options">
                          {/* Show grid */}
                          <FormField
                            control={form.control}
                            name="appearance.showGrid"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                                <FormLabel className="m-0">
                                  Grid lines
                                </FormLabel>
                                <Switch
                                  checked={field.value ?? true}
                                  onCheckedChange={field.onChange}
                                />
                              </FormItem>
                            )}
                          />

                          {/* Include zero */}
                          {subType !== 'donut' && (
                            <FormField
                              control={form.control}
                              name="appearance.includeZero"
                              render={({ field }) => (
                                <FormItem className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                                  <FormLabel className="m-0">
                                    Y-axis includes zero
                                  </FormLabel>
                                  <Switch
                                    checked={field.value ?? false}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormItem>
                              )}
                            />
                          )}

                          {/* Curve type — line & area only */}
                          {(subType === 'line' ||
                            subType === 'area' ||
                            subType === 'stacked-area') && (
                            <FormField
                              control={form.control}
                              name="appearance.curveType"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Curve</FormLabel>
                                  <Select
                                    value={field.value ?? 'linear'}
                                    onValueChange={(v) =>
                                      field.onChange(v as CurveType)
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {CURVE_TYPE_OPTIONS.map((o) => (
                                        <SelectItem
                                          key={o.value}
                                          value={o.value}
                                        >
                                          {o.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}
                            />
                          )}

                          {/* Show dots — line & area only */}
                          {(subType === 'line' ||
                            subType === 'area' ||
                            subType === 'stacked-area') && (
                            <FormField
                              control={form.control}
                              name="appearance.showDots"
                              render={({ field }) => (
                                <FormItem className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                                  <FormLabel className="m-0">
                                    Show data points
                                  </FormLabel>
                                  <Switch
                                    checked={field.value ?? true}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormItem>
                              )}
                            />
                          )}

                          {/* Area opacity */}
                          {(subType === 'area' ||
                            subType === 'stacked-area') && (
                            <FormField
                              control={form.control}
                              name="appearance.areaOpacity"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Fill Opacity (0–1)</FormLabel>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={1}
                                    step={0.1}
                                    value={field.value ?? 0.3}
                                    onChange={(e) =>
                                      field.onChange(
                                        e.target.value === ''
                                          ? undefined
                                          : Number(e.target.value),
                                      )
                                    }
                                  />
                                </FormItem>
                              )}
                            />
                          )}

                          {/* Bar radius — grouped bar only */}
                          {subType === 'grouped-bar' && (
                            <FormField
                              control={form.control}
                              name="appearance.barRadius"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Corner Radius (px)</FormLabel>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={20}
                                    value={field.value ?? 4}
                                    onChange={(e) =>
                                      field.onChange(
                                        e.target.value === ''
                                          ? undefined
                                          : Number(e.target.value),
                                      )
                                    }
                                  />
                                </FormItem>
                              )}
                            />
                          )}

                          {/* Donut inner radius */}
                          {subType === 'donut' && (
                            <FormField
                              control={form.control}
                              name="appearance.donutInnerRadius"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Inner Radius (%)</FormLabel>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={90}
                                    value={field.value ?? 50}
                                    onChange={(e) =>
                                      field.onChange(
                                        e.target.value === ''
                                          ? undefined
                                          : Number(e.target.value),
                                      )
                                    }
                                  />
                                </FormItem>
                              )}
                            />
                          )}
                        </FieldGroup>
                      )}

                      {/* Formatting */}
                      <FieldGroup title="Formatting">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="appearance.decimalPlaces"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Decimal Places</FormLabel>
                                <Input
                                  type="number"
                                  min={0}
                                  max={6}
                                  value={field.value ?? 3}
                                  onChange={(e) =>
                                    field.onChange(
                                      e.target.value === ''
                                        ? undefined
                                        : Number(e.target.value),
                                    )
                                  }
                                />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="appearance.datePrecision"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Date Format</FormLabel>
                                <Select
                                  value={
                                    field.value ??
                                    DEFAULT_PRODUCT_DATE_PRECISION
                                  }
                                  onValueChange={(v) =>
                                    field.onChange(
                                      v as AppearanceConfig['datePrecision'],
                                    )
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {DATE_PRECISION_OPTIONS.map((o) => (
                                      <SelectItem key={o.value} value={o.value}>
                                        {o.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name="appearance.compactNumbers"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                              <FormLabel className="m-0">
                                Compact numbers (1.2k, 3.4M)
                              </FormLabel>
                              <Switch
                                checked={field.value ?? true}
                                onCheckedChange={field.onChange}
                              />
                            </FormItem>
                          )}
                        />
                      </FieldGroup>

                      {/* Colour overrides — list all series with their current colour */}
                      {currentSeriesEntries.length > 0 && (
                        <FieldGroup title="Colour Overrides">
                          <p className="text-xs text-muted-foreground">
                            Enter a hex colour (e.g. #3b82f6) to override the
                            scheme default for a series.
                          </p>
                          <FormField
                            control={form.control}
                            name="appearance.colorOverrides"
                            render={({ field }) => {
                              const overrides = field.value ?? {}
                              const scheme = form.getValues(
                                'appearance.categoricalScheme',
                              ) as CategoricalColorScheme | undefined
                              return (
                                <FormItem className="flex flex-col gap-2">
                                  {currentSeriesEntries.map(
                                    ({ label, overrideKeys }, index) => {
                                      const activeOverrideKey =
                                        overrideKeys.find(
                                          (key) => overrides[key] !== undefined,
                                        ) ?? overrideKeys[0]!
                                      const currentColor = resolveSeriesColor(
                                        index,
                                        scheme,
                                        overrides,
                                        overrideKeys,
                                      )
                                      const hasOverride =
                                        activeOverrideKey in overrides

                                      return (
                                        <div
                                          key={label}
                                          className="flex items-center gap-2"
                                        >
                                          <div
                                            className="h-5 w-5 shrink-0 rounded border"
                                            style={{
                                              backgroundColor: currentColor,
                                            }}
                                          />
                                          <span className="min-w-0 flex-1 truncate text-xs font-medium">
                                            {label}
                                          </span>
                                          <Input
                                            className="h-7 w-24 font-mono text-xs"
                                            value={
                                              overrides[activeOverrideKey] ?? ''
                                            }
                                            placeholder={resolveSeriesColor(
                                              index,
                                              scheme,
                                              undefined,
                                              overrideKeys,
                                            )}
                                            onChange={(e) => {
                                              const next = { ...overrides }
                                              for (const key of overrideKeys) {
                                                delete next[key]
                                              }
                                              if (e.target.value) {
                                                next[overrideKeys[0]!] =
                                                  e.target.value
                                              }
                                              field.onChange(next)
                                            }}
                                          />
                                          {hasOverride && (
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              className="h-7 w-7 p-0 text-xs text-muted-foreground"
                                              title="Reset to default"
                                              onClick={() => {
                                                const next = { ...overrides }
                                                for (const key of overrideKeys) {
                                                  delete next[key]
                                                }
                                                field.onChange(next)
                                              }}
                                            >
                                              ×
                                            </Button>
                                          )}
                                        </div>
                                      )
                                    },
                                  )}
                                </FormItem>
                              )
                            }}
                          />
                        </FieldGroup>
                      )}
                    </div>
                  )}
                </div>

                {/* Preview — right side on lg, below on small */}
                <div className="lg:flex lg:flex-1 lg:min-w-0 lg:flex-col">
                  <ChartPreview form={form} />
                </div>
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
                  {step < 3 && (
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
                  {step >= 2 && (
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
        </MapPreviewProvider>
      </DialogContent>
    </Dialog>
  )
}
