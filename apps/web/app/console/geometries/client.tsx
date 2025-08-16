'use client'

import { Button } from '@repo/ui/components/ui/button'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import Pagination from '~/components/pagination'
import { client, QueryKey, unwrapResponse } from '~/utils/fetcher'
import BaseCrudTable from '../../../components/crud-table'
import GeometriesForm from './_components/form'
import { InferResponseType } from 'hono/client'

type Geometries = NonNullable<
  InferResponseType<typeof client.api.v1.geometries.$get, 200>['data']
>['data'][0]

const GeometriesFeature = () => {
  const [isOpen, setOpen] = useState(false)
  const [page, setPage] = useState(1)

  const { data } = useQuery({
    queryKey: [QueryKey.Geometries],
    queryFn: async () => {
      const res = client.api.v1.geometries.$get({
        query: {
          page: page.toString(),
        },
      })

      const json = await unwrapResponse(res)

      return json.data
    },
    placeholderData: keepPreviousData,
  })

  const deleteGeometries = useCallback(async (geometries: Geometries) => {
    const res = client.api.v1.geometries[':id'].$delete({
      param: {
        id: geometries.id,
      },
    })

    await unwrapResponse(res)
  }, [])

  const geometriesLink = useCallback(
    (geometries: Geometries) => `/console/geometries/${geometries.id}`,
    [],
  )

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
          queryKey={QueryKey.Geometries}
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
