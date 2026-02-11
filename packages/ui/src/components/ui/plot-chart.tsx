'use client'

import {
  type AppearanceConfig,
  type CategoricalColorScheme,
  type CurveType,
  makeDateFormatter,
  type OnSelectCallback,
  type PlotSubType,
} from '@repo/plot/types'
import {
  schemeAccent,
  schemeCategory10,
  schemeDark2,
  schemeObservable10,
  schemePaired,
  schemeSet1,
  schemeSet2,
  schemeSet3,
  schemeTableau10,
} from 'd3-scale-chromatic'
import { type MouseEvent as ReactMouseEvent, useCallback, useMemo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
} from 'recharts'
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
} from './chart'

// ---------------------------------------------------------------------------
// Categorical colour palettes
// ---------------------------------------------------------------------------

const CATEGORICAL_SCHEMES: Record<CategoricalColorScheme, readonly string[]> = {
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

function getScheme(name?: CategoricalColorScheme): readonly string[] {
  return CATEGORICAL_SCHEMES[name ?? 'tableau10'] ?? schemeTableau10
}

function getColor(
  index: number,
  scheme?: CategoricalColorScheme,
  overrides?: Record<string, string>,
  seriesKey?: string,
) {
  if (seriesKey && overrides?.[seriesKey]) return overrides[seriesKey]
  const palette = getScheme(scheme)
  return palette[index % palette.length]!
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

function makeNumberFormatter(
  decimalPlaces?: number,
  compact?: boolean,
): Intl.NumberFormat {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: decimalPlaces ?? 3,
    notation: compact ? 'compact' : undefined,
  })
}

function makeFormatXAxis(dateFmt: Intl.DateTimeFormat) {
  return function formatXAxis(value: unknown): string {
    if (value instanceof Date) {
      return dateFmt.format(value)
    }
    if (typeof value === 'string') {
      const date = new Date(value)
      if (!isNaN(date.getTime())) {
        return dateFmt.format(date)
      }
    }
    return String(value ?? '')
  }
}

function makeFormatValue(numFmt: Intl.NumberFormat) {
  return function formatValue(value: unknown): string {
    if (typeof value === 'number') {
      return numFmt.format(value)
    }
    return String(value ?? '')
  }
}

// ---------------------------------------------------------------------------
// Data transformation helpers
// ---------------------------------------------------------------------------

interface BasePlotRecord {
  id: string
  value: number
  [key: string]: unknown
}

/** Read a dynamic string key from a record, returning `unknown`. */
function field(record: Record<string, unknown>, key: string): unknown {
  return record[key]
}

/** Read a dynamic string key from a record and coerce to number (or 0). */
function numericField(record: Record<string, unknown>, key: string): number {
  const v = record[key]
  return typeof v === 'number' ? v : 0
}

/** Normalise a value to a stable string key (ISO for Dates). */
function toStringKey(value: unknown): string {
  if (value instanceof Date) return value.toISOString()
  return String(value ?? '')
}

/**
 * Pivots flat records into the wide-format Recharts expects for cartesian
 * charts (line, area, bar).
 *
 * x-values are normalised to strings so Recharts payloads and original-record
 * lookups always compare consistently.
 */
function pivotData(
  data: Record<string, unknown>[],
  x: string,
  y: string,
  groupBy: string,
): { pivoted: Record<string, unknown>[]; seriesKeys: string[] } {
  const seriesSet = new Set<string>()
  const grouped = new Map<string, Record<string, unknown>>()

  for (const item of data) {
    const xKey = toStringKey(field(item, x))
    const groupValue = String(field(item, groupBy) ?? 'Value')
    const yValue = numericField(item, y)

    seriesSet.add(groupValue)

    if (!grouped.has(xKey)) {
      grouped.set(xKey, { [x]: xKey })
    }

    const row = grouped.get(xKey)!
    row[groupValue] = yValue
  }

  const seriesKeys = Array.from(seriesSet)
  const pivoted = Array.from(grouped.values()).sort((a, b) =>
    String(a[x]).localeCompare(String(b[x])),
  )

  return { pivoted, seriesKeys }
}

