'use client'

import {
  type AppearanceConfig,
  type CategoricalColorScheme,
  type CurveType,
  getContrastingTextColor,
  makeDateFormatter,
  makeNumberFormatter,
  type OnSelectCallback,
  type PlotSubType,
} from './types'
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
  LabelList,
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
} from './recharts-frame'

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
  seriesKey?: string | string[],
) {
  if (seriesKey) {
    const lookupKeys = Array.isArray(seriesKey) ? seriesKey : [seriesKey]
    for (const key of lookupKeys) {
      if (overrides?.[key]) return overrides[key]
    }
  }
  const palette = getScheme(scheme)
  return palette[index % palette.length] ?? '#000'
}

function makeFormatXAxis(dateFmt: Intl.DateTimeFormat) {
  return function formatXAxis(value: unknown): string {
    if (value instanceof Date) return dateFmt.format(value)
    if (typeof value === 'string') {
      const date = new Date(value)
      if (!Number.isNaN(date.getTime())) return dateFmt.format(date)
    }
    return String(value ?? '')
  }
}

function makeFormatValue(numFmt: Intl.NumberFormat) {
  return function formatValue(value: unknown): string {
    return typeof value === 'number'
      ? numFmt.format(value)
      : String(value ?? '')
  }
}

interface BasePlotRecord {
  id: string
  value: number
  [key: string]: unknown
}

function field(record: Record<string, unknown>, key: string): unknown {
  return record[key]
}

function numericField(record: Record<string, unknown>, key: string): number {
  const value = record[key]
  return typeof value === 'number' ? value : 0
}

function toStringKey(value: unknown): string {
  if (value instanceof Date) return value.toISOString()
  return String(value ?? '')
}

function toSeriesKey(value: unknown): string {
  const key = toStringKey(value)
  return key === '' ? 'Value' : key
}

function pivotData(
  data: Record<string, unknown>[],
  x: string,
  y: string,
  groupBy: string,
):
  | { pivoted: Record<string, unknown>[]; seriesKeys: string[]; error?: never }
  | { error: string; pivoted?: never; seriesKeys?: never } {
  const seriesSet = new Set<string>()
  const grouped = new Map<string, Record<string, unknown>>()

  for (const item of data) {
    const xKey = toStringKey(field(item, x))
    const groupValue = toSeriesKey(field(item, groupBy))
    const yValue = numericField(item, y)

    seriesSet.add(groupValue)

    let row = grouped.get(xKey)
    if (!row) {
      row = { [x]: xKey }
      grouped.set(xKey, row)
    }

    if (groupValue in row) {
      return {
        error:
          `Data has multiple values for (${x}=${xKey}, ${groupBy}=${groupValue}). ` +
          'Each chart element must map to exactly one product output — ' +
          'narrow your selection so only one dimension varies per axis.',
      }
    }

    row[groupValue] = yValue
  }

  const seriesKeys = Array.from(seriesSet)
  const pivoted = Array.from(grouped.values()).sort((a, b) =>
    String(a[x]).localeCompare(String(b[x])),
  )

  return { pivoted, seriesKeys }
}

type DonutSlice = {
  name: string
  value: number
  fill: string
  originalIndex: number
}

type FormatFn = ReturnType<typeof makeFormatValue>

function defaultSeriesLabelFormatter(seriesKey: string): string {
  return String(seriesKey)
}

type SeriesLabelFormatter = typeof defaultSeriesLabelFormatter

function prepareDonutSlices(
  data: Record<string, unknown>[],
  x: string,
  y: string,
  groupBy: string,
  fmtX: FormatFn,
  scheme?: CategoricalColorScheme,
  overrides?: Record<string, string>,
): DonutSlice[] {
  const groupIndex = new Map<string, number>()
  for (const item of data) {
    const group = toSeriesKey(field(item, groupBy))
    if (!groupIndex.has(group)) groupIndex.set(group, groupIndex.size)
  }

  return data.map((item, index) => {
    const group = toSeriesKey(field(item, groupBy))
    const name =
      x === groupBy
        ? fmtX(field(item, x))
        : `${group} — ${fmtX(field(item, x))}`
    const colorKey = x === groupBy ? [fmtX(field(item, groupBy)), group] : group
    return {
      name,
      value: numericField(item, y),
      fill: getColor(
        groupIndex.get(group) ?? index,
        scheme,
        overrides,
        colorKey,
      ),
      originalIndex: index,
    }
  })
}

