'use client'

import { Button } from '@repo/ui/components/ui/button'
import { ColumnDef, createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import Pagination from '~/components/pagination'
import BaseCrudTable from '../../../../../components/crud-table'
import { MainRunBadge } from '../../../_components/main-run-badge'
import GeometriesRunForm from '../../_components/form'
import {
  GeometriesRunListItem,
  useGeometries,
  useGeometriesRunLink,
  useGeometriesRuns,
  useDeleteGeometriesRun,
} from '../../_hooks'
import { GeometriesRunButton } from '../../_components/geometries-run-button'

const columnHelper = createColumnHelper<GeometriesRunListItem>()

const GeometriesRunFeature = () => {
  const { data, isOpen, setOpen, page, setPage } = useGeometriesRuns()
  const { data: geometries } = useGeometries()

  const deleteGeometriesRun = useDeleteGeometriesRun()
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

  return (
    <div>
      <div className="flex justify-between">
        <h1 className="text-3xl font-medium mb-2">Geometries Runs</h1>
        <GeometriesRunForm
          key={`add-geometries-form-${isOpen}`}
          isOpen={isOpen}
          onOpen={() => setOpen(true)}
          onClose={() => setOpen(false)}
        >
          <Button>Add Geometries Run</Button>
        </GeometriesRunForm>
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
