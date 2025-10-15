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
}: {
  data: T[]
  x: Plot.ChannelValueSpec
  y: Plot.ChannelValueSpec
  onSelect: (dataPoint: T) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
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
      marks: [
        Plot.dot(data, Plot.pointer({ x, y, fill: 'red', r: 8 })),
        Plot.ruleY([0]),
        Plot.line(data, { x, y }),
      ],
    })
    containerRef.current?.append(chart)

    chart.addEventListener('input', () => {
      onSelect(chart.value)
    })
    return () => chart.remove()
  }, [data])

  return <div ref={containerRef} className="w-full h-full"></div>
}
