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
import { GeometriesBreadcrumbs } from './_components/breadcrumbs'
import { GeometriesButton } from './_components/geometries-button'
import { GeometriesCreateAction } from './_components/geometries-create-action'
import { useAllGeometries, useGeometriesLink } from './_hooks'
import { SearchInput } from '../../../components/table/search-input'

const GeometriesFeature = () => {
  const {
    data,
    query,
    setSearchParams,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
  } = useAllGeometries(undefined, true)
  const geometriesLink = useGeometriesLink()
  const geographicBounds = getGeographicBoundsFromQuery(query)

  const baseColumns = useMemo(() => {
    return ['description', 'createdAt', 'updatedAt'] as const
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <ConsolePageHeader
        breadcrumbs={<GeometriesBreadcrumbs />}
        actions={<GeometriesCreateAction />}
      />
      <div className="flex justify-between">
        <h1 className="mb-2 text-3xl font-medium">Boundaries</h1>
      </div>
      <div>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <SearchInput
            placeholder="Search boundaries"
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
          title="Boundaries"
          itemLink={geometriesLink}
          itemButton={(geometries) => (
            <GeometriesButton geometries={geometries} />
          )}
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

export default GeometriesFeature
