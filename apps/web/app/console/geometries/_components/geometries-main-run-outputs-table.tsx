'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  createGeometryOutputSchema,
  geometryOutputQuerySchema,
} from '@repo/schemas/crud'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/ui/form'
import { Textarea } from '@repo/ui/components/ui/textarea'
import { cn } from '@repo/ui/lib/utils'
import { ColumnDef } from '@tanstack/react-table'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import BaseCrudTable from '../../../../components/table/crud-table'
import CrudFormDialog from '../../../../components/form/crud-form-dialog'
import Pagination from '../../../../components/table/pagination'
import { SearchInput } from '../../../../components/table/search-input'
import {
  ActiveTableFilter,
  TableFilterPopover,
} from '../../../../components/table/filter-popover'
import { TableRowDeleteAction } from '../../../../components/table/table-row-delete-action'
import {
  formatBoundsLabel,
  GeographicBoundsPickerDialog,
  getGeographicBoundsFromQuery,
  toGeographicBoundsQuery,
} from '../../_components/geographic-bounds-picker-dialog'
import { useConsoleSideDrawerStack } from '../../_components/console-side-drawer'
import { getEditModeHref } from '../../_components/resource-detail-mode'
import { GeojsonImportDialog } from './geojson-import'
import { GeometryOutputDetailsSidebar } from './geometry-output-details-sidebar'
import {
  GeometryOutputListItem,
  useCreateGeometryOutput,
  useDeleteGeometryOutput,
  useGeometryOutputLink,
  useGeometryOutputs,
} from '../_hooks'
import z from 'zod'

const GeometryOutputDeleteAction = ({
  geometryOutput,
}: {
  geometryOutput: GeometryOutputListItem
}) => {
  const deleteGeometryOutput = useDeleteGeometryOutput(geometryOutput.id)

  return (
    <TableRowDeleteAction
      entityName="boundary feature"
      itemName={geometryOutput.name}
      mutation={deleteGeometryOutput}
    />
  )
}

export function GeometriesMainRunOutputsTable({
  canEdit,
  showManagementActions = false,
  geometriesRunId,
}: {
  canEdit: boolean
  showManagementActions?: boolean
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
  } = useGeometryOutputs(geometriesRunId, undefined, true)
  const createGeometryOutput = useCreateGeometryOutput()
  const geometryOutputLink = useGeometryOutputLink()
  const { closeActiveDrawer } = useConsoleSideDrawerStack()
  const [selectedGeometryOutputId, setSelectedGeometryOutputId] = useState<
    string | null
  >(null)

  const closeGeometryOutputDetails = useCallback(() => {
    setSelectedGeometryOutputId(null)
  }, [])

  const openGeometryOutputDetails = useCallback(
    (geometryOutput: GeometryOutputListItem) => {
      closeActiveDrawer()
      setSelectedGeometryOutputId(geometryOutput.id)
    },
    [closeActiveDrawer],
  )

  const selectGeometryOutputDetails = useCallback(
    (geometryOutputId: string) => {
      setSelectedGeometryOutputId(geometryOutputId)
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
    resolver: zodResolver(createGeometryOutputSchema),
  })

  useEffect(() => {
    form.setValue('geometriesRunId', geometriesRunId)
  }, [form, geometriesRunId])

  const baseColumns = useMemo(() => {
    return ['description', 'updatedAt'] as const
  }, [])

  const columns = useMemo(() => [] as ColumnDef<GeometryOutputListItem>[], [])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <SearchInput
          className="w-full md:max-w-md"
          placeholder="Search boundary features"
          value={query?.search ?? ''}
          onChange={(e) => setSearchParams({ search: e.target.value })}
        />
        <div className="flex flex-wrap items-center justify-end gap-3">
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
          {showManagementActions && canEdit ? (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              <GeojsonImportDialog geometriesRunId={geometriesRunId} />
              <CrudFormDialog
                form={form}
                mutation={createGeometryOutput}
                buttonText="Add Boundary Feature"
                entityName="Boundary Feature"
                entityNamePlural="boundary features"
                hiddenFields={['visibility']}
              >
                <FormField
                  control={form.control}
                  name="geometry"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Boundary</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          className={cn('font-mono')}
                          value={
                            typeof field.value === 'object'
                              ? JSON.stringify(field.value, null, 2)
                              : (field.value ?? '')
                          }
                          onChange={(e) => {
                            try {
                              field.onChange(JSON.parse(e.target.value))
                            } catch {
                              fieldState.error = {
                                message: 'Invalid JSON',
                                type: 'custom',
                              }
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CrudFormDialog>
            </div>
          ) : null}
        </div>
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
        deleteAction={
          showManagementActions
            ? (geometryOutput) => (
                <GeometryOutputDeleteAction geometryOutput={geometryOutput} />
              )
            : undefined
        }
        query={{ sort: query?.sort, order: query?.order }}
        onSortChange={(next) => setSearchParams(next)}
      />
      <GeometryOutputDetailsSidebar
        geometryOutputId={selectedGeometryOutputId}
        onClose={closeGeometryOutputDetails}
        onGeometryOutputSelect={selectGeometryOutputDetails}
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
