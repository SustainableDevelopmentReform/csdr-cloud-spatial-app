'use client'

import { useMemo } from 'react'
import Pagination from '~/components/table/pagination'
import { TableFilterPopover } from '~/components/table/filter-popover'
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
import { GeometriesBreadcrumbs } from './_components/breadcrumbs'
import { GeometriesCreateAction } from './_components/geometries-create-action'
import {
  GeometriesListItem,
  useAllGeometries,
  useDeleteGeometries,
  useGeometriesLink,
} from './_hooks'
import { SearchInput } from '../../../components/table/search-input'

const GeometriesDeleteAction = ({
  geometries,
}: {
  geometries: GeometriesListItem
}) => {
  const deleteGeometries = useDeleteGeometries(geometries.id)

  return (
    <TableRowDeleteAction
      entityName="boundary"
      itemName={geometries.name}
      mutation={deleteGeometries}
    />
  )
}

const GeometriesFeature = () => {
  const { access } = useAccessControl()
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
    return ['description', 'updatedAt'] as const
  }, [])
  const activeFilters = useMemo(() => {
    if (!geographicBounds) {
      return []
    }

    return [
      {
        id: 'geography',
        label: 'Area',
        value: formatBoundsLabel(geographicBounds),
        onClear: () => setSearchParams(toGeographicBoundsQuery(null)),
      },
    ]
  }, [geographicBounds, setSearchParams])

  return (
    <div className="flex flex-col gap-6">
      <ConsolePageHeader breadcrumbs={<GeometriesBreadcrumbs />} />
      <ConsoleCrudListFrame
        title="Boundaries"
        description="Create and manage boundaries in the system."
        actions={<GeometriesCreateAction />}
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
              placeholder="Search boundaries"
              value={query?.search ?? ''}
              onChange={(e) => setSearchParams({ search: e.target.value })}
            />
            <TableFilterPopover activeFilters={activeFilters}>
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
          title="Boundaries"
          itemLink={geometriesLink}
          itemActionLabel="Edit"
          showEditAction={false}
          canModifyItem={(geometries) =>
            canEditConsoleResource({
              access,
              resource: 'geometries',
              resourceData: geometries,
            })
          }
          deleteAction={(geometries) => (
            <GeometriesDeleteAction geometries={geometries} />
          )}
          query={query}
          onSortChange={setSearchParams}
        />
      </ConsoleCrudListFrame>
    </div>
  )
}

export default GeometriesFeature
