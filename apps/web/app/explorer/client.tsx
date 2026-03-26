'use client'

import { Badge } from '@repo/ui/components/ui/badge'
import { Button } from '@repo/ui/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/ui/card'
import { Input } from '@repo/ui/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@repo/ui/components/ui/tabs'
import { formatDateTime } from '@repo/ui/lib/date'
import { Globe, LockOpen, Radar } from 'lucide-react'
import Link from '~/components/link'
import { useQueryWithSearchParams } from '~/hooks/useSearchParams'
import { LOGIN_BASE_PATH, PUBLIC_EXPLORER_BASE_PATH } from '~/lib/paths'
import { formatVisibility } from '~/utils/access-control'
import {
  type ExplorerResource,
  explorerPageQuerySchema,
  type PublicDashboard,
  type PublicDashboardDetail,
  type PublicDataset,
  type PublicDatasetDetail,
  type PublicGeometries,
  type PublicGeometriesDetail,
  type PublicIndicator,
  type PublicIndicatorCategory,
  type PublicIndicatorCategoryDetail,
  type PublicIndicatorDetail,
  type PublicProduct,
  type PublicProductDetail,
  type PublicReport,
  type PublicReportDetail,
  usePublicDashboard,
  usePublicDashboards,
  usePublicDataset,
  usePublicDatasets,
  usePublicGeometries,
  usePublicGeometriesDetail,
  usePublicIndicator,
  usePublicIndicatorCategories,
  usePublicIndicatorCategory,
  usePublicIndicators,
  usePublicProduct,
  usePublicProducts,
  usePublicReport,
  usePublicReports,
} from './_hooks'

type ExplorerListItem =
  | PublicDashboard
  | PublicDataset
  | PublicGeometries
  | PublicIndicator
  | PublicIndicatorCategory
  | PublicProduct
  | PublicReport

type ExplorerDetailItem =
  | PublicDashboardDetail
  | PublicDatasetDetail
  | PublicGeometriesDetail
  | PublicIndicatorCategoryDetail
  | PublicIndicatorDetail
  | PublicProductDetail
  | PublicReportDetail

const EXPLORER_TABS: Array<{
  description: string
  label: string
  value: ExplorerResource
}> = [
  {
    value: 'dashboard',
    label: 'Dashboards',
    description: 'Published layouts and narrative views',
  },
  {
    value: 'report',
    label: 'Reports',
    description: 'Public write-ups and research artefacts',
  },
  {
    value: 'dataset',
    label: 'Datasets',
    description: 'Public source collections and ingested tables',
  },
  {
    value: 'geometries',
    label: 'Geometries',
    description: 'Public geographic boundaries and feature sets',
  },
  {
    value: 'product',
    label: 'Products',
    description: 'Published derived products and outputs',
  },
  {
    value: 'indicator',
    label: 'Indicators',
    description: 'Measured and derived metrics',
  },
  {
    value: 'indicatorCategory',
    label: 'Indicator categories',
    description: 'Public category structure and taxonomy',
  },
]

const formatToken = (value: string | null | undefined) => {
  if (!value) {
    return 'Unspecified'
  }

  return value.replaceAll('_', ' ')
}

const describeListItem = (
  resource: ExplorerResource,
  item: ExplorerListItem,
): string => {
  switch (resource) {
    case 'dashboard':
      return 'Published dashboard'
    case 'dataset':
      return 'sourceUrl' in item && item.sourceUrl
        ? 'Source linked'
        : 'Stored dataset'
    case 'geometries':
      return 'sourceUrl' in item && item.sourceUrl
        ? 'Source linked'
        : 'Spatial asset'
    case 'indicator':
      return 'type' in item ? `${item.type} indicator` : 'Indicator'
    case 'indicatorCategory':
      return 'parentId' in item && item.parentId
        ? 'Nested category'
        : 'Top-level category'
    case 'product':
      return 'timePrecision' in item ? item.timePrecision : 'Published product'
    case 'report':
      return 'Published report'
    default:
      return 'Public resource'
  }
}

const getDetailPreview = (detail: ExplorerDetailItem | null) => {
  if (!detail) {
    return null
  }

  if ('content' in detail) {
    return JSON.stringify(detail.content, null, 2)
  }

  if ('expression' in detail) {
    return detail.expression
  }

  return null
}

