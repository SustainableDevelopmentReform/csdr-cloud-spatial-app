'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { createGeometriesRunSchema, deriveRunStatus } from '@repo/schemas/crud'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/ui/form'
import { Input } from '@repo/ui/components/ui/input'
import { ColumnDef } from '@tanstack/react-table'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import Pagination from '~/components/table/pagination'
import {
  ActiveTableFilter,
  TableFilterPopover,
} from '~/components/table/filter-popover'
import CrudFormDialog from '../../../../../components/form/crud-form-dialog'
import { CrudFormRunFields } from '../../../../../components/form/crud-form-run-fields'
import BaseCrudTable from '../../../../../components/table/crud-table'
import { TableRowDeleteAction } from '../../../../../components/table/table-row-delete-action'
import { SearchInput } from '../../../../../components/table/search-input'
import { useAccessControl } from '../../../../../hooks/use-access-control'
import { ConsoleCrudListFrame } from '../../../_components/console-crud-list-frame'
import { getEditModeHref } from '../../../_components/resource-detail-mode'
import {
  formatBoundsLabel,
  GeographicBoundsPickerDialog,
  getGeographicBoundsFromQuery,
  toGeographicBoundsQuery,
} from '../../../_components/geographic-bounds-picker-dialog'
import { ResourcePageState } from '../../../_components/resource-page-state'
import { useRunVersionSidebar } from '../../../_components/run-version-sidebar'
import { VersionStatusBadge } from '../../../_components/version-status-badge'
import {
  GeometriesRunListItem,
  useCreateGeometriesRun,
  useDeleteGeometriesRun,
  useGeometries,
  useGeometriesRunLink,
  useGeometriesRuns,
} from '../../_hooks'
import { canManageConsoleChildResource } from '../../../../../utils/access-control'

const GeometriesRunDeleteAction = ({
  geometriesRun,
}: {
  geometriesRun: GeometriesRunListItem
}) => {
  const deleteGeometriesRun = useDeleteGeometriesRun(geometriesRun.id)

  return (
    <TableRowDeleteAction
      entityName="boundary run"
      itemName={geometriesRun.name}
      mutation={deleteGeometriesRun}
    />
  )
}

const GeometriesRunFeature = ({ embedded = false }: { embedded?: boolean }) => {
  const {
    data,
    query,
    setSearchParams,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
  } = useGeometriesRuns(undefined, undefined, true)
  const geometriesQuery = useGeometries()
  const geometries = geometriesQuery.data
  const createGeometriesRun = useCreateGeometriesRun()
  const geometriesLink = useGeometriesRunLink()
  const runVersionSidebar = useRunVersionSidebar()
  const selectedRun = runVersionSidebar?.selectedRun
  const selectedGeometriesRunId =
    selectedRun?.type === 'geometries' ? selectedRun.id : null
  const openGeometriesRunVersion = runVersionSidebar
    ? (geometriesRun: GeometriesRunListItem) => {
        runVersionSidebar.openRunVersion({
          id: geometriesRun.id,
          type: 'geometries',
        })
      }
    : undefined
  const { access } = useAccessControl()
  const canEdit = canManageConsoleChildResource({
    access,
    resourceData: geometries,
  })
  const geographicBounds = getGeographicBoundsFromQuery(query)

  const baseColumns = useMemo(() => {
    return ['description', 'updatedAt'] as const
  }, [])

  const columns = useMemo(() => {
    return [
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = deriveRunStatus({
            latestRunCreatedAt: geometries?.mainRun?.createdAt,
            latestRunId: geometries?.mainRunId,
            runCreatedAt: row.original.createdAt,
            runId: row.original.id,
          })

          return <VersionStatusBadge status={status} />
        },
        size: 160,
      },
    ] satisfies ColumnDef<GeometriesRunListItem>[]
  }, [geometries?.mainRun?.createdAt, geometries?.mainRunId])
  const activeFilters = useMemo<ActiveTableFilter[]>(() => {
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

  const form = useForm({
    resolver: zodResolver(createGeometriesRunSchema),
  })

  useEffect(() => {
    if (geometries) {
      form.setValue('geometriesId', geometries.id)
    }
  }, [form, geometries])

  return (
    <ResourcePageState
      error={geometriesQuery.error}
      errorMessage="Failed to load boundaries"
      isLoading={geometriesQuery.isLoading}
      loadingMessage="Loading boundaries"
      notFoundMessage="Boundaries not found"
    >
      <ConsoleCrudListFrame
        title="Boundary Runs"
        description="Create and manage runs for this boundary set."
        actions={
          <CrudFormDialog
            form={form}
            mutation={createGeometriesRun}
            buttonText="Add Boundary Run"
            entityName="Boundary Run"
            entityNamePlural="boundary runs"
            hiddenFields={['visibility']}
            hideTrigger={!canEdit}
          >
            <CrudFormRunFields form={form} />
            <FormField
              control={form.control}
              name={'dataPmtilesUrl'}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data PMTiles URL</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CrudFormDialog>
        }
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
              placeholder="Search boundary runs"
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
          extraColumns={columns}
          sortOptions={['name', 'createdAt', 'updatedAt']}
          title="BoundaryRun"
          itemLink={geometriesLink}
          itemAction={openGeometriesRunVersion}
          editLink={(geometriesRun) =>
            getEditModeHref(geometriesLink(geometriesRun))
          }
          canModifyItem={() => canEdit}
          stickyColumnClassName={embedded ? 'bg-white' : undefined}
          selectedItemId={selectedGeometriesRunId}
          deleteAction={(geometriesRun) => (
            <GeometriesRunDeleteAction geometriesRun={geometriesRun} />
          )}
          query={query}
          onSortChange={setSearchParams}
        />
      </ConsoleCrudListFrame>
    </ResourcePageState>
  )
}

export default GeometriesRunFeature
