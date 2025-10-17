import * as Plot from '@observablehq/plot'
import { useEffect, useRef } from 'react'

export const DEFAULT_CHART_DATA_PROPS = {
  x: 'timePoint',
  y: 'value',
  data: [
    {
      id: 'sample-1',
      timePoint: '2024-01-01T00:00:00Z',
      value: 24,
      label: 'Jan 1',
    },
    {
      id: 'sample-2',
      timePoint: '2024-01-08T00:00:00Z',
      value: 32,
      label: 'Jan 8',
    },
    {
      id: 'sample-3',
      timePoint: '2024-01-15T00:00:00Z',
      value: 18,
      label: 'Jan 15',
    },
    {
      id: 'sample-4',
      timePoint: '2024-01-22T00:00:00Z',
      value: 41,
      label: 'Jan 22',
    },
  ],
}

export function getLinePlotCodeSnippet<
  T extends { id: string; value: number },
>({ data, x, y }: { data: T[]; x: string; y: string }) {
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

export function LinePlot<T extends { id: string; value: number }>({
  data,
  x,
  y,
  onSelect,
  type,
}: {
  data: T[]
  x: Plot.ChannelValueSpec
  y: Plot.ChannelValueSpec
  onSelect: (dataPoint: T) => void
  type: 'line' | 'bar' | 'grouped-bar' | 'dot'
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const marks: Plot.Markish[] = [
      Plot.dot(data, Plot.pointer({ x, y, fill: 'red', r: 8 })),
      Plot.ruleY([0]),
    ]
    if (type === 'line') {
      marks.push(Plot.line(data, { x, y, fill: 'variableName' }))
    } else if (type === 'bar') {
      marks.push(Plot.barY(data, { x, y, fill: 'variableName' }))
    } else if (type === 'grouped-bar') {
      marks.push(Plot.barY(data, { x, y, fill: 'variableName' }))
    } else if (type === 'dot') {
      marks.push(
        Plot.dot(data, Plot.pointer({ x, y, fill: 'variableName', r: 8 })),
      )
    }

    marks.push(
      Plot.text(
        data,
        Plot.selectLast({
          x,
          y,
          text: 'variableName',
          textAnchor: 'start',
          dx: 3,
        }),
      ),
    )

    const chart = Plot.plot({
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
      marks,
    })
    containerRef.current?.append(chart)

    chart.addEventListener('input', () => {
      onSelect(chart.value)
    })
    return () => chart.remove()
  }, [data])

  return <div ref={containerRef} className="w-full h-full"></div>
}
