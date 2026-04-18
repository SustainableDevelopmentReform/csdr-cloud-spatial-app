'use client'

import { useMemo } from 'react'
import Pagination from '~/components/table/pagination'
import BaseCrudTable from '../../../components/table/crud-table'
import { ConsolePageHeader } from '../_components/console-page-header'
import {
  GeographicBoundsPickerDialog,
  getGeographicBoundsFromQuery,
  toGeographicBoundsQuery,
} from '../_components/geographic-bounds-picker-dialog'
import { DatasetBreadcrumbs } from './_components/breadcrumbs'
import { DatasetButton } from './_components/dataset-button'
import { DatasetCreateAction } from './_components/dataset-create-action'
import { useDatasetLink, useDatasets } from './_hooks'
import { SearchInput } from '../../../components/table/search-input'

const DatasetFeature = () => {
  const {
    data,
    query,
    setSearchParams,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
  } = useDatasets(undefined, true)
  const datasetLink = useDatasetLink()
  const geographicBounds = getGeographicBoundsFromQuery(query)

  const baseColumns = useMemo(() => {
    return ['description', 'createdAt', 'updatedAt'] as const
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <ConsolePageHeader
        breadcrumbs={<DatasetBreadcrumbs />}
        actions={<DatasetCreateAction />}
      />
      <div className="flex justify-between">
        <h1 className="text-3xl font-medium mb-2">Datasets</h1>
      </div>
      <div>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <SearchInput
            placeholder="Search datasets"
            value={query?.search ?? ''}
            onChange={(e) => setSearchParams({ search: e.target.value })}
          />
          <GeographicBoundsPickerDialog
            value={geographicBounds}
            onChange={(bounds) =>
              setSearchParams(toGeographicBoundsQuery(bounds))
            }
            onClear={() => setSearchParams(toGeographicBoundsQuery(null))}
          />
        </div>
        <BaseCrudTable
          data={data?.data || []}
          isLoading={isLoading}
          baseColumns={baseColumns}
          title="Dataset"
          itemLink={datasetLink}
          itemButton={(dataset) => <DatasetButton dataset={dataset} />}
          query={query}
          onSortChange={(query) =>
            setSearchParams({ sort: query.sort, order: query.order })
          }
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

export default DatasetFeature
