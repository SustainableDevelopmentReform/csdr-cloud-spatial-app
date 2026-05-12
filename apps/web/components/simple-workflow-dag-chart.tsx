'use client'

import { z } from 'zod'
import { DEFAULT_LINEAGE_EMPTY_MESSAGE } from './workflow-dag-chart'

const workflowDagSimpleSchema = z.object({
  description: z.string(),
  inputs: z.array(z.string()),
  methods: z.array(z.string()),
  outputs: z.array(z.string()),
  indicators: z.array(z.string()).optional(),
})

export type WorkflowDagSimple = z.infer<typeof workflowDagSimpleSchema>

export function SimpleWorkflowDagChart({
  emptyMessage = DEFAULT_LINEAGE_EMPTY_MESSAGE,
  workflowDagSimple,
  onMethodClick,
}: {
  emptyMessage?: string
  workflowDagSimple: unknown
  onMethodClick?: () => void
}) {
  const parsedWorkflowDagSimple =
    workflowDagSimpleSchema.safeParse(workflowDagSimple)

  if (!parsedWorkflowDagSimple.success) {
    return (
      <p className="py-8 text-center text-muted-foreground">{emptyMessage}</p>
    )
  }

  const workflow = parsedWorkflowDagSimple.data

  return (
    <div className="flex flex-col gap-6">
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <p>{workflow.description}</p>
      </div>
      <div className="rounded-xl p-6" style={{ background: '#D7D7D7' }}>
        <div className="grid grid-cols-[auto_1fr] gap-x-4">
          {/* INPUTS */}
          <div className="flex items-center justify-end text-xs font-semibold uppercase tracking-wider">
            Inputs
          </div>
          <div className="flex flex-wrap items-start justify-center gap-4">
            {workflow.inputs.map((input, i) => (
              <div
                key={i}
                className="max-w-[250px] rounded-lg border bg-background px-6 py-3 text-center text-sm font-medium shadow-sm"
              >
                {input}
              </div>
            ))}
          </div>
          {/* connector */}
          <div />
          <div className="flex justify-center">
            {workflow.inputs.length > 1 ? (
              <svg width="300" height="40">
                {workflow.inputs.map((_, i) => {
                  const count = workflow.inputs.length
                  const x1 = ((i + 0.5) / count) * 300
                  return (
                    <line
                      key={i}
                      x1={x1}
                      y1="0"
                      x2="150"
                      y2="40"
                      stroke="#737373"
                      strokeWidth="1"
                    />
                  )
                })}
              </svg>
            ) : (
              <div className="h-8 w-px" style={{ background: '#737373' }} />
            )}
          </div>
          {/* METHODS */}
          <div className="flex items-center justify-end text-xs font-semibold uppercase tracking-wider">
            Methods
          </div>
          <div className="flex flex-wrap items-start justify-center gap-4">
            {workflow.methods.map((method, i) => (
              <div
                key={i}
                onClick={onMethodClick}
                title={
                  onMethodClick
                    ? 'Go to the technical summary of the workflow'
                    : undefined
                }
                className={`rounded-lg border bg-background px-6 py-3 text-sm font-medium shadow-sm ${onMethodClick ? 'cursor-pointer transition-colors hover:border-primary hover:text-primary' : ''}`}
              >
                {method}
                {onMethodClick && (
                  <span className="ml-2 text-xs text-muted-foreground">→</span>
                )}
              </div>
            ))}
          </div>
          {/* connector to outputs */}
          <div />
          <div className="flex justify-center">
            {workflow.outputs.length > 1 ? (
              <svg width="300" height="40">
                {workflow.outputs.map((_, i) => {
                  const count = workflow.outputs.length
                  const x2 = ((i + 0.5) / count) * 300
                  return (
                    <line
                      key={i}
                      x1="150"
                      y1="0"
                      x2={x2}
                      y2="40"
                      stroke="#737373"
                      strokeWidth="1"
                    />
                  )
                })}
              </svg>
            ) : (
              <div className="h-8 w-px" style={{ background: '#737373' }} />
            )}
          </div>
          {/* OUTPUTS */}
          <div className="flex items-center justify-end text-xs font-semibold uppercase tracking-wider">
            Outputs
          </div>
          <div className="flex flex-wrap items-start justify-center gap-4">
            {workflow.outputs.map((output, i) => (
              <div
                key={i}
                className="rounded-lg border bg-background px-6 py-3 text-sm font-medium shadow-sm"
              >
                {output}
              </div>
            ))}
          </div>
          {/* INDICATORS (if present) */}
          {workflow.indicators && workflow.indicators.length > 0 && (
            <>
              <div />
              <div className="flex justify-center">
                <div className="h-8 w-px" style={{ background: '#737373' }} />
              </div>
              <div className="flex items-center justify-end text-xs font-semibold uppercase tracking-wider">
                Indicators
              </div>
              <div className="flex flex-wrap items-start justify-center gap-4">
                {workflow.indicators.map((indicator, i) => (
                  <div
                    key={i}
                    className="rounded-lg border bg-background px-6 py-3 text-sm font-medium shadow-sm"
                  >
                    {indicator}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
