'use client'

export interface WorkflowDagSimple {
  description: string
  inputs: string[]
  methods: string[]
  outputs: string[]
  indicators?: string[]
}

export function SimpleWorkflowDagChart({
  workflowDagSimple,
  onMethodClick,
}: {
  workflowDagSimple: WorkflowDagSimple
  onMethodClick?: () => void
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <p>{workflowDagSimple.description}</p>
      </div>
      <div className="rounded-xl p-6" style={{ background: '#D7D7D7' }}>
        <div className="grid grid-cols-[auto_1fr] gap-x-4">
          {/* INPUTS */}
          <div className="flex items-center justify-end text-xs font-semibold uppercase tracking-wider">
            Inputs
          </div>
          <div className="flex flex-wrap items-start justify-center gap-4">
            {workflowDagSimple.inputs.map((input, i) => (
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
            {workflowDagSimple.inputs.length > 1 ? (
              <svg width="300" height="40">
                {workflowDagSimple.inputs.map((_, i) => {
                  const count = workflowDagSimple.inputs.length
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
            {workflowDagSimple.methods.map((method, i) => (
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
            {workflowDagSimple.outputs.length > 1 ? (
              <svg width="300" height="40">
                {workflowDagSimple.outputs.map((_, i) => {
                  const count = workflowDagSimple.outputs.length
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
            {workflowDagSimple.outputs.map((output, i) => (
              <div
                key={i}
                className="rounded-lg border bg-background px-6 py-3 text-sm font-medium shadow-sm"
              >
                {output}
              </div>
            ))}
          </div>
          {/* INDICATORS (if present) */}
          {workflowDagSimple.indicators &&
            workflowDagSimple.indicators.length > 0 && (
              <>
                <div />
                <div className="flex justify-center">
                  <div className="h-8 w-px" style={{ background: '#737373' }} />
                </div>
                <div className="flex items-center justify-end text-xs font-semibold uppercase tracking-wider">
                  Indicators
                </div>
                <div className="flex flex-wrap items-start justify-center gap-4">
                  {workflowDagSimple.indicators.map((indicator, i) => (
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
