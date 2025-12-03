import * as ObservablePlot from '@observablehq/plot'
import { useEffect, useRef } from 'react'
import { OnSelectCallback } from './types'

interface BasePlotRecord {
  id: string
  value: number
}

interface PlotProps<T extends BasePlotRecord> {
  data: T[]
  x: string
  y: string
  xLabel?: string
  yLabel?: string
  groupBy: string
  onSelect?: OnSelectCallback<T>
  type: 'line' | 'stacked-bar' | 'grouped-bar' | 'dot'
}

export const DEFAULT_CHART_DATA_PROPS: PlotProps<{
  id: string
  value: number
  timePoint: string
}> = {
  x: 'timePoint',
  y: 'value',
  groupBy: 'variableName',
  type: 'line',
  data: [
    {
      id: 'sample-1',

      timePoint: '2024-01-01T00:00:00Z',
      value: 24,
    },
    {
      id: 'sample-2',
      timePoint: '2024-01-08T00:00:00Z',
      value: 32,
    },
    {
      id: 'sample-3',
      timePoint: '2024-01-15T00:00:00Z',
      value: 18,
    },
    {
      id: 'sample-4',
      timePoint: '2024-01-22T00:00:00Z',
      value: 41,
    },
  ],
}

export function getPlotCodeSnippet<T extends { id: string; value: number }>({
  data,
  x,
  y,
}: {
  data: T[]
  x: string
  y: string
}) {
  const params = {
    x,
    y,
    data,
  }

  return [
    `csdr = (${JSON.stringify(params)})`,
    `Plot.plot({
  margin: 50,
  style: {
    background: 'transparent',
  },
  y: {
    grid: true,
  },
  color: {
    type: 'diverging',
    scheme: 'burd',
  },
  marks: [
    Plot.dot(csdr.data, Plot.pointer({ x: csdr.x, y: csdr.y, fill: 'red', r: 8 })),
    Plot.ruleY([0]),
    Plot.line(csdr.data, { x: csdr.x, y: csdr.y }),
  ],
})`,
  ]
}

export function Plot<T extends BasePlotRecord>({
  data,
  x,
  y,
  xLabel,
  yLabel,
  groupBy,
  onSelect,
  type,
}: PlotProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const marks: ObservablePlot.Markish[] = [ObservablePlot.ruleY([0])]
    if (type === 'line') {
      marks.push(
        ObservablePlot.line(data, { x, y, stroke: groupBy, strokeWidth: 2 }),
      )
    } else if (type === 'stacked-bar') {
      marks.push(ObservablePlot.barY(data, { x, y, fill: groupBy }))
    } else if (type === 'grouped-bar') {
      marks.push(
        ObservablePlot.barY(data, { x, y, fill: groupBy, fx: groupBy }),
      )
    } else if (type === 'dot') {
      marks.push(ObservablePlot.dot(data, { x, y, fill: groupBy, r: 6 }))
    }

    if (type === 'line' || type === 'dot') {
      marks.push(
        ObservablePlot.dot(
          data,
          ObservablePlot.pointer({ x, y, fill: groupBy, r: 6 }),
        ),
      )
    } else if (type === 'stacked-bar') {
      marks.push(
        ObservablePlot.barY(
          data,
          ObservablePlot.pointer({
            x,
            y,
            fill: 'grey',
            stack: groupBy,
            maxRadius: 100,
          }),
        ),
      )
    } else if (type === 'grouped-bar') {
      marks.push(
        ObservablePlot.barY(
          data,
          ObservablePlot.pointer({
            x,
            y,
            fill: 'grey',
            fx: groupBy,
            maxRadius: 100,
          }),
        ),
      )
    }

    // marks.push(
    //   Plot.text(
    //     data,
    //     Plot.selectLast({
    //       x,
    //       y,
    //       text: groupBy,
    //       textAnchor: 'start',
    //       dx: 3,
    //     }),
    //   ),
    // )

    const chart = ObservablePlot.plot({
      margin: 50,
      style: {
        background: 'transparent',
        fontSize: '16px',
      },
      y: {
        grid: true,
        label: yLabel,
      },
      x: {
        label: xLabel,
      },
      color: { legend: true },
      marks,
    })
    containerRef.current?.append(chart)

    // This is a built-in Plot event listener that updates when Plot.pointer is interacted with (which includes hover)
    // chart.addEventListener('input', (evt) => {
    // })

    chart.addEventListener('click', (event) => {
      if (event instanceof MouseEvent) {
        event.stopPropagation()
        event.preventDefault()
        if (chart.value) {
          onSelect?.({ dataPoint: chart.value, event })
        } else {
          onSelect?.({ dataPoint: null, event })
        }
      }
    })

    return () => chart.remove()
  }, [data, groupBy, onSelect, type, x, xLabel, y, yLabel])

  return <div ref={containerRef} className="w-full h-full"></div>
}