/**
 * Prepares donut chart data — 1:1 mapping from original records to slices.
 * No aggregation: each record becomes its own slice.
 */
interface DonutSlice {
  name: string
  value: number
  fill: string
  originalIndex: number
}

interface FormatFn {
  // eslint-disable-next-line no-unused-vars
  (input: unknown): string
}

function prepareDonutSlices(
  data: Record<string, unknown>[],
  x: string,
  y: string,
  groupBy: string,
  fmtX: FormatFn,
  scheme?: CategoricalColorScheme,
  overrides?: Record<string, string>,
): DonutSlice[] {
  // Build a stable colour index per unique group value so all slices in the
  // same group share a colour (e.g. all "Carbon" slices are the same hue).
  const groupIndex = new Map<string, number>()
  for (const item of data) {
    const grp = String(field(item, groupBy) ?? 'Value')
    if (!groupIndex.has(grp)) {
      groupIndex.set(grp, groupIndex.size)
    }
  }

  return data.map((item, index) => {
    const grp = String(field(item, groupBy) ?? 'Value')
    const name = `${grp} — ${fmtX(field(item, x))}`
    return {
      name,
      value: numericField(item, y),
      // Use the group value for override lookup so that a single override
      // key (e.g. "Carbon") colours every slice belonging to that group.
      fill: getColor(groupIndex.get(grp) ?? index, scheme, overrides, grp),
      originalIndex: index,
    }
  })
}

/**
 * Groups flat records by the `groupBy` field — used for scatter charts
 * where each series needs its own data array.
 */
function groupBySeries<T extends BasePlotRecord>(
  data: T[],
  groupBy: string,
  sortBy?: string,
): { seriesKey: string; seriesData: T[] }[] {
  const groups = new Map<string, T[]>()

  for (const item of data) {
    const key = String(field(item, groupBy) ?? 'Value')
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(item)
  }

  return Array.from(groups.entries()).map(([seriesKey, seriesData]) => ({
    seriesKey,
    seriesData: sortBy
      ? seriesData.sort((a, b) =>
          toStringKey(field(a, sortBy)).localeCompare(
            toStringKey(field(b, sortBy)),
          ),
        )
      : seriesData,
  }))
}

// ---------------------------------------------------------------------------
// Dynamic ChartConfig builders
// ---------------------------------------------------------------------------

function buildChartConfig(
  seriesKeys: string[],
  scheme?: CategoricalColorScheme,
  overrides?: Record<string, string>,
): ChartConfig {
  const config: ChartConfig = {}
  seriesKeys.forEach((key, index) => {
    config[key] = {
      label: key,
      color: getColor(index, scheme, overrides, key),
    }
  })
  return config
}

function buildDonutConfig(slices: DonutSlice[]): ChartConfig {
  const config: ChartConfig = {}
  slices.forEach((slice) => {
    config[slice.name] = {
      label: slice.name,
      color: slice.fill,
    }
  })
  return config
}

// ---------------------------------------------------------------------------
// Per-element click handler types
// ---------------------------------------------------------------------------

/** Shape of the first argument in Recharts Bar onClick callback. */
interface BarClickData {
  payload?: Record<string, unknown>
}

/** Shape of props passed to the activeDot render function on Line / Area. */
interface DotRenderProps {
  cx?: number
  cy?: number
  r?: number
  fill?: string
  stroke?: string
  payload?: Record<string, unknown>
  index?: number
}

// ---------------------------------------------------------------------------
// PlotChart component
// ---------------------------------------------------------------------------

export interface PlotChartProps<T extends BasePlotRecord> {
  data: T[]
  x: string
  y: string
  groupBy: string
  type: PlotSubType
  appearance?: AppearanceConfig
  onSelect?: OnSelectCallback<T>
  className?: string
}

