import clsx from 'clsx'
import { extent } from 'd3-array'
import { scaleDiverging, scaleSequential } from 'd3-scale'
import {
  interpolateBlues,
  interpolateBrBG,
  interpolateBuPu,
  interpolateGreens,
  interpolateInferno,
  interpolateOranges,
  interpolatePiYG,
  interpolatePlasma,
  interpolatePRGn,
  interpolateRdBu,
  interpolateRdYlGn,
  interpolateViridis,
  interpolateYlGnBu,
  interpolateYlOrRd,
} from 'd3-scale-chromatic'
import { useMemo } from 'react'
import {
  type AppearanceConfig,
  type DivergingColorScheme,
  getContrastingTextColor,
  makeDateFormatter,
  type OnSelectCallback,
  type SequentialColorScheme,
} from './types'

export type BaseTableRecord = {
  id: string
  value: number | null | undefined
  timePoint: Date | string
  indicatorName: string | null | undefined
  geometryOutputName?: string | null | undefined
}

export const DEFAULT_TABLE_DATA_PROPS = {
  xDimension: 'indicatorName',
  yDimension: 'timePoint',
  data: [
    {
      id: 'sample-1',
      timePoint: '2024-01-01T00:00:00Z',
      value: 24,
      indicatorName: 'Temperature',
      geometryOutputName: 'Region A',
    },
    {
      id: 'sample-2',
      timePoint: '2024-01-01T06:00:00Z',
      value: 18,
      indicatorName: 'Temperature',
      geometryOutputName: 'Region A',
    },
    {
      id: 'sample-3',
      timePoint: '2024-01-01T00:00:00Z',
      value: 32,
      indicatorName: 'Humidity',
      geometryOutputName: 'Region A',
    },
    {
      id: 'sample-4',
      timePoint: '2024-01-01T06:00:00Z',
      value: 41,
      indicatorName: 'Humidity',
      geometryOutputName: 'Region B',
    },
  ],
}

export function getTablePlotCodeSnippet() {
  return [
    '// TODO: Implement TablePlot code snippet for Observable.',
    '// This will output an HTML table matching the rendered view.',
  ]
}

// ---------------------------------------------------------------------------
// Colour scale helpers
// ---------------------------------------------------------------------------

type ColorInterpolator = typeof interpolateYlOrRd

const SEQUENTIAL_INTERPOLATORS: Record<
  SequentialColorScheme,
  ColorInterpolator
> = {
  ylOrRd: interpolateYlOrRd,
  viridis: interpolateViridis,
  plasma: interpolatePlasma,
  inferno: interpolateInferno,
  blues: interpolateBlues,
  greens: interpolateGreens,
  oranges: interpolateOranges,
  ylGnBu: interpolateYlGnBu,
  buPu: interpolateBuPu,
}

const DIVERGING_INTERPOLATORS: Record<DivergingColorScheme, ColorInterpolator> =
  {
    rdBu: interpolateRdBu,
    brBG: interpolateBrBG,
    piYG: interpolatePiYG,
    prGn: interpolatePRGn,
    rdYlGn: interpolateRdYlGn,
  }

const dimensionLabels = {
  timePoint: 'Time',
  indicatorName: 'Indicator',
  geometryOutputName: 'Boundary',
}

export type TablePlotDimension =
  | 'timePoint'
  | 'indicatorName'
  | 'geometryOutputName'

export type DimensionMeta = {
  key: string
  label: string
  sortValue: number | string
}

export type TablePlotRow<TRecord extends BaseTableRecord = BaseTableRecord> = {
  meta: DimensionMeta
  cells: Record<string, NormalizedTableRecord<TRecord> | undefined>
}

type NormalizedTableRecord<TRecord extends BaseTableRecord = BaseTableRecord> =
  TRecord & { timePoint: Date }

