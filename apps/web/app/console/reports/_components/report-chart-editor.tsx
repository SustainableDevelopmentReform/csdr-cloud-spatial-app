'use client'

import { ChartConfiguration } from '@repo/plot/types'
import type { ChartFormBuilder } from '@repo/ui/components/tip-tap/node/chart-node/chart-node-shared'
import { ChartFormDialog } from './chart-form-dialog'
import { ChartRenderer } from './chart-renderer'

const renderChart = (chart: ChartConfiguration | null) => {
  return <ChartRenderer chart={chart} />
}

const useReportChartEditor = ({
  chart,
  onChartChange,
}: {
  chart: ChartConfiguration | null
  onChartChange: (chart: ChartConfiguration | null) => void
}) => {
  const controls = (
    <ChartFormDialog
      buttonText="Edit chart"
      chart={chart}
      onSubmit={onChartChange}
    />
  )

  return { controls }
}

export const reportChartFormBuilder: ChartFormBuilder = {
  renderChart,
  useChartEditor: ({ chart, onChartChange }) =>
    useReportChartEditor({ chart, onChartChange }),
}