function groupBySeries<T extends BasePlotRecord>(
  data: T[],
  groupBy: string,
  sortBy?: string,
): { seriesKey: string; seriesData: T[] }[] {
  const groups = new Map<string, T[]>()

  for (const item of data) {
    const key = toSeriesKey(field(item, groupBy))
    const current = groups.get(key) ?? []
    current.push(item)
    groups.set(key, current)
  }

  return Array.from(groups.entries()).map(([seriesKey, seriesData]) => ({
    seriesKey,
    seriesData: sortBy
      ? [...seriesData].sort((a, b) =>
          toStringKey(field(a, sortBy)).localeCompare(
            toStringKey(field(b, sortBy)),
          ),
        )
      : seriesData,
  }))
}

function buildChartConfig(
  seriesKeys: string[],
  scheme?: CategoricalColorScheme,
  overrides?: Record<string, string>,
  getSeriesLabel: SeriesLabelFormatter = defaultSeriesLabelFormatter,
): ChartConfig {
  const config: ChartConfig = {}
  seriesKeys.forEach((key, index) => {
    const label = getSeriesLabel(key)
    config[key] = {
      label,
      color: getColor(index, scheme, overrides, [label, key]),
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

interface BarClickData {
  payload?: Record<string, unknown>
}

interface DotRenderProps {
  cx?: number
  cy?: number
  r?: number
  fill?: string
  stroke?: string
  payload?: Record<string, unknown>
  index?: number
}

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
  const formatSeriesKey = useCallback(
    (seriesKey: string) =>
      groupBy === 'timePoint' ? formatXAxis(seriesKey) : seriesKey,
    [formatXAxis, groupBy],
  )

  const yDomain = useMemo<
    [number | string, number | string] | undefined
  >(() => {
    if (yMin !== undefined || yMax !== undefined) {
      return [yMin ?? 'auto', yMax ?? 'auto']
    }
    if (includeZero) return [0, 'auto']
    return undefined
  }, [yMin, yMax, includeZero])

  const pivotResult = useMemo(
    () => pivotData(data, x, y, groupBy),
    [data, x, y, groupBy],
  )
  const pivoted = pivotResult.pivoted ?? []
  const seriesKeys = useMemo(
    () => pivotResult.seriesKeys ?? [],
    [pivotResult.seriesKeys],
  )

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

  const scatterGroups = useMemo(
    () => (type === 'dot' ? groupBySeries(data, groupBy, x) : []),
    [data, groupBy, type, x],
  )

  const chartConfig = useMemo(() => {
    if (type === 'donut') return buildDonutConfig(donutSlices)
    return buildChartConfig(seriesKeys, scheme, overrides, formatSeriesKey)
  }, [seriesKeys, donutSlices, type, scheme, overrides, formatSeriesKey])

  const colorOf = useCallback(
    (key: string): string => chartConfig[key]?.color ?? '#000',
    [chartConfig],
  )
  const labelOf = useCallback(
    (key: string): string => {
      const label = chartConfig[key]?.label
      return typeof label === 'string' ? label : formatSeriesKey(key)
    },
    [chartConfig, formatSeriesKey],
  )

  const legendElement =
    legendPos === 'none' ? null : (
      <ChartLegend
        content={
          <ChartLegendContent nameKey={type === 'donut' ? 'name' : undefined} />
        }
        verticalAlign={legendPos}
      />
    )

  const findByXAndGroup = useCallback(
    (xValue: unknown, seriesName: string): T | null => {
      const target = String(xValue ?? '')
      return (
        data.find(
          (item) =>
            toStringKey(field(item, x)) === target &&
            toSeriesKey(field(item, groupBy)) === seriesName,
        ) ?? null
      )
    },
    [data, x, groupBy],
  )

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

  const makeDotRenderer = useCallback(
    (seriesKey: string, radius: number, color: string) =>
      (props: DotRenderProps) => {
        const pointKey = `${seriesKey}:${props.index ?? 'active'}:${props.cx ?? ''}:${props.cy ?? ''}`

        return (
          <circle
            key={pointKey}
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
        )
      },
    [onSelect, findByXAndGroup, x],
  )

  if (pivotResult.error) {
    return (
      <div className="flex h-full min-h-[120px] items-center justify-center rounded-md border border-destructive/50 bg-destructive/5 px-6 py-4 text-center text-sm text-destructive">
        {pivotResult.error}
      </div>
    )
  }

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
              if (record) onSelect({ dataPoint: record, event })
            }}
          >
            {donutSlices.map((slice) => (
              <Cell
                key={slice.name}
                fill={slice.fill}
                className="outline-none"
              />
            ))}
          </Pie>
          {legendElement}
        </PieChart>
      </ChartContainer>
    )
  }

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
          {scatterGroups.map(({ seriesKey, seriesData }) => (
            <Scatter
              key={seriesKey}
              name={labelOf(seriesKey)}
              data={seriesData}
              fill={colorOf(seriesKey)}
              isAnimationActive={false}
              onClick={(
                _point: Record<string, unknown>,
                pointIndex: number,
                event: ReactMouseEvent,
              ) => {
                if (!onSelect) return
                const record = seriesData[pointIndex]
                if (record) onSelect({ dataPoint: record, event })
              }}
            />
          ))}
        </ScatterChart>
      </ChartContainer>
    )
  }

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

  if (type === 'ranked-bar') {
    const colorIndex = new Map<string, number>()
    const ranked = data
      .map((item) => {
        const rawKey = toSeriesKey(field(item, groupBy))
        const displayKey = formatSeriesKey(rawKey)
        if (!colorIndex.has(rawKey)) colorIndex.set(rawKey, colorIndex.size)
        const index = colorIndex.get(rawKey) ?? 0
        return {
          name: displayKey,
          rawKey,
          value: numericField(item, y),
          fill: getColor(index, scheme, overrides, [displayKey, rawKey]),
          originalId: item.id,
        }
      })
      .sort((a, b) => b.value - a.value)

    const rankedConfig: ChartConfig = {}
    ranked.forEach((entry) => {
      rankedConfig[entry.name] = { label: entry.name, color: entry.fill }
    })

    return (
      <ChartContainer
        config={rankedConfig}
        className={className ?? 'aspect-auto h-full w-full min-h-[240px]'}
      >
        <BarChart
          accessibilityLayer
          data={ranked}
          layout="vertical"
          margin={{ right: 60, left: 10 }}
        >
          {showGrid && <CartesianGrid horizontal={false} />}
          <YAxis
            dataKey="name"
            type="category"
            tickLine={false}
            axisLine={false}
            hide
          />
          <XAxis
            dataKey="value"
            type="number"
            tickFormatter={formatValue}
            hide
          />
          <Bar
            dataKey="value"
            layout="vertical"
            radius={barRadius}
            isAnimationActive={false}
            style={{ cursor: onSelect ? 'pointer' : undefined }}
            onClick={(
              barData: BarClickData,
              _index: number,
              event: ReactMouseEvent,
            ) => {
              if (!onSelect) return
              const originalId = barData.payload?.originalId
              const record =
                typeof originalId === 'string'
                  ? (data.find((item) => item.id === originalId) ?? null)
                  : null
              onSelect({ dataPoint: record, event })
            }}
          >
            {ranked.map((entry) => (
              <Cell
                key={entry.originalId}
                fill={entry.fill}
                className="outline-none"
              />
            ))}
            <LabelList
              dataKey="name"
              position="insideLeft"
              offset={8}
              fontSize={12}
              fontWeight={500}
              content={({
                x: labelX,
                y: labelY,
                width,
                height,
                value,
                index,
              }) => {
                const barFill =
                  typeof index === 'number' ? ranked[index]?.fill : undefined
                const textFill = barFill
                  ? getContrastingTextColor(barFill)
                  : '#fff'
                const barX = typeof labelX === 'number' ? labelX : 0
                const barY = typeof labelY === 'number' ? labelY : 0
                const barH = typeof height === 'number' ? height : 0
                const barW = typeof width === 'number' ? width : 0
                if (barW < 40) return null
                return (
                  <text
                    x={barX + 8}
                    y={barY + barH / 2}
                    fill={textFill}
                    fontSize={12}
                    fontWeight={500}
                    dominantBaseline="central"
                  >
                    {String(value ?? '')}
                  </text>
                )
              }}
            />
            <LabelList
              dataKey="value"
              position="right"
              offset={8}
              className="fill-foreground"
              fontSize={12}
              formatter={formatValue}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    )
  }

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
