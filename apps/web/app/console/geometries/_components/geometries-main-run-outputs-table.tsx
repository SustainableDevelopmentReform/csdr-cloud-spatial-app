'use client'

import { geometryOutputQuerySchema } from '@repo/schemas/crud'
import { ColumnDef } from '@tanstack/react-table'
import { useCallback, useEffect, useMemo, useState } from 'react'
import BaseCrudTable from '../../../../components/table/crud-table'
import Pagination from '../../../../components/table/pagination'
import { SearchInput } from '../../../../components/table/search-input'
import {
  GeographicBoundsPickerDialog,
  getGeographicBoundsFromQuery,
  toGeographicBoundsQuery,
} from '../../_components/geographic-bounds-picker-dialog'
import { getEditModeHref } from '../../_components/resource-detail-mode'
import { GeometryOutputDetailsSidebar } from './geometry-output-details-sidebar'
import {
  GeometryOutputListItem,
  useGeometryOutputLink,
  useGeometryOutputs,
} from '../_hooks'
import z from 'zod'

export function GeometriesMainRunOutputsTable({
  canEdit,
  geometriesRunId,
}: {
  canEdit: boolean
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
  const [selectedGeometryOutputId, setSelectedGeometryOutputId] = useState<
    string | null
  >(null)

  const closeGeometryOutputDetails = useCallback(() => {
    setSelectedGeometryOutputId(null)
  }, [])

  const openGeometryOutputDetails = useCallback(
    (geometryOutput: GeometryOutputListItem) => {
      setSelectedGeometryOutputId(geometryOutput.id)
    },
    [],
  )

  const editGeometryOutputLink = useCallback(
    (geometryOutput: GeometryOutputListItem) =>
      getEditModeHref(geometryOutputLink(geometryOutput)),
    [geometryOutputLink],
  )

  useEffect(() => {
    if (!selectedGeometryOutputId) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeGeometryOutputDetails()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [closeGeometryOutputDetails, selectedGeometryOutputId])

  const geographicBounds = getGeographicBoundsFromQuery(query)

  const baseColumns = useMemo(() => {
    return ['description', 'updatedAt'] as const
  }, [])

  const columns = useMemo(() => [] as ColumnDef<GeometryOutputListItem>[], [])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <SearchInput
          className="w-full md:max-w-md"
          placeholder="Search boundary features"
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
        canModifyItem={() => canEdit}
        editLink={editGeometryOutputLink}
        extraColumns={columns}
        title="BoundaryFeature"
        itemAction={openGeometryOutputDetails}
        itemLink={geometryOutputLink}
        selectedItemId={selectedGeometryOutputId}
        stickyColumnClassName="bg-white"
        sortOptions={['name', 'createdAt', 'updatedAt']}
        query={{ sort: query?.sort, order: query?.order }}
        onSortChange={(next) => setSearchParams(next)}
      />
      <GeometryOutputDetailsSidebar
        geometryOutputId={selectedGeometryOutputId}
        onClose={closeGeometryOutputDetails}
        open={Boolean(selectedGeometryOutputId)}
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
