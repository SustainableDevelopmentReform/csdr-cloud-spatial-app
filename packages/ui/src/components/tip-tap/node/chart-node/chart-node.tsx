import { ChartConfiguration } from '@repo/plot/types'
import type { NodeViewProps } from '@tiptap/react'
import { NodeViewWrapper } from '@tiptap/react'
import * as React from 'react'
import {
  ChartEditorHookParams,
  ChartFormBuilder,
  ChartNodeAttributes,
} from './chart-node-shared'
import './chart-node.scss'

const getChartTitle = (chart: ChartConfiguration | null) => {
  if (!chart) return 'Chart'
  if ('title' in chart && chart.title) {
    return chart.title
  }

  return 'Chart'
}

const getChartDescription = (chart: ChartConfiguration | null) => {
  if (!chart) return ''
  if ('description' in chart && chart.description) {
    return chart.description
  }

  return ''
}

function useNoopChartEditor(_params: ChartEditorHookParams) {
  return { controls: null }
}

export function ChartNodeView(props: NodeViewProps) {
  const { node, updateAttributes, extension } = props
  const attrs = node.attrs as ChartNodeAttributes
  const chart = attrs.chart ?? null

  const builder = extension.options?.formBuilder as ChartFormBuilder | undefined

  const handleChartChange = React.useCallback(
    (nextChart: ChartConfiguration | null) => {
      updateAttributes({
        chart: nextChart,
      })
    },
    [updateAttributes],
  )

  const useChartEditorHook =
    builder?.useChartEditor !== undefined
      ? builder.useChartEditor
      : useNoopChartEditor

  const { controls: editorControls } = useChartEditorHook({
    chart,
    onChartChange: handleChartChange,
  })

  const renderedChart = React.useMemo(() => {
    if (!builder) return null
    return builder.renderChart(chart)
  }, [builder, chart])

  const chartTitle = getChartTitle(chart)
  const chartDescription = getChartDescription(chart)

  return (
    <NodeViewWrapper className="tiptap-chart-node">
      <div className="tiptap-chart-node__header">
        <div className="tiptap-chart-node__header-text">
          <h3 className="tiptap-chart-node__title">{chartTitle}</h3>
          {chartDescription && (
            <div className="tiptap-chart-node__description">
              {chartDescription}
            </div>
          )}
        </div>
        {editorControls && (
          <div className="tiptap-chart-node__actions">{editorControls}</div>
        )}
      </div>
      <div className="tiptap-chart-node__body">
        {renderedChart ?? (
          <div className="tiptap-chart-node__empty">
            Chart builder not available. Configure chart support in the host
            application.
          </div>
        )}
      </div>
    </NodeViewWrapper>
  )
}

ChartNodeView.displayName = 'ChartNodeView'
