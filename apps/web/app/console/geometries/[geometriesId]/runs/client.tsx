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
import { ColumnDef, createColumnHelper } from '@tanstack/react-table'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import Pagination from '~/components/table/pagination'
import CrudFormDialog from '../../../../../components/form/crud-form-dialog'
import { CrudFormRunFields } from '../../../../../components/form/crud-form-run-fields'
import BaseCrudTable from '../../../../../components/table/crud-table'
import { SearchInput } from '../../../../../components/table/search-input'
import { GeometriesRunButton } from '../../_components/geometries-run-button'
import {
  GeometriesRunListItem,
  useCreateGeometriesRun,
  useGeometries,
  useGeometriesRunLink,
  useGeometriesRuns,
} from '../../_hooks'

const columnHelper = createColumnHelper<GeometriesRunListItem>()

const GeometriesRunFeature = () => {
  const {
    data,
    query,
    setSearchParams,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGeometriesRuns(undefined, undefined, true)
  const { data: geometries } = useGeometries()
  const createGeometriesRun = useCreateGeometriesRun()
  const geometriesLink = useGeometriesRunLink()

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
  }, [geometries])

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-medium mb-2">Geometries Runs</h1>

        <CrudFormDialog
          form={form}
          mutation={createGeometriesRun}
          buttonText="Add Geometries Run"
          entityName="Geometries Run"
          entityNamePlural="geometries runs"
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
        <SearchInput
          placeholder="Search geometries runs"
          value={query?.search ?? ''}
          onChange={(e) => setSearchParams({ search: e.target.value })}
        />
        <BaseCrudTable
          data={data?.data || []}
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
  )
}

export default GeometriesRunFeature
