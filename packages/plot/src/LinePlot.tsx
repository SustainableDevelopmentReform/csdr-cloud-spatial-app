import * as Plot from '@observablehq/plot'
import { useEffect, useRef } from 'react'

export function LinePlot({ data }: { data: Plot.Data }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const chart = Plot.plot({
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
        Plot.ruleY([0]),
        Plot.dot(data, { x: 'Date', y: 'Anomaly', stroke: 'Anomaly' }),
      ],
    })
    containerRef.current?.append(chart)
    return () => chart.remove()
  }, [data])

  return <div ref={containerRef} className="w-full h-full"></div>
}