const renderOverviewRows = (detail: ExplorerDetailItem) => {
  const rows = [
    { label: 'Visibility', value: formatVisibility(detail.visibility) },
    { label: 'Workspace ID', value: detail.organizationId },
    { label: 'Created by', value: detail.createdByUserId },
    { label: 'Created at', value: formatDateTime(detail.createdAt) },
    { label: 'Updated at', value: formatDateTime(detail.updatedAt) },
  ]

  if ('runCount' in detail) {
    rows.push({ label: 'Run count', value: detail.runCount.toString() })
  }

  if ('productCount' in detail) {
    rows.push({
      label: 'Product count',
      value: detail.productCount.toString(),
    })
  }

  if ('timePrecision' in detail) {
    rows.push({
      label: 'Time precision',
      value: formatToken(detail.timePrecision),
    })
  }

  if ('displayOrder' in detail && detail.displayOrder !== null) {
    rows.push({
      label: 'Display order',
      value: detail.displayOrder.toString(),
    })
  }

  if ('type' in detail) {
    rows.push({ label: 'Indicator type', value: formatToken(detail.type) })
    rows.push({ label: 'Unit', value: detail.unit })
  }

  if ('expression' in detail) {
    rows.push({
      label: 'Dependency count',
      value: detail.indicators.length.toString(),
    })
  }

  if (
    'content' in detail &&
    detail.content !== null &&
    typeof detail.content === 'object' &&
    'layout' in detail.content
  ) {
    const layout = detail.content.layout

    rows.push({
      label: 'Chart cards',
      value: Array.isArray(layout) ? layout.length.toString() : '0',
    })
  }

  if (
    'content' in detail &&
    detail.content !== null &&
    !('layout' in detail.content)
  ) {
    rows.push({
      label: 'Document fields',
      value: Object.keys(detail.content).length.toString(),
    })
  }

  if ('parentId' in detail) {
    rows.push({
      label: 'Parent category',
      value: detail.parentId ?? 'Top-level',
    })
  }

  if ('dataset' in detail) {
    rows.push({
      label: 'Dataset',
      value: detail.dataset?.name ?? 'Unlinked',
    })
  }

  if ('geometries' in detail) {
    rows.push({
      label: 'Geometries',
      value: detail.geometries?.name ?? 'Unlinked',
    })
  }

  return rows
}

