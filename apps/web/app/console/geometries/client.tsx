'use client'

import { Button } from '@repo/ui/components/ui/button'
import { useMemo } from 'react'
import Pagination from '~/components/pagination'
import BaseCrudTable from '../../../components/crud-table'
import GeometriesForm from './_components/form'
import {
  useGeometriesLink,
  useDeleteGeometries,
  useAllGeometries,
} from './_hooks'

const GeometriesFeature = () => {
  const { data, isOpen, setOpen, page, setPage } = useAllGeometries()

  const deleteGeometries = useDeleteGeometries()
  const geometriesLink = useGeometriesLink()

  const baseColumns = useMemo(() => {
    return ['name', 'description', 'createdAt', 'updatedAt'] as const
  }, [])

  return (
    <div>
      <div className="flex justify-between">
        <h1 className="text-3xl font-medium mb-2">Geometries</h1>
        <GeometriesForm
          key={`add-geometries-form-${isOpen}`}
          isOpen={isOpen}
          onOpen={() => setOpen(true)}
          onClose={() => setOpen(false)}
        >
          <Button>Add Geometries</Button>
        </GeometriesForm>
      </div>
      <div className="mt-8">
        <BaseCrudTable
          data={data?.data || []}
          baseColumns={baseColumns}
          title="Geometries"
          deleteItem={deleteGeometries}
          itemLink={geometriesLink}
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
