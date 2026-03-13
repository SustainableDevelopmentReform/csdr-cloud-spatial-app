'use client'

import { type ChartConfiguration, SelectedDataPoint } from '@repo/plot/types'
import type { DashboardContent } from '@repo/schemas/crud'
import { Button } from '@repo/ui/components/ui/button'
import { Copy, Hand, Trash } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import ReactGridLayout, { Layout } from 'react-grid-layout'
import { WidthProvider } from 'react-grid-layout'
import { ChartFormDialog } from '../../report/_components/chart-form-dialog'
import { ChartRenderer } from '../../report/_components/chart-renderer'

import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { ProductOutputExportListItem } from '../../product/_hooks'
import { ChartSelectedItem } from '../../report/_components/chart-selected-item'

const GridLayout = WidthProvider(ReactGridLayout)

const ROW_HEIGHT = 40
const DEFAULT_HEIGHT = 12
const DEFAULT_WIDTH = 4
const COLS = 12
type DashboardChart = DashboardContent['charts'][string]

export const createEmptyDashboardContent = (): DashboardContent => ({
  charts: {},
  layout: [],
})

const normalizeContent = (content: DashboardContent): DashboardContent => {
  const charts = { ...content.charts }
  const seen = new Set<string>()
  const layout: Layout[] = []

  content.layout.forEach((item) => {
    if (charts[item.i]) {
      layout.push({ ...item })
      seen.add(item.i)
    }
  })

  Object.keys(charts).forEach((id) => {
    if (!seen.has(id)) {
      layout.push({
        i: id,
        x: 0,
        y: Infinity,
        w: DEFAULT_WIDTH,
        h: DEFAULT_HEIGHT,
      })
    }
  })

  return {
    charts,
    layout,
  }
}

const cloneContent = (content: DashboardContent): DashboardContent =>
  normalizeContent(content)

type DashboardGridEditorProps = {
  value?: DashboardContent
  onChange?: (next: DashboardContent) => void
}

