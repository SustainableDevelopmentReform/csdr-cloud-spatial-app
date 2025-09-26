'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/ui/form'
import { Textarea } from '@repo/ui/components/ui/textarea'
import { cn } from '@repo/ui/lib/utils'
import { ColumnDef, createColumnHelper } from '@tanstack/react-table'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import Pagination from '~/components/pagination'
import CrudFormDialog from '../../../../../../../components/crud-form-dialog'
import BaseCrudTable from '../../../../../../../components/crud-table'
import { GeometryOutputButton } from '../../../../_components/geometry-output-button'
import {
  GeometryOutputListItem,
  useCreateGeometryOutput,
  useGeometriesLink,
  useGeometriesRun,
  useGeometryOutputLink,
  useGeometryOutputs,
} from '../../../../_hooks'
import { createGeometryOutputSchema } from '@repo/server/schemas/zod'

const columnHelper = createColumnHelper<GeometryOutputListItem>()

const GeometryOutputFeature = () => {
  const { data, page, setPage } = useGeometryOutputs()
  const createGeometryOutput = useCreateGeometryOutput()
  const { data: geometriesRun } = useGeometriesRun()
  const geometryOutputLink = useGeometryOutputLink()
  const geometriesLink = useGeometriesLink()

  const baseColumns = useMemo(() => {
    return ['createdAt', 'name'] as const
  }, [])

  const columns = useMemo(
    () => [] as ColumnDef<GeometryOutputListItem>[],
    [geometriesLink],
  )

  const form = useForm({
    resolver: zodResolver(createGeometryOutputSchema),
  })

  useEffect(() => {
    if (geometriesRun) {
      form.setValue('geometriesRunId', geometriesRun.id)
    }
  }, [geometriesRun])

  return (
    <div>
      <div className="flex justify-between">
        <h1 className="text-3xl font-medium mb-2">Geometry Runs</h1>
        <CrudFormDialog
          form={form}
          mutation={createGeometryOutput}
          buttonText="Add Geometry Output"
          hiddenFields={['id']}
          entityName="Geometry Output"
          entityNamePlural="geometry outputs"
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
      <div className="mt-8">
        <BaseCrudTable
          data={data?.data || []}
          baseColumns={baseColumns}
          extraColumns={columns}
          title="GeometryOutput"
          itemLink={geometryOutputLink}
          itemButton={(geometryOutput) => (
            <GeometryOutputButton geometryOutput={geometryOutput} />
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

export default GeometryOutputFeature
