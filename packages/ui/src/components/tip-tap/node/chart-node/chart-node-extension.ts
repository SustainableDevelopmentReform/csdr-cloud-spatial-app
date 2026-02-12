import type { NodeType } from '@tiptap/pm/model'
import { mergeAttributes, Node, ReactNodeViewRenderer } from '@tiptap/react'

import { ChartNodeView } from './chart-node'
import { ChartFormBuilder, ChartNodeAttributes } from './chart-node-shared'

export type ChartNodeOptions = {
  /**
   * Node type name used when serialising content.
   * @default 'chart'
   */
  type?: string | NodeType
  /**
   * Generates default attributes used when inserting a new chart node.
   */
  getDefaultAttributes: () => ChartNodeAttributes
  /**
   * HTML attributes applied to the rendered element.
   */
  HTMLAttributes: Record<string, unknown>
  /**
   * Builder responsible for rendering charts and edit controls.
   */
  formBuilder?: ChartFormBuilder
}

declare module '@tiptap/react' {
  // eslint-disable-next-line no-unused-vars
  interface Commands<ReturnType> {
    chartNode: {
      /**
       * Inserts a new chart node at the current selection.
       */
      // eslint-disable-next-line no-unused-vars
      setChartNode: (_attrs?: Partial<ChartNodeAttributes>) => ReturnType
    }
  }
}

export const ChartNode = Node.create<ChartNodeOptions>({
  name: 'chart',

  group: 'block',

  atom: true,

  draggable: true,

  selectable: true,

  isolating: true,

  defining: true,

  addOptions() {
    return {
      type: 'chart',
      getDefaultAttributes: () => ({
        chart: null,
        height: null,
      }),
      HTMLAttributes: {},
      formBuilder: undefined,
    }
  },

  addAttributes() {
    return {
      chart: {
        default: this.options.getDefaultAttributes().chart,
      },
      height: {
        default: this.options.getDefaultAttributes().height ?? null,
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="chart"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    const rest = Object.fromEntries(
      Object.entries(HTMLAttributes).filter(([key]) => key !== 'chart'),
    )
    return [
      'div',
      mergeAttributes({ 'data-type': 'chart' }, rest),
      ['div', { 'data-node-placeholder': 'chart' }],
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ChartNodeView)
  },

  addCommands() {
    return {
      setChartNode:
        (partialAttrs: Partial<ChartNodeAttributes> = {}) =>
        ({ chain }) => {
          const defaultAttrs = this.options.getDefaultAttributes()
          const hasChart = Object.prototype.hasOwnProperty.call(
            partialAttrs,
            'chart',
          )
          const dataSource =
            hasChart && partialAttrs.chart !== undefined
              ? partialAttrs.chart
              : defaultAttrs.chart

          const mergedAttrs: ChartNodeAttributes = {
            chart: dataSource,
            height: partialAttrs.height ?? defaultAttrs.height ?? null,
          }

          return chain()
            .focus()
            .insertContent({
              type: this.name,
              attrs: mergedAttrs,
            })
            .run()
        },
    }
  },
})

export default ChartNode
