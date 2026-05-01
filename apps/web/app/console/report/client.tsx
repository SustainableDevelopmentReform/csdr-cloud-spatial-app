'use client'

import { useMemo } from 'react'
import { normalizeFilterValues } from '~/utils'
import Pagination from '~/components/table/pagination'
import {
  ActiveTableFilter,
  TableFilterPopover,
} from '~/components/table/filter-popover'
import BaseCrudTable from '../../../components/table/crud-table'
import { TableRowDeleteAction } from '../../../components/table/table-row-delete-action'
import { useAccessControl } from '../../../hooks/useAccessControl'
import { canEditConsoleResource } from '../../../utils/access-control'
import { ConsoleCrudListFrame } from '../_components/console-crud-list-frame'
import { ConsolePageHeader } from '../_components/console-page-header'
import {
  formatBoundsLabel,
  GeographicBoundsPickerDialog,
  getGeographicBoundsFromQuery,
  toGeographicBoundsQuery,
} from '../_components/geographic-bounds-picker-dialog'
import { DatasetRunSelect } from '../dataset/_components/dataset-run-select'
import { DatasetSelect } from '../dataset/_components/dataset-select'
import { GeometriesRunSelect } from '../geometries/_components/geometries-run-select'
import { GeometriesSelect } from '../geometries/_components/geometries-select'
import { IndicatorsSelect } from '../indicator/_components/indicators-select'
import { ProductRunSelect } from '../product/_components/product-run-select'
import { ProductSelect } from '../product/_components/product-select'
import { ReportBreadcrumbs } from './_components/breadcrumbs'
import { ReportCreateAction } from './_components/report-create-action'
import {
  ReportListItem,
  useDeleteReport,
  useReportLink,
  useReports,
} from './_hooks'
import { SearchInput } from '../../../components/table/search-input'

const ReportDeleteAction = ({ report }: { report: ReportListItem }) => {
  const deleteReport = useDeleteReport(report.id)

  return (
    <TableRowDeleteAction
      entityName="report"
      itemName={report.name}
      mutation={deleteReport}
    />
  )
}

