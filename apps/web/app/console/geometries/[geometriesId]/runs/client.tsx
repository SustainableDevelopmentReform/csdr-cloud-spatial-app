'use client'

import { Button } from '@repo/ui/components/ui/button'
import { ColumnDef, createColumnHelper } from '@tanstack/react-table'
import { useEffect, useMemo } from 'react'
import Pagination from '~/components/pagination'
import BaseCrudTable from '../../../../../components/crud-table'

import { baseFormSchema } from '../../../../../components/crud-form'
import CrudFormDialog from '../../../../../components/crud-form-dialog'
import { GeometriesRunButton } from '../../_components/geometries-run-button'
import {
  GeometriesRunListItem,
  useCreateGeometriesRun,
  useGeometries,
  useGeometriesRunLink,
  useGeometriesRuns,
} from '../../_hooks'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/ui/form'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@repo/ui/components/ui/select'

const columnHelper = createColumnHelper<GeometriesRunListItem>()

const createGeometriesRunSchema = baseFormSchema.extend({
  geometriesId: z.string(),
})

const GeometriesRunFeature = () => {
  const { data, page, setPage } = useGeometriesRuns()
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
      <div className="flex justify-between">
        <h1 className="text-3xl font-medium mb-2">Geometries Runs</h1>
        <CrudFormDialog
          form={form}
          mutation={createGeometriesRun}
          buttonText="Add Geometries Run"
          entityName="Geometries Run"
          entityNamePlural="geometries runs"
        >
          <FormField
            control={form.control}
            name="dataType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data Type</FormLabel>
                <Select {...field} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="geoparquet">Geoparquet</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </CrudFormDialog>
      </div>
      <div className="mt-8">
        <BaseCrudTable
          data={data?.data || []}
          baseColumns={baseColumns}
          extraColumns={columns}
          title="GeometriesRun"
          itemLink={geometriesLink}
          itemButton={(geometriesRun) => (
            <GeometriesRunButton geometriesRun={geometriesRun} />
          )}
        />
        <Pagination
          className="justify-end mt-4"
          totalPages={data?.pageCount ?? 1}
          currentPage={page}
          onPageChange={setPage}
        />
      </div>
    </div>
  )
}

export default GeometriesRunFeature
