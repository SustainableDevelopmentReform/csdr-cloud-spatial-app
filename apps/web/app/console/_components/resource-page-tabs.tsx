'use client'

import { Tabs, TabsContent } from '@repo/ui/components/ui/tabs'
import {
  Code2Icon,
  GitBranchIcon,
  MapIcon,
  Table2Icon,
  WorkflowIcon,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useCallback, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { EmptyPlaceholder } from '~/components/empty-placeholder'
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
export type LineageSubTab = 'simple' | 'technical' | 'dependencies'

type LineageSubTabItem = {
  icon: LucideIcon
  label: string
  value: LineageSubTab
}

const exploreSubTabItems = [
  { icon: MapIcon, label: 'Map', value: 'map' },
  { icon: Table2Icon, label: 'Table', value: 'table' },
] as const

const baseLineageSubTabItems: readonly LineageSubTabItem[] = [
  { icon: WorkflowIcon, label: 'Simple', value: 'simple' },
  { icon: Code2Icon, label: 'Technical', value: 'technical' },
]

const lineageDependenciesSubTabItem: LineageSubTabItem = {
  icon: GitBranchIcon,
  label: 'Dependencies',
  value: 'dependencies',
}

interface ResourcePageTabsProps {
  defaultTab?: ResourceTab
  defaultLineageSubTab?: LineageSubTab
  disabled?: boolean
  enabledTabs?: readonly ResourceTab[]
  hideTabs?: boolean
  value?: ResourceTab
  onValueChange?: (value: ResourceTab) => void
  overview: React.ReactNode
  exploreMap?: React.ReactNode
  exploreTable?: React.ReactNode
  lineage?: React.ReactNode
  lineageDependencies?: React.ReactNode
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
    case 'dependencies':
      return 'dependencies'
    default:
      return null
  }
}

export function ResourcePageTabs({
  defaultLineageSubTab = 'simple',
  defaultTab = 'overview',
  disabled = false,
  enabledTabs,
  hideTabs = false,
  value,
  onValueChange,
  overview,
  exploreMap,
  exploreTable,
  lineage,
  lineageDependencies,
  workflowDagSimple,
  versions,
  usage,
}: ResourcePageTabsProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [internalTab, setInternalTab] = useState<ResourceTab>(defaultTab)
  const [exploreSubTab, setExploreSubTab] = useState<ExploreSubTab>('map')
  const [lineageSubTab, setLineageSubTab] =
    useState<LineageSubTab>(defaultLineageSubTab)
  const sectionParam = searchParams.get(RESOURCE_SECTION_PARAM)
  const subSectionParam = searchParams.get(RESOURCE_SUB_SECTION_PARAM)
  const isTabEnabled = useCallback(
    (tab: ResourceTab) => !enabledTabs || enabledTabs.includes(tab),
    [enabledTabs],
  )
  const resolveEnabledTab = useCallback(
    (tab: ResourceTab) => {
      if (isTabEnabled(tab)) return tab
      return enabledTabs?.[0] ?? 'overview'
    },
    [enabledTabs, isTabEnabled],
  )
  const hasUrlTab = !hideTabs && searchParams.has(RESOURCE_SECTION_PARAM)
  const activeTab = resolveEnabledTab(
    hasUrlTab ? toResourceTab(sectionParam) : (value ?? internalTab),
  )
  const activeExploreSubTab =
    activeTab === 'explore'
      ? (toExploreSubTab(subSectionParam) ?? exploreSubTab)
      : exploreSubTab
  const fallbackLineageSubTab =
    defaultLineageSubTab === 'dependencies' && !lineageDependencies
      ? 'simple'
      : defaultLineageSubTab
  const requestedLineageSubTab =
    activeTab === 'lineage'
      ? (toLineageSubTab(subSectionParam) ?? lineageSubTab)
      : lineageSubTab
  const activeLineageSubTab =
    requestedLineageSubTab === 'dependencies' && !lineageDependencies
      ? 'simple'
      : requestedLineageSubTab
  const resolvedLineageSubTab = activeLineageSubTab ?? fallbackLineageSubTab
  const lineageSubTabItems = lineageDependencies
    ? [...baseLineageSubTabItems, lineageDependenciesSubTabItem]
    : baseLineageSubTabItems

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
    if (!isTabEnabled(nextTab)) {
      return
    }

    setInternalTab(nextTab)
    onValueChange?.(nextTab)

    if (nextTab === 'explore') {
      updateResourceTabParams(nextTab, activeExploreSubTab)
      return
    }

    if (nextTab === 'lineage') {
      updateResourceTabParams(nextTab, resolvedLineageSubTab)
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
          {isTabEnabled('overview') ? (
            <ConsolePrimaryTabsTrigger disabled={disabled} value="overview">
              Overview
            </ConsolePrimaryTabsTrigger>
          ) : null}
          {isTabEnabled('explore') ? (
            <ConsolePrimaryTabsTrigger disabled={disabled} value="explore">
              Explore
            </ConsolePrimaryTabsTrigger>
          ) : null}
          {isTabEnabled('lineage') ? (
            <ConsolePrimaryTabsTrigger disabled={disabled} value="lineage">
              Lineage
            </ConsolePrimaryTabsTrigger>
          ) : null}
          {isTabEnabled('versions') ? (
            <ConsolePrimaryTabsTrigger disabled={disabled} value="versions">
              Versions
            </ConsolePrimaryTabsTrigger>
          ) : null}
          {isTabEnabled('usage') ? (
            <ConsolePrimaryTabsTrigger disabled={disabled} value="usage">
              Usage
            </ConsolePrimaryTabsTrigger>
          ) : null}
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
                <EmptyPlaceholder>No map data available.</EmptyPlaceholder>
              )}
            </div>
          )}
          {activeExploreSubTab === 'table' &&
            (exploreTable ? (
              <div className="overflow-hidden rounded-[10px] bg-white p-6 text-card-foreground">
                {exploreTable}
              </div>
            ) : (
              <EmptyPlaceholder>No table data available.</EmptyPlaceholder>
            ))}
        </div>
      </TabsContent>

      <TabsContent value="lineage">
        <div className="flex flex-col gap-4">
          <ConsoleSecondaryTabs
            items={lineageSubTabItems}
            value={resolvedLineageSubTab}
            onValueChange={handleLineageSubTabChange}
          />
          {resolvedLineageSubTab === 'simple' &&
            (workflowDagSimple ? (
              <SimpleWorkflowDagChart
                emptyMessage={DEFAULT_LINEAGE_EMPTY_MESSAGE}
                workflowDagSimple={workflowDagSimple}
                onMethodClick={() => handleLineageSubTabChange('technical')}
              />
            ) : (
              <LineageEmptyState />
            ))}
          {resolvedLineageSubTab === 'technical' && (
            <div>{lineage ?? <LineageEmptyState />}</div>
          )}
          {resolvedLineageSubTab === 'dependencies' && (
            <div>{lineageDependencies ?? <LineageEmptyState />}</div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="versions">
        <div className="flex flex-col gap-6">
          {versions ?? (
            <EmptyPlaceholder>
              No version information available.
            </EmptyPlaceholder>
          )}
        </div>
      </TabsContent>

      <TabsContent value="usage">
        <div className="flex flex-col gap-6">
          {usage ?? (
            <EmptyPlaceholder>No usage information available.</EmptyPlaceholder>
          )}
        </div>
      </TabsContent>
    </Tabs>
  )
}