const ExplorerPageClient = () => {
  const { query, setSearchParams } = useQueryWithSearchParams(
    explorerPageQuerySchema,
    {
      page: 1,
      tab: 'dashboard',
    },
    true,
  )

  const activeTab = query?.tab ?? 'dashboard'

  const publicDashboards = usePublicDashboards(query, activeTab === 'dashboard')
  const publicDashboard = usePublicDashboard(
    query?.id,
    activeTab === 'dashboard',
  )
  const publicReports = usePublicReports(query, activeTab === 'report')
  const publicReport = usePublicReport(query?.id, activeTab === 'report')
  const publicDatasets = usePublicDatasets(query, activeTab === 'dataset')
  const publicDataset = usePublicDataset(query?.id, activeTab === 'dataset')
  const publicGeometries = usePublicGeometries(
    query,
    activeTab === 'geometries',
  )
  const publicGeometriesDetail = usePublicGeometriesDetail(
    query?.id,
    activeTab === 'geometries',
  )
  const publicProducts = usePublicProducts(query, activeTab === 'product')
  const publicProduct = usePublicProduct(query?.id, activeTab === 'product')
  const publicIndicators = usePublicIndicators(query, activeTab === 'indicator')
  const publicIndicator = usePublicIndicator(
    query?.id,
    activeTab === 'indicator',
  )
  const publicIndicatorCategories = usePublicIndicatorCategories(
    query,
    activeTab === 'indicatorCategory',
  )
  const publicIndicatorCategory = usePublicIndicatorCategory(
    query?.id,
    activeTab === 'indicatorCategory',
  )

  const filteredIndicatorCategories = (
    publicIndicatorCategories.data?.data ?? []
  ).filter((category) => {
    const searchValue = query?.search?.trim().toLowerCase()

    if (!searchValue) {
      return true
    }

    const haystack =
      `${category.name} ${category.description ?? ''}`.toLowerCase()
    return haystack.includes(searchValue)
  })

  const activeItems = (() => {
    switch (activeTab) {
      case 'dashboard':
        return publicDashboards.data?.data ?? []
      case 'dataset':
        return publicDatasets.data?.data ?? []
      case 'geometries':
        return publicGeometries.data?.data ?? []
      case 'indicator':
        return publicIndicators.data?.data ?? []
      case 'indicatorCategory':
        return filteredIndicatorCategories
      case 'product':
        return publicProducts.data?.data ?? []
      case 'report':
        return publicReports.data?.data ?? []
      default:
        return []
    }
  })()

  const activeDetail = (() => {
    switch (activeTab) {
      case 'dashboard':
        return publicDashboard.data
      case 'dataset':
        return publicDataset.data
      case 'geometries':
        return publicGeometriesDetail.data
      case 'indicator':
        return publicIndicator.data
      case 'indicatorCategory':
        return publicIndicatorCategory.data
      case 'product':
        return publicProduct.data
      case 'report':
        return publicReport.data
      default:
        return null
    }
  })()

  const activeListLoading = (() => {
    switch (activeTab) {
      case 'dashboard':
        return publicDashboards.isLoading
      case 'dataset':
        return publicDatasets.isLoading
      case 'geometries':
        return publicGeometries.isLoading
      case 'indicator':
        return publicIndicators.isLoading
      case 'indicatorCategory':
        return publicIndicatorCategories.isLoading
      case 'product':
        return publicProducts.isLoading
      case 'report':
        return publicReports.isLoading
      default:
        return false
    }
  })()

  const activeDetailLoading = (() => {
    switch (activeTab) {
      case 'dashboard':
        return publicDashboard.isLoading
      case 'dataset':
        return publicDataset.isLoading
      case 'geometries':
        return publicGeometriesDetail.isLoading
      case 'indicator':
        return publicIndicator.isLoading
      case 'indicatorCategory':
        return publicIndicatorCategory.isLoading
      case 'product':
        return publicProduct.isLoading
      case 'report':
        return publicReport.isLoading
      default:
        return false
    }
  })()

  const pageCount = (() => {
    switch (activeTab) {
      case 'dashboard':
        return publicDashboards.data?.pageCount ?? 1
      case 'dataset':
        return publicDatasets.data?.pageCount ?? 1
      case 'geometries':
        return publicGeometries.data?.pageCount ?? 1
      case 'indicator':
        return publicIndicators.data?.pageCount ?? 1
      case 'indicatorCategory':
        return 1
      case 'product':
        return publicProducts.data?.pageCount ?? 1
      case 'report':
        return publicReports.data?.pageCount ?? 1
      default:
        return 1
    }
  })()

  const totalCount = (() => {
    switch (activeTab) {
      case 'dashboard':
        return publicDashboards.data?.totalCount ?? 0
      case 'dataset':
        return publicDatasets.data?.totalCount ?? 0
      case 'geometries':
        return publicGeometries.data?.totalCount ?? 0
      case 'indicator':
        return publicIndicators.data?.totalCount ?? 0
      case 'indicatorCategory':
        return filteredIndicatorCategories.length
      case 'product':
        return publicProducts.data?.totalCount ?? 0
      case 'report':
        return publicReports.data?.totalCount ?? 0
      default:
        return 0
    }
  })()

  const selectedTab = EXPLORER_TABS.find((tab) => tab.value === activeTab)
  const preview = getDetailPreview(activeDetail ?? null)

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#fffef8_0%,_#f8fafc_45%,_#ecfeff_100%)]">
      <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-6 py-8 lg:px-10">
        <section className="overflow-hidden rounded-[36px] border border-amber-200/70 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.34),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(34,197,94,0.18),_transparent_34%),linear-gradient(135deg,_rgba(255,255,255,0.96),_rgba(248,250,252,0.94))] px-6 py-8 shadow-[0_28px_80px_-40px_rgba(15,23,42,0.38)]">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-3xl">
              <div className="text-xs uppercase tracking-[0.34em] text-slate-500">
                Public explorer
              </div>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
                Browse published spatial resources without opening the console
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
                This surface is read-only and designed for discovery. It focuses
                on public dashboards, reports, indicators, and the upstream data
                they rely on.
              </p>
            </div>

            <div className="grid min-w-[280px] gap-3">
              <div className="rounded-3xl border border-white/80 bg-white/90 px-5 py-5 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Globe className="size-4" />
                  Public route family
                </div>
                <div className="mt-2 text-2xl font-semibold text-slate-950">
                  `/api/v0/public/*`
                </div>
                <div className="mt-2 text-sm text-slate-500">
                  Anonymous reads depend on platform policy. Authenticated users
                  can still use this explorer when public internet access is
                  restricted.
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href={LOGIN_BASE_PATH}>Sign in</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={PUBLIC_EXPLORER_BASE_PATH}>Reset filters</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <Tabs
          value={activeTab}
          onValueChange={(nextTab) => {
            if (
              nextTab === 'dashboard' ||
              nextTab === 'dataset' ||
              nextTab === 'geometries' ||
              nextTab === 'indicator' ||
              nextTab === 'indicatorCategory' ||
              nextTab === 'product' ||
              nextTab === 'report'
            ) {
              setSearchParams({
                id: undefined,
                page: 1,
                search: undefined,
                tab: nextTab,
              })
            }
          }}
        >
          <TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-[24px] border border-white/70 bg-white/90 p-2 shadow-sm">
            {EXPLORER_TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-2xl px-4 py-2 text-left"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <Card className="border-white/80 bg-white/92 shadow-sm">
            <CardHeader className="gap-4 border-b border-gray-100">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-2xl text-slate-950">
                    {selectedTab?.label}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {selectedTab?.description}
                  </CardDescription>
                </div>
                <Badge variant="outline">{totalCount} visible</Badge>
              </div>
              <Input
                placeholder={`Search ${selectedTab?.label.toLowerCase() ?? 'resources'}`}
                value={query?.search ?? ''}
                onChange={(event) => {
                  setSearchParams({
                    id: undefined,
                    page: 1,
                    search: event.target.value,
                  })
                }}
              />
            </CardHeader>
            <CardContent className="space-y-3 px-5 py-5">
              {activeListLoading ? (
                <div className="rounded-[28px] border border-dashed border-gray-300 px-5 py-10 text-sm text-gray-500">
                  Loading public resources...
                </div>
              ) : null}

              {!activeListLoading && activeItems.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-gray-300 px-5 py-10 text-sm text-gray-500">
                  No public resources match the current filters.
                </div>
              ) : null}

              {activeItems.map((item) => {
                const isSelected = item.id === query?.id

                return (
                  <button
                    key={item.id}
                    type="button"
                    className="w-full rounded-[24px] border border-gray-200 bg-gray-50/80 px-4 py-4 text-left transition hover:border-slate-300 hover:bg-white data-[selected=true]:border-slate-900 data-[selected=true]:bg-white data-[selected=true]:shadow-sm"
                    data-selected={isSelected}
                    onClick={() => {
                      setSearchParams({
                        id: item.id,
                      })
                    }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-medium text-slate-950">
                          {item.name}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {describeListItem(activeTab, item)}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">
                          {formatVisibility(item.visibility)}
                        </Badge>
                        <Badge variant="secondary">
                          {formatDateTime(item.createdAt)}
                        </Badge>
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
                      {item.description ?? 'No description was provided.'}
                    </p>
                  </button>
                )
              })}

              {activeTab !== 'indicatorCategory' ? (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
                  <div className="text-sm text-gray-500">
                    Page {query?.page ?? 1} of {pageCount}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={(query?.page ?? 1) <= 1}
                      onClick={() => {
                        setSearchParams({
                          page: Math.max((query?.page ?? 1) - 1, 1),
                        })
                      }}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={(query?.page ?? 1) >= pageCount}
                      onClick={() => {
                        setSearchParams({
                          page: (query?.page ?? 1) + 1,
                        })
                      }}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-white/80 bg-white/94 shadow-sm">
            <CardHeader className="border-b border-gray-100">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-2xl text-slate-950">
                    {activeDetail?.name ?? 'Select a public resource'}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {activeDetail?.description ??
                      'Choose an item from the list to inspect its public metadata and publication state.'}
                  </CardDescription>
                </div>
                {activeDetail ? (
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {formatVisibility(activeDetail.visibility)}
                    </Badge>
                    <Badge variant="secondary">{selectedTab?.label}</Badge>
                  </div>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-6 px-6 py-6">
              {activeDetailLoading ? (
                <div className="rounded-[28px] border border-dashed border-gray-300 px-5 py-10 text-sm text-gray-500">
                  Loading public resource details...
                </div>
              ) : null}

              {!activeDetailLoading && !activeDetail ? (
                <div className="rounded-[28px] border border-dashed border-gray-300 bg-[linear-gradient(135deg,_rgba(255,251,235,0.7),_rgba(240,249,255,0.85))] px-6 py-10 text-sm leading-6 text-slate-600">
                  This explorer is intentionally read-only. It shows what has
                  already cleared the publication rules, without exposing any
                  private console controls.
                </div>
              ) : null}

              {activeDetail ? (
                <>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {renderOverviewRows(activeDetail).map((row) => (
                      <div
                        key={row.label}
                        className="rounded-[24px] border border-gray-200 bg-gray-50/80 px-4 py-4"
                      >
                        <div className="text-xs uppercase tracking-[0.2em] text-gray-500">
                          {row.label}
                        </div>
                        <div className="mt-2 break-words text-sm font-medium text-slate-950">
                          {row.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  {preview ? (
                    <div className="rounded-[28px] border border-slate-900 bg-slate-950 px-5 py-5 shadow-inner">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-400">
                        <Radar className="size-4" />
                        Structured preview
                      </div>
                      <pre className="mt-4 overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-6 text-slate-100">
                        {preview}
                      </pre>
                    </div>
                  ) : null}

                  {'sourceUrl' in activeDetail && activeDetail.sourceUrl ? (
                    <div className="rounded-[24px] border border-amber-200 bg-amber-50/80 px-5 py-4 text-sm text-amber-950">
                      Source URL: {activeDetail.sourceUrl}
                    </div>
                  ) : null}

                  {'mainRunId' in activeDetail &&
                  activeDetail.mainRunId === null ? (
                    <div className="flex items-center gap-2 rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-700">
                      <LockOpen className="size-4" />
                      No main run is currently pinned for this public resource.
                    </div>
                  ) : null}
                </>
              ) : null}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  )
}

export default ExplorerPageClient
