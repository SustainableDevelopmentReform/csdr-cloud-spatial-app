'use client'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/ui/card'
import { cn } from '@repo/ui/lib/utils'
import {
  CheckCircle2Icon,
  ChevronDownIcon,
  CodeIcon,
  ExternalLinkIcon,
  TerminalIcon,
} from 'lucide-react'
import { useState } from 'react'

interface WorkflowStep {
  label: string
  order: number
  inputs?: Record<string, string>
  outputs?: Record<string, string>
  source?: {
    file?: string
    line?: number
    github?: string
    function?: string
  }
  command?: string
  completed_at?: string
}

interface WorkflowDagChartProps {
  workflowDag: unknown
  runType: 'dataset' | 'geometries' | 'product'
  isMainRoute?: boolean
}

export function WorkflowDagChart({
  workflowDag,
  runType,
  isMainRoute,
}: WorkflowDagChartProps) {
  if (!workflowDag || !Array.isArray(workflowDag) || workflowDag.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {isMainRoute
            ? `No workflow graph JSON available for the main run for this ${runType}.`
            : `No workflow graph JSON available for this ${runType} run.`}
        </CardContent>
      </Card>
    )
  }

  const steps = [...(workflowDag as WorkflowStep[])].sort(
    (a, b) => a.order - b.order,
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Workflow</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <div className="relative flex flex-col">
          {steps.map((step, index) => (
            <StepNode
              key={step.order}
              step={step}
              isLast={index === steps.length - 1}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function StepNode({ step, isLast }: { step: WorkflowStep; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false)

  const completedDate = step.completed_at
    ? new Date(step.completed_at.replace(/Z$/, ''))
    : null

  return (
    <div className="relative flex gap-3">
      {/* Vertical line + circle */}
      <div className="flex flex-col items-center">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-primary/10 text-xs font-semibold text-primary">
          {step.order}
        </div>
        {!isLast && <div className="w-0.5 grow bg-border" />}
      </div>

      {/* Content */}
      <div className={cn('min-w-0 flex-1 pb-6', isLast && 'pb-0')}>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-start gap-2 text-left"
        >
          <p className="flex-1 text-sm font-medium leading-7">{step.label}</p>
          <ChevronDownIcon
            className={cn(
              'mt-1.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform',
              expanded && 'rotate-180',
            )}
          />
        </button>

        {completedDate && (
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2Icon className="h-3.5 w-3.5 text-green-600" />
            <span>
              {completedDate.toLocaleDateString()}{' '}
              {completedDate.toLocaleTimeString()}
            </span>
          </div>
        )}

        {expanded && (
          <div className="mt-3 space-y-3 rounded-md border bg-muted/30 p-3 text-sm">
            {step.source && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <CodeIcon className="h-3.5 w-3.5" />
                  Source
                </div>
                <div className="space-y-0.5 text-xs">
                  {step.source.function && (
                    <p>
                      <span className="text-muted-foreground">Function:</span>{' '}
                      <code className="rounded bg-muted px-1 py-0.5">
                        {step.source.function}
                      </code>
                    </p>
                  )}
                  {step.source.github && (
                    <p>
                      <a
                        href={step.source.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        View on GitHub
                        <ExternalLinkIcon className="h-3 w-3" />
                      </a>
                    </p>
                  )}
                </div>
              </div>
            )}

            {step.command && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <TerminalIcon className="h-3.5 w-3.5" />
                  Command
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded bg-muted p-2 font-mono text-xs">
                  {step.command}
                </pre>
              </div>
            )}

            {step.inputs && Object.keys(step.inputs).length > 0 && (
              <KeyValueList title="Inputs" data={step.inputs} />
            )}

            {step.outputs && Object.keys(step.outputs).length > 0 && (
              <KeyValueList title="Outputs" data={step.outputs} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function KeyValueList({
  title,
  data,
}: {
  title: string
  data: Record<string, string>
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <div className="space-y-0.5 text-xs">
        {Object.entries(data).map(([key, value]) => (
          <p key={key}>
            <span className="text-muted-foreground">{key}:</span>{' '}
            <code className="rounded bg-muted px-1 py-0.5 break-all">
              {String(value)}
            </code>
          </p>
        ))}
      </div>
    </div>
  )
}