export function PlotChart<T extends BasePlotRecord>({
  data,
  x,
  y,
  groupBy,
  type,
  appearance,
  onSelect,
  className,
}: PlotChartProps<T>) {
  const scheme = appearance?.categoricalScheme
  const overrides = appearance?.colorOverrides
  const curveType: CurveType = appearance?.curveType ?? 'linear'
  const showDots = appearance?.showDots ?? true
  const showGrid = appearance?.showGrid ?? true
  const legendPos = appearance?.legendPosition ?? 'bottom'
  const areaOpacity = appearance?.areaOpacity ?? 0.3
  const barRadius = appearance?.barRadius ?? 4
  const donutInner = appearance?.donutInnerRadius ?? 50
  const includeZero = appearance?.includeZero
  const yMin = appearance?.yMin
  const yMax = appearance?.yMax

  // Formatters (memoised on appearance)
  const formatXAxis = useMemo(
    () => makeFormatXAxis(makeDateFormatter(appearance?.datePrecision)),
    [appearance?.datePrecision],
  )
  const formatValue = useMemo(
    () =>
      makeFormatValue(
        makeNumberFormatter(
          appearance?.decimalPlaces,
          appearance?.compactNumbers,
        ),
      ),
    [appearance?.decimalPlaces, appearance?.compactNumbers],
  )

  // Y-axis domain
  const yDomain = useMemo<
    [number | string, number | string] | undefined
  >(() => {
    if (yMin !== undefined || yMax !== undefined) {
      return [yMin ?? 'auto', yMax ?? 'auto']
    }
    if (includeZero) return [0, 'auto']
    return undefined
  }, [yMin, yMax, includeZero])

  // Pivoted data for cartesian charts (line, area, bar)
  const { pivoted, seriesKeys } = useMemo(
    () => pivotData(data, x, y, groupBy),
    [data, x, y, groupBy],
  )

  // Donut: 1:1 slices — no aggregation
  const donutSlices = useMemo(
    () =>
      type === 'donut'
        ? prepareDonutSlices(
            data,
            x,
            y,
            groupBy,
            formatXAxis,
            scheme,
            overrides,
          )
        : [],
    [data, x, y, groupBy, type, formatXAxis, scheme, overrides],
  )

  // Grouped data for scatter
  const scatterGroups = useMemo(
    () => (type === 'dot' ? groupBySeries(data, groupBy, x) : []),
    [data, groupBy, type, x],
  )

  // Build dynamic ChartConfig
  const chartConfig = useMemo(() => {
    if (type === 'donut') return buildDonutConfig(donutSlices)
    return buildChartConfig(seriesKeys, scheme, overrides)
  }, [seriesKeys, donutSlices, type, scheme, overrides])

  // Direct color lookup — avoids CSS custom-property indirection entirely
  const colorOf = useCallback(
    (key: string): string => {
      return chartConfig[key]?.color ?? '#000'
    },
    [chartConfig],
  )

  // Legend element (shared across chart types)
  const legendElement =
    legendPos === 'none' ? null : (
      <ChartLegend
        content={
          <ChartLegendContent nameKey={type === 'donut' ? 'name' : undefined} />
        }
        verticalAlign={legendPos}
      />
    )

  // ---------------------------------------------------------------------------
  // Lookup helpers
  // ---------------------------------------------------------------------------

  /**
   * Find an original record matching both the x-value AND the group value.
   * Used by bar / line / area click handlers where multiple series share the
   * same x-position — the series key from the closure disambiguates.
   */
  const findByXAndGroup = useCallback(
    (xValue: unknown, seriesName: string): T | null => {
      const target = String(xValue ?? '')
      return (
        data.find(
          (item) =>
            toStringKey(field(item, x)) === target &&
            String(field(item, groupBy) ?? 'Value') === seriesName,
        ) ?? null
      )
    },
    [data, x, groupBy],
  )

  // ---------------------------------------------------------------------------
  // Per-element click factories
  // ---------------------------------------------------------------------------

  /**
   * Returns an onClick handler for a specific `<Bar>` element.
   * The series key is captured via closure so we always know *which* bar was
   * clicked, even when multiple series share the same x-position.
   */
  const makeBarClick = useCallback(
    (seriesKey: string) =>
      (barData: BarClickData, _index: number, event: ReactMouseEvent) => {
        if (!onSelect || !barData.payload) return
        const xValue = field(barData.payload, x)
        const match = findByXAndGroup(xValue, seriesKey)
        onSelect({ dataPoint: match, event })
      },
    [onSelect, findByXAndGroup, x],
  )

  /**
   * Returns a dot render function for a specific `<Line>` or `<Area>`.
   * Used for both `dot` (always visible) and `activeDot` (hover) props.
   * Each rendered circle includes an onClick so every data point is clickable.
   */
  const makeDotRenderer = useCallback(
    (seriesKey: string, radius: number, color: string) =>
      (props: DotRenderProps) => (
        <circle
          cx={props.cx}
          cy={props.cy}
          r={radius}
          fill={color}
          style={{ cursor: onSelect ? 'pointer' : undefined }}
          onClick={(event) => {
            if (!onSelect || !props.payload) return
            const xValue = field(props.payload, x)
            const match = findByXAndGroup(xValue, seriesKey)
            onSelect({ dataPoint: match, event })
          }}
        />
      ),
    [onSelect, findByXAndGroup, x],
  )

  // ---- Donut (1:1 — each record is its own slice) ----
  if (type === 'donut') {
    return (
      <ChartContainer
        config={chartConfig}
        className={className ?? 'aspect-auto h-full w-full min-h-[240px]'}
      >
        <PieChart>
          <Pie
            data={donutSlices}
            dataKey="value"
            nameKey="name"
            innerRadius={`${donutInner}%`}
            outerRadius="80%"
            paddingAngle={2}
            strokeWidth={0}
            isAnimationActive={false}
            onClick={(
              _entry: Record<string, unknown>,
              index: number,
              event: ReactMouseEvent,
            ) => {
              if (!onSelect) return
              const slice = donutSlices[index]
              if (!slice) return
              const record = data[slice.originalIndex]
              if (record) {
                onSelect({ dataPoint: record, event })
              }
            }}
          >
            {donutSlices.map((slice, i) => (
              <Cell key={i} fill={slice.fill} className="outline-none" />
            ))}
          </Pie>
          {legendElement}
        </PieChart>
      </ChartContainer>
    )
  }

  // ---- Scatter / Dot ----
  if (type === 'dot') {
    return (
      <ChartContainer
        config={chartConfig}
        className={className ?? 'aspect-auto h-full w-full min-h-[240px]'}
      >
        <ScatterChart accessibilityLayer>
          {showGrid && <CartesianGrid strokeDasharray="3 3" />}
          <XAxis
            dataKey={x}
            name={x}
            type="category"
            allowDuplicatedCategory={false}
            tickFormatter={formatXAxis}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <YAxis
            dataKey={y}
            name={y}
            type="number"
            domain={yDomain}
            tickFormatter={formatValue}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          {legendElement}
          {scatterGroups.map(({ seriesKey, seriesData }, index) => (
            <Scatter
              key={seriesKey}
              name={seriesKey}
              data={seriesData}
              fill={getColor(index, scheme, overrides, seriesKey)}
              isAnimationActive={false}
              onClick={(
                _point: Record<string, unknown>,
                pointIndex: number,
                event: ReactMouseEvent,
              ) => {
                if (!onSelect) return
                const record = seriesData[pointIndex]
                if (record) {
                  onSelect({ dataPoint: record, event })
                }
              }}
            />
          ))}
        </ScatterChart>
      </ChartContainer>
    )
  }

  // ---- Area / Stacked Area ----
  if (type === 'area' || type === 'stacked-area') {
    const stackId = type === 'stacked-area' ? 'stack' : undefined
    return (
      <ChartContainer
        config={chartConfig}
        className={className ?? 'aspect-auto h-full w-full min-h-[240px]'}
      >
        <AreaChart accessibilityLayer data={pivoted}>
          {showGrid && <CartesianGrid vertical={false} />}
          <XAxis
            dataKey={x}
            tickFormatter={formatXAxis}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <YAxis
            domain={yDomain}
            tickFormatter={formatValue}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          {legendElement}
          {seriesKeys.map((key) => (
            <Area
              key={key}
              type={curveType}
              dataKey={key}
              stackId={stackId}
              stroke={colorOf(key)}
              fill={colorOf(key)}
              fillOpacity={areaOpacity}
              isAnimationActive={false}
              dot={showDots ? makeDotRenderer(key, 3, colorOf(key)) : false}
              activeDot={
                showDots ? makeDotRenderer(key, 5, colorOf(key)) : false
              }
            />
          ))}
        </AreaChart>
      </ChartContainer>
    )
  }

  // ---- Stacked Bar ----
  if (type === 'stacked-bar') {
    return (
      <ChartContainer
        config={chartConfig}
        className={className ?? 'aspect-auto h-full w-full min-h-[240px]'}
      >
        <BarChart accessibilityLayer data={pivoted}>
          {showGrid && <CartesianGrid vertical={false} />}
          <XAxis
            dataKey={x}
            tickFormatter={formatXAxis}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <YAxis
            domain={yDomain}
            tickFormatter={formatValue}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          {legendElement}
          {seriesKeys.map((key) => (
            <Bar
              key={key}
              dataKey={key}
              stackId="stack"
              fill={colorOf(key)}
              radius={[0, 0, 0, 0]}
              isAnimationActive={false}
              onClick={makeBarClick(key)}
              style={{ cursor: onSelect ? 'pointer' : undefined }}
            />
          ))}
        </BarChart>
      </ChartContainer>
    )
  }

  // ---- Grouped Bar ----
  if (type === 'grouped-bar') {
    return (
      <ChartContainer
        config={chartConfig}
        className={className ?? 'aspect-auto h-full w-full min-h-[240px]'}
      >
        <BarChart accessibilityLayer data={pivoted}>
          {showGrid && <CartesianGrid vertical={false} />}
          <XAxis
            dataKey={x}
            tickFormatter={formatXAxis}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <YAxis
            domain={yDomain}
            tickFormatter={formatValue}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          {legendElement}
          {seriesKeys.map((key) => (
            <Bar
              key={key}
              dataKey={key}
              fill={colorOf(key)}
              radius={barRadius}
              isAnimationActive={false}
              onClick={makeBarClick(key)}
              style={{ cursor: onSelect ? 'pointer' : undefined }}
            />
          ))}
        </BarChart>
      </ChartContainer>
    )
  }

  // ---- Line (default) ----
  return (
    <ChartContainer
      config={chartConfig}
      className={className ?? 'aspect-auto h-full w-full min-h-[240px]'}
    >
      <LineChart accessibilityLayer data={pivoted}>
        {showGrid && <CartesianGrid vertical={false} />}
        <XAxis
          dataKey={x}
          tickFormatter={formatXAxis}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis
          domain={yDomain}
          tickFormatter={formatValue}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        {legendElement}
        {seriesKeys.map((key) => (
          <Line
            key={key}
            type={curveType}
            dataKey={key}
            stroke={colorOf(key)}
            strokeWidth={2}
            isAnimationActive={false}
            dot={showDots ? makeDotRenderer(key, 3, colorOf(key)) : false}
            activeDot={showDots ? makeDotRenderer(key, 5, colorOf(key)) : false}
          />
        ))}
      </LineChart>
    </ChartContainer>
  )
}