const ReportFeature = () => {
  const { access } = useAccessControl()
  const {
    data,
    query,
    setSearchParams,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
  } = useReports(undefined, true)
  const reportLink = useReportLink()
  const selectedIndicatorIds = useMemo(
    () => normalizeFilterValues(query?.indicatorId),
    [query?.indicatorId],
  )
  const selectedProductIds = useMemo(
    () => normalizeFilterValues(query?.productId),
    [query?.productId],
  )
  const selectedDatasetIds = useMemo(
    () => normalizeFilterValues(query?.datasetId),
    [query?.datasetId],
  )
  const selectedGeometriesIds = useMemo(
    () => normalizeFilterValues(query?.geometriesId),
    [query?.geometriesId],
  )
  const showProductFilter = selectedProductIds.length > 0
  const showProductRunFilter = Boolean(query?.productRunId)
  const showDatasetFilter = selectedDatasetIds.length > 0
  const showDatasetRunFilter = Boolean(query?.datasetRunId)
  const showGeometriesFilter = selectedGeometriesIds.length > 0
  const showGeometriesRunFilter = Boolean(query?.geometriesRunId)
  const geographicBounds = getGeographicBoundsFromQuery(query)

  const baseColumns = useMemo(() => {
    return ['description', 'updatedAt'] as const
  }, [])
  const activeFilters = useMemo<ActiveTableFilter[]>(() => {
    const filters: ActiveTableFilter[] = []

    if (selectedIndicatorIds.length > 0) {
      filters.push({
        id: 'indicators',
        label: 'Indicators',
        value: `${selectedIndicatorIds.length} selected`,
        onClear: () => setSearchParams({ indicatorId: undefined }),
      })
    }

    if (selectedProductIds.length > 0) {
      filters.push({
        id: 'products',
        label: 'Products',
        value: `${selectedProductIds.length} selected`,
        onClear: () => setSearchParams({ productId: undefined }),
      })
    }

    if (query?.productRunId) {
      filters.push({
        id: 'product-run',
        label: 'Product run',
        value: 'Selected',
        onClear: () => setSearchParams({ productRunId: undefined }),
      })
    }

    if (selectedDatasetIds.length > 0) {
      filters.push({
        id: 'datasets',
        label: 'Datasets',
        value: `${selectedDatasetIds.length} selected`,
        onClear: () => setSearchParams({ datasetId: undefined }),
      })
    }

    if (query?.datasetRunId) {
      filters.push({
        id: 'dataset-run',
        label: 'Dataset run',
        value: 'Selected',
        onClear: () => setSearchParams({ datasetRunId: undefined }),
      })
    }

    if (selectedGeometriesIds.length > 0) {
      filters.push({
        id: 'geometries',
        label: 'Boundaries',
        value: `${selectedGeometriesIds.length} selected`,
        onClear: () => setSearchParams({ geometriesId: undefined }),
      })
    }

    if (query?.geometriesRunId) {
      filters.push({
        id: 'geometries-run',
        label: 'Boundary run',
        value: 'Selected',
        onClear: () => setSearchParams({ geometriesRunId: undefined }),
      })
    }

    if (geographicBounds) {
      filters.push({
        id: 'geography',
        label: 'Area',
        value: formatBoundsLabel(geographicBounds),
        onClear: () => setSearchParams(toGeographicBoundsQuery(null)),
      })
    }

    return filters
  }, [
    geographicBounds,
    query?.datasetRunId,
    query?.geometriesRunId,
    query?.productRunId,
    selectedDatasetIds.length,
    selectedGeometriesIds.length,
    selectedIndicatorIds.length,
    selectedProductIds.length,
    setSearchParams,
  ])

  return (
    <div className="flex flex-col gap-6">
      <ConsolePageHeader breadcrumbs={<ReportBreadcrumbs />} />
      <ConsoleCrudListFrame
        title="Reports"
        description="Create and manage reports in the system."
        actions={<ReportCreateAction />}
        footer={
          <Pagination
            hasNextPage={!!hasNextPage}
            isLoading={isFetchingNextPage}
            loadedCount={data?.data.length}
            totalCount={data?.totalCount}
            onLoadMore={() => fetchNextPage()}
          />
        }
        toolbar={
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <SearchInput
              className="w-full md:w-72"
              placeholder="Search reports"
              value={query?.search ?? ''}
              onChange={(e) => setSearchParams({ search: e.target.value })}
            />
            <TableFilterPopover activeFilters={activeFilters}>
              <div>
                <IndicatorsSelect
                  title="Filter Indicators"
                  value={selectedIndicatorIds}
                  onChange={(selected) =>
                    setSearchParams({
                      indicatorId: selected.map((indicator) => indicator.id),
                    })
                  }
                  isMulti
                  isClearable
                />
              </div>
              {showProductFilter && (
                <div>
                  <ProductSelect
                    title="Filter Products"
                    value={selectedProductIds}
                    onChange={(selected) =>
                      setSearchParams({
                        productId: selected.map((product) => product.id),
                      })
                    }
                    isMulti
                    isClearable
                  />
                </div>
              )}
              {showProductRunFilter && (
                <div>
                  <ProductRunSelect
                    title="Filter Product Run"
                    value={query?.productRunId}
                    productId="*"
                    onChange={(selected) =>
                      setSearchParams({
                        productRunId: selected?.id,
                      })
                    }
                    isClearable
                  />
                </div>
              )}
              {showDatasetFilter && (
                <div>
                  <DatasetSelect
                    title="Filter Datasets"
                    value={selectedDatasetIds}
                    onChange={(selected) =>
                      setSearchParams({
                        datasetId: selected.map((dataset) => dataset.id),
                      })
                    }
                    isMulti
                    isClearable
                  />
                </div>
              )}
              {showDatasetRunFilter && (
                <div>
                  <DatasetRunSelect
                    title="Filter Dataset Run"
                    value={query?.datasetRunId}
                    datasetId="*"
                    onChange={(selected) =>
                      setSearchParams({
                        datasetRunId: selected?.id,
                      })
                    }
                    isClearable
                  />
                </div>
              )}
              {showGeometriesFilter && (
                <div>
                  <GeometriesSelect
                    title="Filter Geometries"
                    value={selectedGeometriesIds}
                    onChange={(selected) =>
                      setSearchParams({
                        geometriesId: selected.map(
                          (geometries) => geometries.id,
                        ),
                      })
                    }
                    isMulti
                    isClearable
                  />
                </div>
              )}
              {showGeometriesRunFilter && (
                <div>
                  <GeometriesRunSelect
                    title="Filter Geometries Run"
                    value={query?.geometriesRunId}
                    geometriesId="*"
                    onChange={(selected) =>
                      setSearchParams({
                        geometriesRunId: selected?.id,
                      })
                    }
                    isClearable
                  />
                </div>
              )}
              <GeographicBoundsPickerDialog
                title="Area of Interest"
                value={geographicBounds}
                onChange={(bounds) =>
                  setSearchParams(toGeographicBoundsQuery(bounds))
                }
                onClear={() => setSearchParams(toGeographicBoundsQuery(null))}
              />
            </TableFilterPopover>
          </div>
        }
      >
        <BaseCrudTable
          data={data?.data || []}
          isLoading={isLoading}
          baseColumns={baseColumns}
          sortOptions={['name', 'createdAt', 'updatedAt']}
          title="Report"
          itemLink={reportLink}
          canModifyItem={(report) =>
            canEditConsoleResource({
              access,
              resource: 'report',
              resourceData: report,
            })
          }
          deleteAction={(report) => <ReportDeleteAction report={report} />}
          query={query}
          onSortChange={setSearchParams}
        />
      </ConsoleCrudListFrame>
    </div>
  )
}

export default ReportFeature
