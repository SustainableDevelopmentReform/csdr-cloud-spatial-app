'use client'

import { Tabs, TabsContent } from '@repo/ui/components/ui/tabs'
import { Code2Icon, MapIcon, Table2Icon, WorkflowIcon } from 'lucide-react'
import { useCallback, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  DEFAULT_LINEAGE_EMPTY_MESSAGE,
  LineageEmptyState,
} from '~/components/workflow-dag-chart'
import { SimpleWorkflowDagChart } from '~/components/simple-workflow-dag-chart'
import {
  RESOURCE_SECTION_PARAM,
  RESOURCE_SUB_SECTION_PARAM,
  withQueryParams,
} from '~/lib/paths'
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
  hideTabs?: boolean
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

const toResourceTab = (value: string | null | undefined): ResourceTab => {
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

const toExploreSubTab = (
  value: string | null | undefined,
): ExploreSubTab | null => {
  switch (value) {
    case 'map':
      return 'map'
    case 'table':
      return 'table'
    default:
      return null
  }
}

const toLineageSubTab = (
  value: string | null | undefined,
): LineageSubTab | null => {
  switch (value) {
    case 'simple':
      return 'simple'
    case 'technical':
      return 'technical'
    default:
      return null
  }
}

export function ResourcePageTabs({
  defaultTab = 'overview',
  disabled = false,
  hideTabs = false,
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
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [internalTab, setInternalTab] = useState<ResourceTab>(defaultTab)
  const [exploreSubTab, setExploreSubTab] = useState<ExploreSubTab>('map')
  const [lineageSubTab, setLineageSubTab] = useState<LineageSubTab>('simple')
  const sectionParam = searchParams.get(RESOURCE_SECTION_PARAM)
  const subSectionParam = searchParams.get(RESOURCE_SUB_SECTION_PARAM)
  const hasUrlTab = !hideTabs && searchParams.has(RESOURCE_SECTION_PARAM)
  const activeTab = hasUrlTab
    ? toResourceTab(sectionParam)
    : (value ?? internalTab)
  const activeExploreSubTab =
    activeTab === 'explore'
      ? (toExploreSubTab(subSectionParam) ?? exploreSubTab)
      : exploreSubTab
  const activeLineageSubTab =
    activeTab === 'lineage'
      ? (toLineageSubTab(subSectionParam) ?? lineageSubTab)
      : lineageSubTab

  const updateResourceTabParams = useCallback(
    (nextTab: ResourceTab, nextSubTab?: string) => {
      if (hideTabs) {
        return
      }

      const query = searchParams.toString()
      const currentHref = query ? `${pathname}?${query}` : pathname
      const nextHref = withQueryParams(currentHref, {
        [RESOURCE_SECTION_PARAM]: nextTab,
        [RESOURCE_SUB_SECTION_PARAM]: nextSubTab ?? null,
      })

      router.replace(nextHref, { scroll: false })
    },
    [hideTabs, pathname, router, searchParams],
  )

  const handleTabChange = (nextValue: string) => {
    if (disabled) {
      return
    }

    const nextTab = toResourceTab(nextValue)
    setInternalTab(nextTab)
    onValueChange?.(nextTab)

    if (nextTab === 'explore') {
      updateResourceTabParams(nextTab, activeExploreSubTab)
      return
    }

    if (nextTab === 'lineage') {
      updateResourceTabParams(nextTab, activeLineageSubTab)
      return
    }

    updateResourceTabParams(nextTab)
  }

  const handleExploreSubTabChange = (nextSubTab: ExploreSubTab) => {
    setExploreSubTab(nextSubTab)
    updateResourceTabParams('explore', nextSubTab)
  }

  const handleLineageSubTabChange = (nextSubTab: LineageSubTab) => {
    setLineageSubTab(nextSubTab)
    updateResourceTabParams('lineage', nextSubTab)
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="gap-4">
      {!hideTabs ? (
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
      ) : null}

      <TabsContent value="overview">
        <div className="flex max-w-[800px] flex-col gap-6">{overview}</div>
      </TabsContent>

      <TabsContent value="explore">
        <div className="flex flex-col gap-4">
          <ConsoleSecondaryTabs
            items={exploreSubTabItems}
            value={activeExploreSubTab}
            onValueChange={handleExploreSubTabChange}
          />
          {activeExploreSubTab === 'map' && (
            <div>
              {exploreMap ?? (
                <p className="py-8 text-center text-muted-foreground">
                  No map data available.
                </p>
              )}
            </div>
          )}
          {activeExploreSubTab === 'table' && (
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
            value={activeLineageSubTab}
            onValueChange={handleLineageSubTabChange}
          />
          {activeLineageSubTab === 'simple' &&
            (workflowDagSimple ? (
              <SimpleWorkflowDagChart
                emptyMessage={DEFAULT_LINEAGE_EMPTY_MESSAGE}
                workflowDagSimple={workflowDagSimple}
                onMethodClick={() => handleLineageSubTabChange('technical')}
              />
            ) : (
              <LineageEmptyState />
            ))}
          {activeLineageSubTab === 'technical' && (
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
