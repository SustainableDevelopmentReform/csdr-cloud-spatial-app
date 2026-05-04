'use client'

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@repo/ui/components/ui/tabs'
import { useState } from 'react'
import {
  SimpleWorkflowDagChart,
  type WorkflowDagSimple,
} from '~/components/simple-workflow-dag-chart'

export type { WorkflowDagSimple }

export type ResourceTab =
  | 'overview'
  | 'explore'
  | 'lineage'
  | 'versions'
  | 'usage'
  | 'actions'
export type ExploreSubTab = 'map' | 'table'
export type LineageSubTab = 'simple' | 'technical'

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
              <SimpleWorkflowDagChart workflowDagSimple={workflowDagSimple} />
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
