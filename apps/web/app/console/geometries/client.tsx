'use client'

import { Button } from '@repo/ui/components/ui/button'
import { useMemo } from 'react'
import Pagination from '~/components/pagination'
import { baseFormSchema } from '../../../components/crud-form'
import CrudFormDialog from '../../../components/crud-form-dialog'
import BaseCrudTable from '../../../components/crud-table'
import { GeometriesButton } from './_components/geometries-button'
import {
  useAllGeometries,
  useCreateGeometries,
  useGeometriesLink,
} from './_hooks'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const GeometriesFeature = () => {
  const { data, page, setPage } = useAllGeometries()
  const createGeometries = useCreateGeometries()
  const geometriesLink = useGeometriesLink()

  const baseColumns = useMemo(() => {
    return ['description', 'createdAt', 'updatedAt'] as const
  }, [])

  const form = useForm({
    resolver: zodResolver(baseFormSchema),
  })

  return (
    <div>
      <div className="flex justify-between">
        <h1 className="text-3xl font-medium mb-2">Geometries</h1>
        <CrudFormDialog
          form={form}
          mutation={createGeometries}
          buttonText="Add Geometries"
        />
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
