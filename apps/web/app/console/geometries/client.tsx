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
import Pagination from '~/components/pagination'
import CrudFormDialog from '../../../components/crud-form-dialog'
import BaseCrudTable from '../../../components/crud-table'
import { GeometriesButton } from './_components/geometries-button'
import {
  useAllGeometries,
  useCreateGeometries,
  useGeometriesLink,
} from './_hooks'
import { createGeometriesSchema } from '@repo/server/schemas/zod'

const GeometriesFeature = () => {
  const { data, page, setPage } = useAllGeometries()
  const createGeometries = useCreateGeometries()
  const geometriesLink = useGeometriesLink()

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
      <div className="mt-8">
        <BaseCrudTable
          data={data?.data || []}
          baseColumns={baseColumns}
          title="Geometries"
          itemLink={geometriesLink}
          itemButton={(geometries) => (
            <GeometriesButton geometries={geometries} />
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

export default GeometriesFeature