function getDimensionMeta(
  record: NormalizedTableRecord,
  dimension: TablePlotDimension,
  dateFmt: Intl.DateTimeFormat,
): DimensionMeta | null {
  switch (dimension) {
    case 'timePoint': {
      const time = record.timePoint
      const key = time.toISOString()
      return {
        key,
        label: dateFmt.format(time),
        sortValue: time.getTime(),
      }
    }
    case 'indicatorName': {
      const value = record.indicatorName
      if (!value) return null
      return {
        key: value,
        label: value,
        sortValue: value.toLowerCase(),
      }
    }
    case 'geometryOutputName': {
      const value = record.geometryOutputName
      if (!value) return null
      return {
        key: value,
        label: value,
        sortValue: value.toLowerCase(),
      }
    }
    default:
      return null
  }
}

function compareDimensionMeta(
  dimension: TablePlotDimension,
  a: DimensionMeta,
  b: DimensionMeta,
) {
  if (dimension === 'timePoint') {
    return Number(a.sortValue) - Number(b.sortValue)
  }
  return String(a.sortValue).localeCompare(String(b.sortValue))
}

export type TablePlotModel<TRecord extends BaseTableRecord = BaseTableRecord> =
  | {
      columns: DimensionMeta[]
      rows: TablePlotRow<TRecord>[]
      error?: never
    }
  | {
      error: string
      columns?: never
      rows?: never
    }

export function buildTablePlotModel<TRecord extends BaseTableRecord>({
  data,
  dateFmt,
  xDimension,
  yDimension,
}: {
  data: TRecord[]
  dateFmt: Intl.DateTimeFormat
  xDimension: TablePlotDimension
  yDimension: TablePlotDimension
}): TablePlotModel<TRecord> {
  const normalizedData = data.map((record) => {
    const time =
      record.timePoint instanceof Date
        ? record.timePoint
        : new Date(record.timePoint)

    return {
      ...record,
      timePoint: time,
    }
  })
  const columnMap = new Map<string, DimensionMeta>()
  const rowMap = new Map<string, TablePlotRow<TRecord>>()

  for (const record of normalizedData) {
    const columnMeta = getDimensionMeta(record, xDimension, dateFmt)
    const rowMeta = getDimensionMeta(record, yDimension, dateFmt)

    if (!columnMeta || !rowMeta) continue

    if (!columnMap.has(columnMeta.key)) {
      columnMap.set(columnMeta.key, columnMeta)
    }

    const rowKey = rowMeta.key
    let row = rowMap.get(rowKey)
    if (!row) {
      row = {
        meta: rowMeta,
        cells: {},
      }
      rowMap.set(rowKey, row)
    }

    if (row.cells[columnMeta.key]) {
      return {
        error:
          `Data has multiple values for (${dimensionLabels[yDimension]}=${rowMeta.label}, ` +
          `${dimensionLabels[xDimension]}=${columnMeta.label}). ` +
          'Each table cell must map to exactly one product output.',
      }
    }

    row.cells[columnMeta.key] = record
  }

  const sortedColumns = Array.from(columnMap.values()).sort((a, b) =>
    compareDimensionMeta(xDimension, a, b),
  )
  const sortedRows = Array.from(rowMap.values()).sort((a, b) =>
    compareDimensionMeta(yDimension, a.meta, b.meta),
  )

  return {
    columns: sortedColumns,
    rows: sortedRows,
  }
}

