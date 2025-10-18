import clsx from 'clsx'
import { rgb } from 'd3-color'
import { extent } from 'd3-array'
import { scaleSequential } from 'd3-scale'
import { interpolateViridis } from 'd3-scale-chromatic'
import { useMemo } from 'react'

type BaseTableRecord = {
  id: string
  value: number | null | undefined
  timePoint: Date | string
  variableName: string
  geometryOutputName: string
}

export const DEFAULT_TABLE_DATA_PROPS = {
  groupBy: 'variableName' as const,
  data: [
    {
      id: 'sample-1',
      timePoint: '2024-01-01T00:00:00Z',
      value: 24,
      variableName: 'Temperature',
      geometryOutputName: 'Region A',
    },
    {
      id: 'sample-2',
      timePoint: '2024-01-01T06:00:00Z',
      value: 18,
      variableName: 'Temperature',
      geometryOutputName: 'Region A',
    },
    {
      id: 'sample-3',
      timePoint: '2024-01-01T00:00:00Z',
      value: 32,
      variableName: 'Humidity',
      geometryOutputName: 'Region A',
    },
    {
      id: 'sample-4',
      timePoint: '2024-01-01T06:00:00Z',
      value: 41,
      variableName: 'Humidity',
      geometryOutputName: 'Region A',
    },
  ],
}

export function getTablePlotCodeSnippet() {
  return [
    '// TODO: Implement TablePlot code snippet for Observable.',
    '// This will output an HTML table matching the rendered view.',
  ]
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const numberFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 3,
})

const LIGHT_TEXT_COLOR = '#F9FAFB'
const DARK_TEXT_COLOR = '#111827'

function getContrastingTextColor(color: string) {
  const parsedColor = rgb(color)
  if (!parsedColor.displayable()) {
    return DARK_TEXT_COLOR
  }
  const { r, g, b } = parsedColor
  const luminance = getRelativeLuminance(r / 255, g / 255, b / 255)
  return luminance > 0.5 ? DARK_TEXT_COLOR : LIGHT_TEXT_COLOR
}

function getRelativeLuminance(r: number, g: number, b: number) {
  const values = [r, g, b].map((channel) => {
    if (channel <= 0.04045) {
      return channel / 12.92
    }
    return Math.pow((channel + 0.055) / 1.055, 2.4)
  }) as [number, number, number]
  const [linearR, linearG, linearB] = values
  return 0.2126 * linearR + 0.7152 * linearG + 0.0722 * linearB
}

type TablePlotGroupBy = 'variableName' | 'geometryOutputName'

type TablePlotRow<T> = {
  time: Date
  label: string
  cells: Record<string, T | undefined>
}

export function TablePlot<T extends BaseTableRecord = BaseTableRecord>({
  data,
  groupBy,
  selectedId,
  onSelect,
}: {
  data: T[]
  groupBy: TablePlotGroupBy
  selectedId?: string | null
  onSelect?: (record: T | null) => void
}) {
  const normalizedData = useMemo(() => {
    return data.map((record) => {
      const time =
        record.timePoint instanceof Date
          ? record.timePoint
          : new Date(record.timePoint)

      return {
        ...record,
        timePoint: time,
      }
    })
  }, [data])

  const columnKey = groupBy

  const { columns, rows } = useMemo(() => {
    const columnOrder: string[] = []
    const rowMap = new Map<string, TablePlotRow<T>>()

    for (const record of normalizedData) {
      const columnName = (record as any)[columnKey] as string | undefined
      if (!columnName) continue

      if (!columnOrder.includes(columnName)) {
        columnOrder.push(columnName)
      }

      const time = record.timePoint as Date
      const rowKey = time.toISOString()
      const existingRow = rowMap.get(rowKey)

      if (existingRow) {
        existingRow.cells[columnName] = record
      } else {
        rowMap.set(rowKey, {
          time,
          label: dateFormatter.format(time),
          cells: {
            [columnName]: record,
          },
        })
      }
    }

    const rows = Array.from(rowMap.values()).sort(
      (a, b) => a.time.getTime() - b.time.getTime(),
    )

    return {
      columns: columnOrder,
      rows,
    }
  }, [columnKey, normalizedData])

  const valueExtent = useMemo(() => {
    const values = normalizedData
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
  }, [normalizedData])

  const colorScale = useMemo(() => {
    const { min, max } = valueExtent
    if (min === null || max === null) {
      return null
    }
    if (min === max) {
      const constantColor = interpolateViridis(0.5)
      return () => constantColor
    }
    return scaleSequential(interpolateViridis).domain([min, max])
  }, [valueExtent])

  return (
    <div className="w-full overflow-auto rounded-md border border-border shadow-sm">
      <table className="w-full min-w-[480px] table-fixed border-collapse text-sm">
        <thead className="bg-muted/40">
          <tr>
            <th className="sticky left-0 z-10 border-b border-border bg-muted/40 px-4 py-2 text-left font-semibold">
              Time
            </th>
            {columns.map((column) => (
              <th
                key={column}
                className="border-b border-l border-border px-4 py-2 text-left font-semibold"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.time.toISOString()} className="border-b border-border">
              <th className="sticky left-0 z-10 border-r border-border bg-background px-4 py-2 text-left font-medium">
                {row.label}
              </th>
              {columns.map((column) => {
                const cell = row.cells[column]
                const value = cell?.value
                const hasValue =
                  typeof value === 'number' && Number.isFinite(value)
                const backgroundColor =
                  hasValue && colorScale ? colorScale(value) : undefined
                const textColor =
                  backgroundColor && hasValue
                    ? getContrastingTextColor(backgroundColor)
                    : undefined
                const isSelected = cell && cell.id === selectedId

                return (
                  <td
                    key={column}
                    className={clsx(
                      'border-l border-border px-4 py-2 text-right transition',
                      onSelect && 'cursor-pointer hover:brightness-95',
                      isSelected && 'outline outline-2 outline-primary',
                    )}
                    style={{
                      backgroundColor,
                      color: textColor,
                    }}
                    onClick={() => {
                      if (!onSelect) return
                      onSelect(cell ?? null)
                    }}
                  >
                    {hasValue ? numberFormatter.format(value) : '—'}
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
