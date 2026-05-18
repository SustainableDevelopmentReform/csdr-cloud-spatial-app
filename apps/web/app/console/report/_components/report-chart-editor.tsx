'use client'

import type { ChartConfiguration, OnSelectCallback } from '@repo/plot/types'
import type { ChartFormBuilder } from '@repo/ui/components/tip-tap/node/chart-node/chart-node-shared'
import { ChartFormDialog } from './chart-form-dialog'
import { ChartRenderer } from './chart-renderer'
import type { ProductOutputExportListItem } from '../../product/_hooks'

type ReportChartFormBuilderOptions = {
  onChartDialogClose?: () => void
  onChartDialogOpen?: () => void
  readOnly?: boolean
}

const renderChart = (
  chart: ChartConfiguration | null,
  onSelect: OnSelectCallback<ProductOutputExportListItem>,
  readOnly: boolean,
) => {
  return (
    <div>
      <ChartRenderer
        chart={chart}
        className={chart?.type === 'map' ? 'h-96 relative' : undefined}
        config={{ readOnly }}
        onSelect={onSelect}
      />
    </div>
  )
}

const useReportChartEditor = ({
  chart,
  onChartDialogClose,
  onChartDialogOpen,
  onChartChange,
}: {
  chart: ChartConfiguration | null
  onChartDialogClose?: () => void
  onChartDialogOpen?: () => void
  onChartChange: (chart: ChartConfiguration | null) => void
}) => {
  const controls = (
    <ChartFormDialog
      buttonText="Edit chart"
      chart={chart}
      onClose={onChartDialogClose}
      onOpen={onChartDialogOpen}
      onSubmit={onChartChange}
    />
  )

  return { controls }
}

export const reportChartFormBuilder: (
  onSelect: OnSelectCallback<ProductOutputExportListItem>,
  options?: ReportChartFormBuilderOptions,
) => ChartFormBuilder = (onSelect, options) => ({
  renderChart: (chartConfiguration) =>
    renderChart(chartConfiguration, onSelect, options?.readOnly === true),
  useChartEditor: ({ chart, onChartChange }) =>
    useReportChartEditor({
      chart,
      onChartChange,
      onChartDialogClose: options?.onChartDialogClose,
      onChartDialogOpen: options?.onChartDialogOpen,
    }),
})
