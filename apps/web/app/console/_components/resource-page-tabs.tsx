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

interface ResourcePageTabsProps {
  defaultTab?: ResourceTab
  overview: React.ReactNode
  exploreMap?: React.ReactNode
  exploreTable?: React.ReactNode
  lineage?: React.ReactNode
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
          {lineageSubTab === 'simple' && (
            <div className="flex flex-col gap-6">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="">
                  This product intersects the Global Mangrove Watch v4 dataset
                  for 2020 with the Global Exclusive Economic Zone boundaries.
                  It calculates the total area of mangroves within each EEZ from
                  the 10m resolution data.
                </p>
              </div>
              {/* Simple placeholder flowchart */}
              <div className="rounded-xl p-6" style={{ background: '#D7D7D7' }}>
                <div className="grid grid-cols-[auto_1fr] gap-x-4">
                  {/* INPUTS label */}
                  <div className="flex items-center justify-end text-xs font-semibold uppercase tracking-wider">
                    Inputs
                  </div>
                  {/* Inputs row */}
                  <div className="flex items-start justify-center gap-8">
                    <div className="rounded-lg border bg-background px-6 py-3 text-sm font-medium shadow-sm">
                      Global Mangrove Watch v4 (2020) 10m raster dataset
                    </div>
                    <div className="rounded-lg border bg-background px-6 py-3 text-sm font-medium shadow-sm">
                      Global Exclusive Economic Zone boundaries
                    </div>
                  </div>
                  {/* spacer for connector */}
                  <div />
                  <div className="flex justify-center">
                    <svg width="300" height="40">
                      <line
                        x1="75"
                        y1="0"
                        x2="150"
                        y2="40"
                        stroke="#737373"
                        strokeWidth="1"
                      />
                      <line
                        x1="225"
                        y1="0"
                        x2="150"
                        y2="40"
                        stroke="#737373"
                        strokeWidth="1"
                      />
                    </svg>
                  </div>
                  {/* METHODS label */}
                  <div className="flex items-center justify-end text-xs font-semibold uppercase tracking-wider">
                    Methods
                  </div>
                  {/* Method card */}
                  <div className="flex justify-center">
                    <div className="rounded-lg border bg-background px-6 py-3 text-sm font-medium shadow-sm">
                      Intersect and calculate area (per EEZ, per year)
                    </div>
                  </div>
                  {/* spacer for connector */}
                  <div />
                  <div className="flex justify-center">
                    <div
                      className="h-8 w-px"
                      style={{ background: '#737373' }}
                    />
                  </div>
                  {/* OUTPUTS label */}
                  <div className="flex items-center justify-end text-xs font-semibold uppercase tracking-wider">
                    Outputs
                  </div>
                  {/* Output card */}
                  <div className="flex justify-center">
                    <div className="rounded-lg border bg-background px-6 py-3 text-sm font-medium shadow-sm">
                      GMW v4 per EEZ Product
                    </div>
                  </div>
                  {/* spacer for connector */}
                  <div />
                  <div className="flex justify-center">
                    <div
                      className="h-8 w-px"
                      style={{ background: '#737373' }}
                    />
                  </div>
                  {/* INDICATORS label */}
                  <div className="flex items-center justify-end text-xs font-semibold uppercase tracking-wider">
                    Indicators
                  </div>
                  {/* Indicator card */}
                  <div className="flex justify-center">
                    <div className="rounded-lg border bg-background px-6 py-3 text-sm font-medium shadow-sm">
                      Mangrove Area
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
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
