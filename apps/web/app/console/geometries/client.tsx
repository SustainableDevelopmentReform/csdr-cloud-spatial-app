'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/ui/form'
import { Input } from '@repo/ui/components/ui/input'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import Pagination from '~/components/table/pagination'
import CrudFormDialog from '../../../components/form/crud-form-dialog'
import BaseCrudTable from '../../../components/table/crud-table'
import { useAccessControl } from '../../../hooks/useAccessControl'
import {
  GeographicBoundsPickerDialog,
  getGeographicBoundsFromQuery,
  toGeographicBoundsQuery,
} from '../_components/geographic-bounds-picker-dialog'
import { GeometriesButton } from './_components/geometries-button'
import {
  useAllGeometries,
  useCreateGeometries,
  useGeometriesLink,
} from './_hooks'
import { createGeometriesSchema } from '@repo/schemas/crud'
import { SearchInput } from '../../../components/table/search-input'
import { canCreateConsoleResource } from '../../../utils/access-control'

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
  const createGeometries = useCreateGeometries()
  const { access } = useAccessControl()
  const geometriesLink = useGeometriesLink()
  const geographicBounds = getGeographicBoundsFromQuery(query)

  const baseColumns = useMemo(() => {
    return ['description', 'createdAt', 'updatedAt'] as const
  }, [])

  const form = useForm({
    resolver: zodResolver(createGeometriesSchema),
  })

  return (
    <div>
      <div className="flex justify-between">
        <h1 className="text-3xl font-medium mb-2">Geometries</h1>
        <CrudFormDialog
          form={form}
          mutation={createGeometries}
          buttonText="Add Geometries"
          entityName="Geometries"
          entityNamePlural="geometries sets"
          hideTrigger={!canCreateConsoleResource(access, 'geometries')}
        >
          <FormField
            control={form.control}
            name={'sourceUrl'}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Source URL</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={'sourceMetadataUrl'}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Source Metadata URL</FormLabel>
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
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <SearchInput
            placeholder="Search geometries"
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
          title="Geometries"
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
