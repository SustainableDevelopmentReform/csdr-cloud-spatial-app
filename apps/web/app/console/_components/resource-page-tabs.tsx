'use client'

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@repo/ui/components/ui/tabs'
import { useState } from 'react'

export type ResourceTab =
  | 'overview'
  | 'explore'
  | 'lineage'
  | 'versions'
  | 'usage'
  | 'actions'
export type ExploreSubTab = 'map' | 'table'
export type LineageSubTab = 'simple' | 'technical'

export interface WorkflowDagSimple {
  description: string
  inputs: string[]
  methods: string[]
  outputs: string[]
  indicators?: string[]
}

interface ResourcePageTabsProps {
  defaultTab?: ResourceTab
  overview: React.ReactNode
  exploreMap?: React.ReactNode
  exploreTable?: React.ReactNode
  lineage?: React.ReactNode
  workflowDagSimple?: WorkflowDagSimple
  versions?: React.ReactNode
  usage?: React.ReactNode
  actions?: React.ReactNode
}

export function ResourcePageTabs({
  defaultTab = 'overview',
  overview,
  exploreMap,
  exploreTable,
  lineage,
  workflowDagSimple,
  versions,
  usage,
  actions,
}: ResourcePageTabsProps) {
  const [exploreSubTab, setExploreSubTab] = useState<ExploreSubTab>('map')
  const [lineageSubTab, setLineageSubTab] = useState<LineageSubTab>('simple')

  return (
    <Tabs defaultValue={defaultTab} className="gap-4">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="explore">Explore</TabsTrigger>
        <TabsTrigger value="lineage">Lineage</TabsTrigger>
        <TabsTrigger value="versions">Versions</TabsTrigger>
        <TabsTrigger value="usage">Usage</TabsTrigger>
        {actions && <TabsTrigger value="actions">Actions</TabsTrigger>}
      </TabsList>

      <TabsContent value="overview">
        <div className="flex flex-col gap-6">{overview}</div>
      </TabsContent>

      <TabsContent value="explore">
        <div className="flex flex-col gap-4">
          <div className="inline-flex h-9 w-fit items-center justify-center rounded-lg border p-[3px]">
            <button
              type="button"
              onClick={() => setExploreSubTab('map')}
              className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                exploreSubTab === 'map'
                  ? 'bg-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Map
            </button>
            <button
              type="button"
              onClick={() => setExploreSubTab('table')}
              className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                exploreSubTab === 'table'
                  ? 'bg-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Table
            </button>
          </div>
          {exploreSubTab === 'map' && (
            <div>
              {exploreMap ?? (
                <p className="py-8 text-center text-muted-foreground">
                  No map data available.
                </p>
              )}
            </div>
          )}
          {exploreSubTab === 'table' && (
            <div>
              {exploreTable ?? (
                <p className="py-8 text-center text-muted-foreground">
                  No table data available.
                </p>
              )}
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="lineage">
        <div className="flex flex-col gap-4">
          <div className="inline-flex h-9 w-fit items-center justify-center rounded-lg border p-[3px]">
            <button
              type="button"
              onClick={() => setLineageSubTab('simple')}
              className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                lineageSubTab === 'simple'
                  ? 'bg-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Simple
            </button>
            <button
              type="button"
              onClick={() => setLineageSubTab('technical')}
              className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                lineageSubTab === 'technical'
                  ? 'bg-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Technical
            </button>
          </div>
          {lineageSubTab === 'simple' &&
            (workflowDagSimple ? (
              <div className="flex flex-col gap-6">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p>{workflowDagSimple.description}</p>
                </div>
                <div
                  className="rounded-xl p-6"
                  style={{ background: '#D7D7D7' }}
                >
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
                        <div
                          className="h-8 w-px"
                          style={{ background: '#737373' }}
                        />
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
                          className="rounded-lg border bg-background px-6 py-3 text-sm font-medium shadow-sm"
                        >
                          {method}
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
                        <div
                          className="h-8 w-px"
                          style={{ background: '#737373' }}
                        />
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
                            <div
                              className="h-8 w-px"
                              style={{ background: '#737373' }}
                            />
                          </div>
                          <div className="flex items-center justify-end text-xs font-semibold uppercase tracking-wider">
                            Indicators
                          </div>
                          <div className="flex flex-wrap items-start justify-center gap-4">
                            {workflowDagSimple.indicators.map(
                              (indicator, i) => (
                                <div
                                  key={i}
                                  className="rounded-lg border bg-background px-6 py-3 text-sm font-medium shadow-sm"
                                >
                                  {indicator}
                                </div>
                              ),
                            )}
                          </div>
                        </>
                      )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="py-8 text-center text-muted-foreground">
                No simple lineage information available.
              </p>
            ))}
          {lineageSubTab === 'technical' && (
            <div>
              {lineage ?? (
                <p className="py-8 text-center text-muted-foreground">
                  No lineage information available.
                </p>
              )}
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="versions">
        <div className="flex flex-col gap-6">
          {versions ?? (
            <p className="py-8 text-center text-muted-foreground">
              No version information available.
            </p>
          )}
        </div>
      </TabsContent>

      <TabsContent value="usage">
        <div className="flex flex-col gap-6">
          {usage ?? (
            <p className="py-8 text-center text-muted-foreground">
              No usage information available.
            </p>
          )}
        </div>
      </TabsContent>

      {actions && (
        <TabsContent value="actions">
          <div className="flex flex-col gap-6">{actions}</div>
        </TabsContent>
      )}
    </Tabs>
  )
}
