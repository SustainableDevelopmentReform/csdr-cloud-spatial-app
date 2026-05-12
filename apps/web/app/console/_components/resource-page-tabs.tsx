'use client'

import { Tabs, TabsContent } from '@repo/ui/components/ui/tabs'
import { Code2Icon, MapIcon, Table2Icon, WorkflowIcon } from 'lucide-react'
import { useState } from 'react'
import {
  DEFAULT_LINEAGE_EMPTY_MESSAGE,
  LineageEmptyState,
} from '~/components/workflow-dag-chart'
import { SimpleWorkflowDagChart } from '~/components/simple-workflow-dag-chart'
import {
  ConsolePrimaryTabsList,
  ConsolePrimaryTabsTrigger,
  ConsoleSecondaryTabs,
} from './console-tabs'

export type ResourceTab =
  | 'overview'
  | 'explore'
  | 'lineage'
  | 'versions'
  | 'usage'
export type ExploreSubTab = 'map' | 'table'
export type LineageSubTab = 'simple' | 'technical'

const exploreSubTabItems = [
  { icon: MapIcon, label: 'Map', value: 'map' },
  { icon: Table2Icon, label: 'Table', value: 'table' },
] as const

const lineageSubTabItems = [
  { icon: WorkflowIcon, label: 'Simple', value: 'simple' },
  { icon: Code2Icon, label: 'Technical', value: 'technical' },
] as const

interface ResourcePageTabsProps {
  defaultTab?: ResourceTab
  disabled?: boolean
  value?: ResourceTab
  onValueChange?: (value: ResourceTab) => void
  overview: React.ReactNode
  exploreMap?: React.ReactNode
  exploreTable?: React.ReactNode
  lineage?: React.ReactNode
  workflowDagSimple?: unknown
  versions?: React.ReactNode
  usage?: React.ReactNode
}

const toResourceTab = (value: string): ResourceTab => {
  switch (value) {
    case 'explore':
      return 'explore'
    case 'lineage':
      return 'lineage'
    case 'versions':
      return 'versions'
    case 'usage':
      return 'usage'
    default:
      return 'overview'
  }
}

export function ResourcePageTabs({
  defaultTab = 'overview',
  disabled = false,
  value,
  onValueChange,
  overview,
  exploreMap,
  exploreTable,
  lineage,
  workflowDagSimple,
  versions,
  usage,
}: ResourcePageTabsProps) {
  const [internalTab, setInternalTab] = useState<ResourceTab>(defaultTab)
  const [exploreSubTab, setExploreSubTab] = useState<ExploreSubTab>('map')
  const [lineageSubTab, setLineageSubTab] = useState<LineageSubTab>('simple')
  const activeTab = value ?? internalTab

  const handleTabChange = (nextValue: string) => {
    if (disabled) {
      return
    }

    const nextTab = toResourceTab(nextValue)
    setInternalTab(nextTab)
    onValueChange?.(nextTab)
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="gap-4">
      <ConsolePrimaryTabsList>
        <ConsolePrimaryTabsTrigger disabled={disabled} value="overview">
          Overview
        </ConsolePrimaryTabsTrigger>
        <ConsolePrimaryTabsTrigger disabled={disabled} value="explore">
          Explore
        </ConsolePrimaryTabsTrigger>
        <ConsolePrimaryTabsTrigger disabled={disabled} value="lineage">
          Lineage
        </ConsolePrimaryTabsTrigger>
        <ConsolePrimaryTabsTrigger disabled={disabled} value="versions">
          Versions
        </ConsolePrimaryTabsTrigger>
        <ConsolePrimaryTabsTrigger disabled={disabled} value="usage">
          Usage
        </ConsolePrimaryTabsTrigger>
      </ConsolePrimaryTabsList>

      <TabsContent value="overview">
        <div className="flex max-w-[800px] flex-col gap-6">{overview}</div>
      </TabsContent>

      <TabsContent value="explore">
        <div className="flex flex-col gap-4">
          <ConsoleSecondaryTabs
            items={exploreSubTabItems}
            value={exploreSubTab}
            onValueChange={setExploreSubTab}
          />
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
            <div className="overflow-hidden rounded-[10px] bg-white p-6 text-card-foreground">
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
          <ConsoleSecondaryTabs
            items={lineageSubTabItems}
            value={lineageSubTab}
            onValueChange={setLineageSubTab}
          />
          {lineageSubTab === 'simple' &&
            (workflowDagSimple ? (
              <SimpleWorkflowDagChart
                emptyMessage={DEFAULT_LINEAGE_EMPTY_MESSAGE}
                workflowDagSimple={workflowDagSimple}
                onMethodClick={() => setLineageSubTab('technical')}
              />
            ) : (
              <LineageEmptyState />
            ))}
          {lineageSubTab === 'technical' && (
            <div>{lineage ?? <LineageEmptyState />}</div>
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
    </Tabs>
  )
}
