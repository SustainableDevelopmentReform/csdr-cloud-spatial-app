'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { createReportSchema } from '@repo/schemas/crud'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { normalizeFilterValues } from '~/utils'
import Pagination from '~/components/table/pagination'
import CrudFormDialog from '../../../components/form/crud-form-dialog'
import BaseCrudTable from '../../../components/table/crud-table'
import { DatasetRunSelect } from '../dataset/_components/dataset-run-select'
import { DatasetSelect } from '../dataset/_components/dataset-select'
import { GeometriesRunSelect } from '../geometries/_components/geometries-run-select'
import { GeometriesSelect } from '../geometries/_components/geometries-select'
import { IndicatorsSelect } from '../indicator/_components/indicators-select'
import { ProductRunSelect } from '../product/_components/product-run-select'
import { ProductSelect } from '../product/_components/product-select'
import { ReportButton } from './_components/report-button'
import { useCreateReport, useReportLink, useReports } from './_hooks'
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
  const createReport = useCreateReport()

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

  const baseColumns = useMemo(() => {
    return ['description', 'createdAt', 'updatedAt'] as const
  }, [])

  const form = useForm({
    resolver: zodResolver(createReportSchema),
  })

  return (
    <div>
      <div className="flex justify-between">
        <h1 className="text-3xl font-medium mb-2">Reports</h1>
        <CrudFormDialog
          form={form}
          mutation={createReport}
          buttonText="Add Report"
          entityName="Report"
          entityNamePlural="reports"
        ></CrudFormDialog>
      </div>
      <div>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <SearchInput
            className="w-full md:max-w-md"
            placeholder="Search reports"
            value={query?.search ?? ''}
            onChange={(e) => setSearchParams({ search: e.target.value })}
          />
          <div className="flex flex-wrap justify-end gap-3 items-end md:flex-wrap-reverse">
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
                      geometriesId: selected.map((geometries) => geometries.id),
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
          </div>
        </div>
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
          className="justify-end mt-4"
          hasNextPage={!!hasNextPage}
          isLoading={isFetchingNextPage}
          onLoadMore={() => fetchNextPage()}
        />
      </div>
    </div>
  )
}

export default ReportFeature
