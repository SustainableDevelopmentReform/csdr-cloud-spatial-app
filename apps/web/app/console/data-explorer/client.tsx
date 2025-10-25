'use client'

import { ChartConfiguration, PlotChartConfiguration } from '@repo/plot/types'
import { Button } from '@repo/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/components/ui/dropdown-menu'
import { useCallback, useMemo, useState } from 'react'
import {
  Responsive as ResponsiveGrid,
  WidthProvider,
  Layout,
  Layouts,
} from 'react-grid-layout'
import { Cog, Hand, Pointer, Trash } from 'lucide-react'
import { ChartRenderer } from '../reports/_components/chart-renderer'
import { ChartFormDialog } from '../reports/_components/chart-form-dialog'

import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

const breakpointCols = {
  lg: 12,
  md: 10,
  sm: 6,
  xs: 4,
  xxs: 2,
} as const

type Breakpoint = keyof typeof breakpointCols
type ResponsiveLayouts = Record<Breakpoint, Layout[]>

const ResponsiveGridLayout = WidthProvider(ResponsiveGrid)

const ROW_HEIGHT = 40
const DEFAULT_HEIGHT = 12
const DEFAULT_WIDTH = 4

const emptyLayouts = (): ResponsiveLayouts =>
  Object.keys(breakpointCols).reduce((acc, key) => {
    acc[key as Breakpoint] = []
    return acc
  }, {} as ResponsiveLayouts)

const cloneLayouts = (layouts: Layouts): ResponsiveLayouts =>
  (Object.keys(breakpointCols) as Breakpoint[]).reduce((acc, key) => {
    const layout = layouts[key] ?? []
    acc[key] = layout.map((item) => ({ ...item }))
    return acc
  }, {} as ResponsiveLayouts)

const addItemToLayouts = (layouts: ResponsiveLayouts, id: string) => {
  const updated = {} as ResponsiveLayouts

  ;(Object.keys(breakpointCols) as Breakpoint[]).forEach((key) => {
    const current = layouts[key] ?? []
    const columnCount = breakpointCols[key]
    const width = Math.min(DEFAULT_WIDTH, columnCount)

    updated[key] = [
      ...current.map((item) => ({ ...item })),
      {
        i: id,
        x: 0,
        y: Infinity,
        w: width,
        h: DEFAULT_HEIGHT,
      },
    ]
  })

  return updated
}

const removeItemFromLayouts = (
  layouts: ResponsiveLayouts,
  id: string,
): ResponsiveLayouts =>
  (Object.keys(breakpointCols) as Breakpoint[]).reduce((acc, key) => {
    acc[key] = (layouts[key] ?? []).filter((item) => item.i !== id)
    return acc
  }, {} as ResponsiveLayouts)

type ChartGridItemProps = {
  id: string
  chart: ChartConfiguration
  layout: Layout
  onRemove: (id: string) => void
  onUpdate: (id: string, chart: ChartConfiguration) => void
}

const ChartGridItem = ({
  id,
  chart,
  layout,
  onRemove,
  onUpdate,
}: ChartGridItemProps) => {
  return (
    <>
      <div
        key={id}
        data-grid={layout}
        className="grid-item-toolbar pointer-events-none absolute left-4 right-4 top-4 z-10 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
      >
        <div className="grid-item-handle flex w-full cursor-grab select-none items-center gap-3 rounded-full bg-background/90 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm ring-1 ring-border/60 backdrop-blur transition active:cursor-grabbing">
          <Hand className="h-4 w-4" />
          <span className="truncate">Drag to reposition...</span>
          <div className="ml-auto flex items-center gap-2 text-muted-foreground grid-item-action">
            <ChartFormDialog
              buttonText="Edit chart"
              chart={chart}
              onSubmit={(nextChart) => onUpdate(id, nextChart)}
            />

            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="text-destructive focus:text-destructive rounded-full"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                event.nativeEvent.stopImmediatePropagation()
                onRemove(id)
              }}
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        <div className="flex-1 overflow-auto p-2 h-full">
          <ChartRenderer chart={chart} />
        </div>
      </div>
    </>
  )
}

