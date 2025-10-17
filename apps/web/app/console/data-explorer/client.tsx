'use client'

import { ChartConfiguration } from '@repo/plot/types'
import { useState } from 'react'
import { ChartRenderer } from '../reports/_components/chart-renderer'
import { ChartFormDialog } from '../reports/_components/chart-form-dialog'

const ProductFeature = () => {
  const [charts, setCharts] = useState<ChartConfiguration[]>([])

  return (
    <>
      <div className="flex flex-col gap-8">
        {charts.map((chart, index) => (
          <ChartRenderer
            key={index}
            chart={chart}
            config={{ showSelectedPointDetails: true, showCodeSnippet: true }}
          />
        ))}
        <ChartFormDialog
          buttonText="Add chart"
          chart={null}
          onSubmit={(chart) => setCharts([...charts, chart])}
        />
      </div>
    </>
  )
}

export default ProductFeature
