'use client'

import { Button } from '@repo/ui/components/ui/button'
import { ColumnDef, createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import Pagination from '~/components/pagination'
import BaseCrudTable from '../../../../../../../components/crud-table'
import GeometryOutputForm from '../../../../_components/form'
import {
  GeometryOutput,
  useGeometriesLink,
  useGeometryOutputLink,
  useGeometryOutputs,
} from '../../../../_hooks'
import { GeometryOutputButton } from '../../../../_components/geometries-output-button'

const columnHelper = createColumnHelper<GeometryOutput>()

const GeometryOutputFeature = () => {
  const { data, isOpen, setOpen, page, setPage } = useGeometryOutputs()

  const geometryOutputLink = useGeometryOutputLink()
  const geometriesLink = useGeometriesLink()

  const baseColumns = useMemo(() => {
    return ['createdAt', 'name'] as const
  }, [])

  const columns = useMemo(
    () => [] as ColumnDef<GeometryOutput>[],
    [geometriesLink],
  )

  return (
    <div>
      <div className="flex justify-between">
        <h1 className="text-3xl font-medium mb-2">Geometry Runs</h1>
        <GeometryOutputForm
          key={`add-geometry-form-${isOpen}`}
          isOpen={isOpen}
          onOpen={() => setOpen(true)}
          onClose={() => setOpen(false)}
        >
          <Button>Add Geometry Run</Button>
        </GeometryOutputForm>
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