const DashboardGridEditor = ({ value, onChange }: DashboardGridEditorProps) => {
  const [selectedDataPoint, setSelectedDataPoint] =
    useState<SelectedDataPoint<ProductOutputExportListItem> | null>(null)
  const isControlled = value !== undefined

  const [internalContent, setInternalContent] = useState<DashboardContent>(() =>
    cloneContent(value ?? createEmptyDashboardContent()),
  )

  const content = isControlled ? cloneContent(value!) : internalContent

  const updateContent = useCallback(
    (updater: (current: DashboardContent) => DashboardContent) => {
      if (isControlled) {
        const next = updater(cloneContent(content))
        onChange?.(normalizeContent(next))
      } else {
        setInternalContent((prev) => {
          const next = updater(cloneContent(prev))
          const normalized = normalizeContent(next)
          onChange?.(normalized)
          return normalized
        })
      }
    },
    [isControlled, content, onChange],
  )

  const handleAddChart = useCallback(
    (chart: ChartConfiguration) => {
      const id = crypto.randomUUID()

      updateContent((prev) => ({
        charts: {
          ...prev.charts,
          [id]: chart as DashboardChart,
        },
        layout: [
          ...prev.layout,
          {
            i: id,
            x: 0,
            y: Infinity,
            w: DEFAULT_WIDTH,
            h: DEFAULT_HEIGHT,
          },
        ],
      }))
    },
    [updateContent],
  )

  const handleRemoveChart = useCallback(
    (id: string) => {
      updateContent((prev) => {
        const { [id]: _, ...restCharts } = prev.charts
        return {
          charts: restCharts,
          layout: prev.layout.filter((item) => item.i !== id),
        }
      })
    },
    [updateContent],
  )

  const handleDuplicateChart = useCallback(
    (id: string) => {
      updateContent((prev) => {
        const chart = prev.charts[id]
        if (!chart) return prev
        const newId = crypto.randomUUID()
        const source = prev.layout.find((item) => item.i === id)
        return {
          charts: {
            ...prev.charts,
            [newId]: structuredClone(chart),
          },
          layout: [
            ...prev.layout,
            {
              i: newId,
              x: 0,
              y: Infinity,
              w: source?.w ?? DEFAULT_WIDTH,
              h: source?.h ?? DEFAULT_HEIGHT,
            },
          ],
        }
      })
    },
    [updateContent],
  )

  const handleUpdateChart = useCallback(
    (id: string, nextChart: ChartConfiguration) => {
      updateContent((prev) => {
        if (!prev.charts[id]) {
          return prev
        }
        return {
          charts: {
            ...prev.charts,
            [id]: nextChart as DashboardChart,
          },
          layout: prev.layout,
        }
      })
    },
    [updateContent],
  )

  const orderedCharts = useMemo(() => {
    const layoutMap = new Map(content.layout.map((item) => [item.i, item]))
    const items = content.layout
      .map((item) => {
        const chart = content.charts[item.i]
        if (!chart) return null
        return { id: item.i, chart }
      })
      .filter((item): item is { id: string; chart: DashboardChart } => !!item)

    Object.entries(content.charts).forEach(([id, chart]) => {
      if (!layoutMap.has(id)) {
        items.push({ id, chart })
      }
    })

    return items
  }, [content.charts, content.layout])

  const hasCharts = orderedCharts.length > 0

  return (
    <div className="flex flex-col gap-4">
      <ChartFormDialog
        buttonText="Add chart"
        chart={null}
        onSubmit={handleAddChart}
      />

      {hasCharts ? (
        <GridLayout
          className="layout"
          layout={content.layout}
          cols={COLS}
          rowHeight={ROW_HEIGHT}
          margin={[16, 16]}
          containerPadding={[0, 0]}
          draggableCancel=".grid-item-action"
          draggableHandle=".grid-item-handle"
          onLayoutChange={(nextLayout) => {
            updateContent((prev) => ({
              charts: prev.charts,
              layout: nextLayout,
            }))
          }}
        >
          {orderedCharts.map(({ id, chart }) => (
            <div key={id} className="group relative h-full">
              <div className="grid-item-toolbar pointer-events-none absolute left-4 right-4 top-4 z-10 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
                <div className="grid-item-handle flex w-full cursor-grab select-none items-center gap-3 rounded-full bg-background/90 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm ring-1 ring-border/60 backdrop-blur transition active:cursor-grabbing">
                  <Hand className="h-4 w-4" />
                  <span className="truncate">Drag to reposition...</span>
                  <div className="ml-auto flex items-center gap-2 text-muted-foreground grid-item-action">
                    <ChartFormDialog
                      buttonText="Edit chart"
                      chart={chart}
                      onSubmit={(nextChart) => handleUpdateChart(id, nextChart)}
                    />

                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="rounded-full"
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        event.nativeEvent.stopImmediatePropagation()
                        handleDuplicateChart(id)
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>

                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="text-destructive focus:text-destructive rounded-full"
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        event.nativeEvent.stopImmediatePropagation()
                        handleRemoveChart(id)
                      }}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
                <div className="flex flex-1 flex-col overflow-hidden p-2">
                  <ChartRenderer
                    chart={chart}
                    onSelect={setSelectedDataPoint}
                    config={{
                      showTitleAndDescription: true,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </GridLayout>
      ) : (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-md border border-dashed bg-muted/20 text-center text-sm text-muted-foreground">
          <p className="max-w-md px-6">
            Use &ldquo;Add chart&rdquo; to build a new visualization. It will
            appear here as a draggable, resizable card.
          </p>
        </div>
      )}
      <ChartSelectedItem
        selectedDataPoint={selectedDataPoint}
        onSelect={setSelectedDataPoint}
      />
    </div>
  )
}

export { DashboardGridEditor }
export default DashboardGridEditor
