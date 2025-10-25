'use client'

import { ChartConfiguration } from '@repo/plot/types'
import { Button } from '@repo/ui/components/ui/button'
import { useCallback, useMemo, useState } from 'react'
import {
  Responsive as ResponsiveGrid,
  WidthProvider,
  Layout,
  Layouts,
} from 'react-grid-layout'
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
          draggableHandle=".grid-item-header"
          isBounded
        >
          {orderedCharts.map(({ id, chart, layout }) => (
            <div
              key={id}
              data-grid={layout}
              className="flex h-full flex-col overflow-hidden"
            >
              <div className="grid-item-header flex items-center justify-between border-b bg-muted/40 px-3 py-2 text-sm font-medium">
                <span>Chart</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="-my-1 text-xs"
                  onClick={() => handleRemoveChart(id)}
                >
                  Remove
                </Button>
              </div>
              <div className="flex-1 overflow-auto p-2">
                <ChartRenderer chart={chart} />
              </div>
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
