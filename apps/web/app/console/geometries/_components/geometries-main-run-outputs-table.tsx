'use client'

import { geometryOutputQuerySchema } from '@repo/schemas/crud'
import { ColumnDef } from '@tanstack/react-table'
import { useMemo } from 'react'
import BaseCrudTable from '../../../../components/table/crud-table'
import Pagination from '../../../../components/table/pagination'
import { SearchInput } from '../../../../components/table/search-input'
import {
  GeographicBoundsPickerDialog,
  getGeographicBoundsFromQuery,
  toGeographicBoundsQuery,
} from '../../_components/geographic-bounds-picker-dialog'
import { GeometryOutputButton } from './geometry-output-button'
import {
  GeometryOutputListItem,
  useGeometryOutputLink,
  useGeometryOutputs,
} from '../_hooks'
import z from 'zod'

export function GeometriesMainRunOutputsTable({
  geometriesRunId,
}: {
  geometriesRunId: string
}) {
  const {
    data,
    query,
    setSearchParams,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
  } = useGeometryOutputs(geometriesRunId, undefined, false)
  const geometryOutputLink = useGeometryOutputLink()

  const geographicBounds = getGeographicBoundsFromQuery(query)

  const baseColumns = useMemo(() => {
    return ['createdAt', 'name'] as const
  }, [])

  const columns = useMemo(() => [] as ColumnDef<GeometryOutputListItem>[], [])

  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <SearchInput
          className="w-full md:max-w-md"
          placeholder="Search geometry outputs"
          value={query?.search ?? ''}
          onChange={(e) => setSearchParams({ search: e.target.value })}
        />
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
      <BaseCrudTable<
        GeometryOutputListItem,
        Pick<z.output<typeof geometryOutputQuerySchema>, 'sort' | 'order'>
      >
        data={data?.data || []}
        isLoading={isLoading}
        baseColumns={baseColumns}
        extraColumns={columns}
        title="GeometryOutput"
        itemLink={geometryOutputLink}
        itemButton={(geometryOutput) => (
          <GeometryOutputButton geometryOutput={geometryOutput} />
        )}
        query={{ sort: query?.sort, order: query?.order }}
        onSortChange={(next) => setSearchParams(next)}
      />
      <Pagination
        className="justify-end mt-4"
        hasNextPage={!!hasNextPage}
        isLoading={isFetchingNextPage}
        onLoadMore={() => fetchNextPage()}
      />
    </div>
  )
}
