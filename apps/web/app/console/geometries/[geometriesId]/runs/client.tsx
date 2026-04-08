'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { createGeometriesRunSchema } from '@repo/schemas/crud'
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
import CrudFormDialog from '../../../../../components/form/crud-form-dialog'
import { CrudFormRunFields } from '../../../../../components/form/crud-form-run-fields'
import BaseCrudTable from '../../../../../components/table/crud-table'
import { SearchInput } from '../../../../../components/table/search-input'
import { useAccessControl } from '../../../../../hooks/useAccessControl'
import {
  GeographicBoundsPickerDialog,
  getGeographicBoundsFromQuery,
  toGeographicBoundsQuery,
} from '../../../_components/geographic-bounds-picker-dialog'
import { GeometriesRunButton } from '../../_components/geometries-run-button'
import { ResourcePageState } from '../../../_components/resource-page-state'
import {
  GeometriesRunListItem,
  useCreateGeometriesRun,
  useGeometries,
  useGeometriesRunLink,
  useGeometriesRuns,
} from '../../_hooks'
import { canManageConsoleChildResource } from '../../../../../utils/access-control'

const GeometriesRunFeature = () => {
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
  const { access } = useAccessControl()
  const canEdit = canManageConsoleChildResource({
    access,
    resourceData: geometries,
  })
  const geographicBounds = getGeographicBoundsFromQuery(query)

  const baseColumns = useMemo(() => {
    return ['createdAt', 'updatedAt'] as const
  }, [])

  // Add column to show mainfile badge if geometries.mainRunId === geometriesRun.id
  const columns = useMemo(() => {
    return [
      // {
      //   header: 'Number of outputs',
      //   cell: ({ row }) => {
      //     return <div>{row.original.outputCount}</div>
      //   },
      // },
    ] satisfies ColumnDef<GeometriesRunListItem>[]
  }, [])

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
      errorMessage="Failed to load geometries"
      isLoading={geometriesQuery.isLoading}
      loadingMessage="Loading geometries"
      notFoundMessage="Geometries not found"
    >
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-medium mb-2">Geometries Runs</h1>

          <CrudFormDialog
            form={form}
            mutation={createGeometriesRun}
            buttonText="Add Geometries Run"
            entityName="Geometries Run"
            entityNamePlural="geometries runs"
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
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CrudFormDialog>
        </div>
        <div>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <SearchInput
              placeholder="Search geometries runs"
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
            extraColumns={columns}
            title="GeometriesRun"
            itemLink={geometriesLink}
            itemButton={(geometriesRun) => (
              <GeometriesRunButton geometriesRun={geometriesRun} />
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
    </ResourcePageState>
  )
}

export default GeometriesRunFeature