const ProductFeature = () => {
  const [layouts, setLayouts] = useState<ResponsiveLayouts>(() =>
    emptyLayouts(),
  )
  const [charts, setCharts] = useState<Record<string, ChartConfiguration>>({})
  const [activeBreakpoint, setActiveBreakpoint] = useState<Breakpoint>('lg')
  const [activeCols, setActiveCols] = useState<number>(breakpointCols.lg)

  const handleAddChart = useCallback((chart: ChartConfiguration) => {
    const id = crypto.randomUUID()

    setCharts((prev) => ({ ...prev, [id]: chart }))
    setLayouts((prev) => addItemToLayouts(prev, id))
  }, [])

  const handleRemoveChart = useCallback((id: string) => {
    setCharts((prev) => {
      const { [id]: _, ...rest } = prev
      return rest
    })
    setLayouts((prev) => removeItemFromLayouts(prev, id))
  }, [])

  const handleUpdateChart = useCallback(
    (id: string, nextChart: ChartConfiguration) => {
      setCharts((prev) => {
        if (!prev[id]) {
          return prev
        }

        return {
          ...prev,
          [id]: nextChart,
        }
      })
    },
    [],
  )

  const orderedCharts = useMemo(() => {
    const activeLayouts = layouts[activeBreakpoint] ?? []
    const layoutMap = new Map<string, Layout>()
    activeLayouts.forEach((layout) => {
      layoutMap.set(layout.i, layout)
    })

    const itemsFromLayout = activeLayouts.reduce<
      { id: string; chart: ChartConfiguration; layout: Layout }[]
    >((acc, item) => {
      const chart = charts[item.i]
      if (!chart) {
        return acc
      }
      acc.push({ id: item.i, chart, layout: item })
      return acc
    }, [])

    if (itemsFromLayout.length === Object.keys(charts).length) {
      return itemsFromLayout
    }

    const missingItems = Object.entries(charts)
      .filter(([id]) => !layoutMap.has(id))
      .map(([id, chart]) => ({
        id,
        chart,
        layout: {
          i: id,
          x: 0,
          y: Infinity,
          w: Math.min(DEFAULT_WIDTH, breakpointCols[activeBreakpoint]),
          h: DEFAULT_HEIGHT,
        } satisfies Layout,
      }))

    return [...itemsFromLayout, ...missingItems]
  }, [activeBreakpoint, charts, layouts])

  const hasCharts = orderedCharts.length > 0

  return (
    <div className="flex flex-col gap-4">
      <ChartFormDialog
        buttonText="Add chart"
        chart={null}
        onSubmit={handleAddChart}
      />

      {hasCharts ? (
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          breakpoints={{
            lg: 1200,
            md: 996,
            sm: 768,
            xs: 480,
            xxs: 0,
          }}
          cols={breakpointCols}
          rowHeight={ROW_HEIGHT}
          margin={[16, 16]}
          containerPadding={[0, 0]}
          onBreakpointChange={(breakpoint, cols) => {
            const typedBreakpoint = Object.prototype.hasOwnProperty.call(
              breakpointCols,
              breakpoint,
            )
              ? (breakpoint as Breakpoint)
              : 'lg'
            setActiveBreakpoint(typedBreakpoint)
            setActiveCols(cols)
          }}
          onLayoutChange={(_, nextLayouts) => {
            setLayouts(cloneLayouts(nextLayouts))
          }}
          draggableCancel=".grid-item-action"
          draggableHandle=".grid-item-handle"
          isBounded
        >
          {orderedCharts.map(({ id, chart, layout }) => (
            <div key={id} data-grid={layout} className="group relative h-full">
              <ChartGridItem
                key={id}
                id={id}
                chart={chart}
                layout={layout}
                onRemove={handleRemoveChart}
                onUpdate={handleUpdateChart}
              />
            </div>
          ))}
        </ResponsiveGridLayout>
      ) : (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-md border border-dashed bg-muted/20 text-center text-sm text-muted-foreground">
          <p className="max-w-md px-6">
            Use &ldquo;Add chart&rdquo; to build a new visualization. It will
            appear here as a draggable, resizable card.
          </p>
        </div>
      )}

      {hasCharts && (
        <p className="text-xs text-muted-foreground">
          Breakpoint <span className="font-medium">{activeBreakpoint}</span> ·{' '}
          <span className="font-medium">{activeCols}</span> columns
        </p>
      )}
    </div>
  )
}

export default ProductFeature
