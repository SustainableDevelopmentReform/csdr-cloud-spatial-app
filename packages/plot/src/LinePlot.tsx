import * as Plot from '@observablehq/plot'
import { useEffect, useRef } from 'react'

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
