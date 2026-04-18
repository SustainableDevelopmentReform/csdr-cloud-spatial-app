'use client'

import { useMemo } from 'react'
import { normalizeFilterValues } from '~/utils'
import Pagination from '~/components/table/pagination'
import BaseCrudTable from '../../../components/table/crud-table'
import { ConsoleCrudListFrame } from '../_components/console-crud-list-frame'
import { ConsolePageHeader } from '../_components/console-page-header'
import {
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
import { ReportButton } from './_components/report-button'
import { ReportCreateAction } from './_components/report-create-action'
import { useReportLink, useReports } from './_hooks'
import { SearchInput } from '../../../components/table/search-input'

const ReportFeature = () => {
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
    return ['description', 'createdAt', 'updatedAt'] as const
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <ConsolePageHeader breadcrumbs={<ReportBreadcrumbs />} />
      <ConsoleCrudListFrame
        title="Reports"
        description="Create and manage reports in the system."
        actions={<ReportCreateAction />}
        toolbar={
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <SearchInput
              className="w-full md:max-w-md"
              placeholder="Search reports"
              value={query?.search ?? ''}
              onChange={(e) => setSearchParams({ search: e.target.value })}
            />
            <div className="flex flex-wrap items-end justify-end gap-3">
              <div className="min-w-[220px] md:min-w-[260px]">
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
                <div className="min-w-[220px] md:min-w-[260px]">
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
                <div className="min-w-[220px] md:min-w-[260px]">
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
                <div className="min-w-[220px] md:min-w-[260px]">
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
                <div className="min-w-[220px] md:min-w-[260px]">
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
                <div className="min-w-[220px] md:min-w-[260px]">
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
                <div className="min-w-[220px] md:min-w-[260px]">
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
                className="min-w-[220px] md:min-w-[260px]"
                value={geographicBounds}
                onChange={(bounds) =>
                  setSearchParams(toGeographicBoundsQuery(bounds))
                }
                onClear={() => setSearchParams(toGeographicBoundsQuery(null))}
              />
            </div>
          </div>
        }
      >
        <BaseCrudTable
          data={data?.data || []}
          isLoading={isLoading}
          baseColumns={baseColumns}
          title="Report"
          itemLink={reportLink}
          itemButton={(report) => <ReportButton report={report} />}
          query={query}
          onSortChange={setSearchParams}
        />
        <Pagination
          className="justify-end"
          hasNextPage={!!hasNextPage}
          isLoading={isFetchingNextPage}
          onLoadMore={() => fetchNextPage()}
        />
      </ConsoleCrudListFrame>
    </div>
  )
}

export default ReportFeature
