'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { createGeometryOutputSchema } from '@repo/schemas/crud'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/ui/form'
import { Textarea } from '@repo/ui/components/ui/textarea'
import { cn } from '@repo/ui/lib/utils'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import CrudFormDialog from '../../../../../../components/form/crud-form-dialog'
import BaseCrudTable from '../../../../../../components/table/crud-table'
import Pagination from '../../../../../../components/table/pagination'
import { SearchInput } from '../../../../../../components/table/search-input'
import {
  ActiveTableFilter,
  TableFilterPopover,
} from '../../../../../../components/table/filter-popover'
import { TableRowDeleteAction } from '../../../../../../components/table/table-row-delete-action'
import { useAccessControl } from '../../../../../../hooks/useAccessControl'
import { ConsoleCrudListFrame } from '../../../../_components/console-crud-list-frame'
import {
  formatBoundsLabel,
  GeographicBoundsPickerDialog,
  getGeographicBoundsFromQuery,
  toGeographicBoundsQuery,
} from '../../../../_components/geographic-bounds-picker-dialog'
import { GeojsonImportDialog } from '../../../_components/geojson-import'
import { ResourcePageState } from '../../../../_components/resource-page-state'
import {
  GeometryOutputListItem,
  useCreateGeometryOutput,
  useDeleteGeometryOutput,
  useGeometriesRun,
  useGeometryOutputLink,
  useGeometryOutputs,
} from '../../../_hooks'
import { canManageConsoleChildResource } from '../../../../../../utils/access-control'

const GeometryOutputDeleteAction = ({
  geometryOutput,
}: {
  geometryOutput: GeometryOutputListItem
}) => {
  const deleteGeometryOutput = useDeleteGeometryOutput(geometryOutput.id)

  return (
    <TableRowDeleteAction
      entityName="geometry output"
      itemName={geometryOutput.name}
      mutation={deleteGeometryOutput}
    />
  )
}

const GeometryOutputFeature = () => {
  const {
    data,
    query,
    setSearchParams,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
  } = useGeometryOutputs(undefined, undefined, true)
  const createGeometryOutput = useCreateGeometryOutput()
  const geometriesRunQuery = useGeometriesRun()
  const geometriesRun = geometriesRunQuery.data
  const geometryOutputLink = useGeometryOutputLink()
  const { access } = useAccessControl()
  const canEdit = canManageConsoleChildResource({
    access,
    resourceData: geometriesRun,
  })
  const geographicBounds = getGeographicBoundsFromQuery(query)

  const baseColumns = useMemo(() => {
    return ['description', 'updatedAt'] as const
  }, [])
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
    if (geometriesRun) {
      form.setValue('geometriesRunId', geometriesRun.id)
    }
  }, [form, geometriesRun])

  return (
    <ResourcePageState
      error={geometriesRunQuery.error}
      errorMessage="Failed to load geometries run"
      isLoading={geometriesRunQuery.isLoading}
      loadingMessage="Loading geometries run"
      notFoundMessage="Geometries run not found"
    >
      <ConsoleCrudListFrame
        title="Geometry Outputs"
        description="Create and manage geometry outputs for this run."
        actions={
          <>
            {geometriesRun?.id && canEdit ? (
              <GeojsonImportDialog geometriesRunId={geometriesRun.id} />
            ) : null}
            <CrudFormDialog
              form={form}
              mutation={createGeometryOutput}
              buttonText="Add Geometry Output"
              entityName="Geometry Output"
              entityNamePlural="geometry outputs"
              hiddenFields={['visibility']}
              hideTrigger={!canEdit}
            >
              <FormField
                control={form.control}
                name={'geometry'}
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Geometry</FormLabel>
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
          </>
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
              placeholder="Search geometry outputs"
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
          title="GeometryOutput"
          itemLink={geometryOutputLink}
          canModifyItem={() => canEdit}
          deleteAction={(geometryOutput) => (
            <GeometryOutputDeleteAction geometryOutput={geometryOutput} />
          )}
          query={query}
          onSortChange={setSearchParams}
        />
      </ConsoleCrudListFrame>
    </ResourcePageState>
  )
}

export default GeometryOutputFeature
