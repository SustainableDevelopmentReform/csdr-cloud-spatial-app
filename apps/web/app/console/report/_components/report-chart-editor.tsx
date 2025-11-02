'use client'

import { ChartConfiguration, OnSelectCallback } from '@repo/plot/types'
import type { ChartFormBuilder } from '@repo/ui/components/tip-tap/node/chart-node/chart-node-shared'
import { ChartFormDialog } from './chart-form-dialog'
import { ChartRenderer } from './chart-renderer'
import { ProductOutputExportListItem } from '../../product/_hooks'

const renderChart = (
  chart: ChartConfiguration | null,
  onSelect: OnSelectCallback<ProductOutputExportListItem>,
) => {
  return (
    <div>
      <ChartRenderer
        chart={chart}
        className={chart?.type === 'map' ? 'h-96 relative' : undefined}
        onSelect={onSelect}
      />
    </div>
  )
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

export const reportChartFormBuilder: (
  onSelect: OnSelectCallback<ProductOutputExportListItem>,
) => ChartFormBuilder = (onSelect) => ({
  renderChart: (chartConfiguration) =>
    renderChart(chartConfiguration, onSelect),
  useChartEditor: ({ chart, onChartChange }) =>
    useReportChartEditor({ chart, onChartChange }),
})
