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
import { ColumnDef } from '@tanstack/react-table'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import CrudFormDialog from '../../../../../../components/form/crud-form-dialog'
import BaseCrudTable from '../../../../../../components/table/crud-table'
import Pagination from '../../../../../../components/table/pagination'
import { SearchInput } from '../../../../../../components/table/search-input'
import { useAccessControl } from '../../../../../../hooks/useAccessControl'
import { GeojsonImportDialog } from '../../../_components/geojson-import'
import { GeometryOutputButton } from '../../../_components/geometry-output-button'
import { ResourcePageState } from '../../../../_components/resource-page-state'
import {
  GeometryOutputListItem,
  useCreateGeometryOutput,
  useGeometriesRun,
  useGeometryOutputLink,
  useGeometryOutputs,
} from '../../../_hooks'
import { canManageConsoleChildResource } from '../../../../../../utils/access-control'

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

  const baseColumns = useMemo(() => {
    return ['createdAt', 'name'] as const
  }, [])

  const columns = useMemo(() => [] as ColumnDef<GeometryOutputListItem>[], [])

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
      <div>
        <div className="flex justify-between">
          <h1 className="text-3xl font-medium mb-2">Geometry Outputs</h1>
          <div className="flex items-center gap-3">
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
                            : field.value
                        }
                        onChange={(e) => {
                          try {
                            field.onChange(JSON.parse(e.target.value))
                          } catch (error) {
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
        </div>
        <div>
          <SearchInput
            placeholder="Search geometry outputs"
            value={query?.search ?? ''}
            onChange={(e) => setSearchParams({ search: e.target.value })}
          />
          <BaseCrudTable
            data={data?.data || []}
            isLoading={isLoading}
            baseColumns={baseColumns}
            extraColumns={columns}
            title="GeometryOutput"
            itemLink={geometryOutputLink}
            itemButton={(geometryOutput) => (
              <GeometryOutputButton geometryOutput={geometryOutput} />
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

export default GeometryOutputFeature