export function TablePlot<TRecord extends BaseTableRecord>({
  data,
  xDimension,
  yDimension,
  appearance,
  onSelect,
}: {
  data: TRecord[]
  xDimension: TablePlotDimension
  yDimension: TablePlotDimension
  appearance?: AppearanceConfig
  onSelect?: OnSelectCallback<TRecord>
}) {
  const numFmt = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        maximumFractionDigits: appearance?.decimalPlaces ?? 3,
        notation: appearance?.compactNumbers ? 'compact' : undefined,
      }),
    [appearance?.decimalPlaces, appearance?.compactNumbers],
  )

  const dateFmt = useMemo(
    () => makeDateFormatter(appearance?.datePrecision),
    [appearance?.datePrecision],
  )

  const tableModel = useMemo(
    () => buildTablePlotModel({ data, xDimension, yDimension, dateFmt }),
    [data, xDimension, yDimension, dateFmt],
  )

  const valueExtent = useMemo(() => {
    const values = data
      .map((record) => record.value)
      .filter(
        (value): value is number =>
          typeof value === 'number' && Number.isFinite(value),
      )
    const [min, max] = extent(values)
    return {
      min: min ?? null,
      max: max ?? null,
    }
  }, [data])

  const colorScale = useMemo(() => {
    const autoMin = valueExtent.min
    const autoMax = valueExtent.max
    if (autoMin === null || autoMax === null) {
      return null
    }

    const min = appearance?.colorScaleMin ?? autoMin
    const max = appearance?.colorScaleMax ?? autoMax
    const reverse = appearance?.reverseColorScale ?? false

    const isDiverging = appearance?.colorScaleType === 'diverging'

    if (isDiverging) {
      const baseInterpolator =
        DIVERGING_INTERPOLATORS[appearance?.divergingScheme ?? 'rdBu'] ??
        interpolateRdBu
      const interpolator = reverse
        ? (t: number) => baseInterpolator(1 - t)
        : baseInterpolator
      if (min === max) {
        const c = interpolator(0.5)
        return () => c
      }
      const mid = appearance?.divergingMidpoint ?? (min + max) / 2
      return scaleDiverging(interpolator).domain([min, mid, max])
    }

    const baseInterpolator =
      SEQUENTIAL_INTERPOLATORS[appearance?.sequentialScheme ?? 'ylOrRd'] ??
      interpolateYlOrRd
    const interpolator = reverse
      ? (t: number) => baseInterpolator(1 - t)
      : baseInterpolator
    if (min === max) {
      const c = interpolator(0.5)
      return () => c
    }
    return scaleSequential(interpolator).domain([min, max])
  }, [
    valueExtent,
    appearance?.colorScaleType,
    appearance?.sequentialScheme,
    appearance?.divergingScheme,
    appearance?.divergingMidpoint,
    appearance?.colorScaleMin,
    appearance?.colorScaleMax,
    appearance?.reverseColorScale,
  ])

  if ('error' in tableModel) {
    return (
      <div className="flex min-h-32 w-full items-center justify-center rounded-md border border-border px-4 py-8 text-center text-sm text-muted-foreground shadow-sm">
        {tableModel.error}
      </div>
    )
  }

  const { columns, rows } = tableModel

  return (
    <div className="flex w-full max-w-full min-w-0 flex-1 min-h-0 flex-col overflow-x-auto overflow-y-auto rounded-md border border-border shadow-sm">
      <table className="h-full w-full min-w-max table-auto border-collapse text-sm">
        <thead className="bg-muted/40">
          <tr>
            <th className="sticky left-0 z-1 border-b border-border bg-muted/40 px-2 py-2 text-left font-semibold">
              {dimensionLabels[yDimension]}
            </th>
            {columns.map((column) => (
              <th
                key={column.key}
                className="border-b border-l border-border px-2 py-2 text-left font-semibold"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.meta.key}
              className={clsx(
                index < rows.length - 1 && 'border-b border-border',
              )}
            >
              <th className="sticky left-0 z-1 border-r border-border bg-background px-2 py-2 text-left font-medium">
                {row.meta.label}
              </th>
              {columns.map((column) => {
                const cell = row.cells[column.key]
                const value = cell?.value
                const hasValue =
                  typeof value === 'number' && Number.isFinite(value)
                const backgroundColor =
                  hasValue && colorScale ? colorScale(value) : undefined
                const textColor =
                  backgroundColor && hasValue
                    ? getContrastingTextColor(backgroundColor)
                    : undefined
                // const isSelected = cell && cell.id === selectedId

                return (
                  <td
                    key={column.key}
                    className={clsx(
                      'border-l border-border px-2 py-2 text-right transition cursor-pointer hover:brightness-95',
                      // isSelected && 'outline outline-2 outline-primary',
                    )}
                    style={{
                      backgroundColor,
                      color: textColor,
                    }}
                    onClick={(event) => {
                      if (!onSelect) return
                      onSelect?.({ dataPoint: cell ?? null, event })
                    }}
                  >
                    {hasValue ? numFmt.format(value) : '—'}
                  </td>
                )
              })}
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td
                colSpan={columns.length + 1}
                className="px-4 py-8 text-center text-muted-foreground"
              >
                No data available for the selected configuration.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
