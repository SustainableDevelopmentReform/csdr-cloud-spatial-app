'use client'

import { Button } from '@repo/ui/components/ui/button'
import DatasetTable from './_components/table'
import DatasetForm from './_components/form'
import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { client, QueryKey, unwrapResponse } from '~/utils/fetcher'
import Pagination from '~/components/pagination'

const DatasetFeature = () => {
  const [isOpen, setOpen] = useState(false)
  const [page, setPage] = useState(1)

  const { data } = useQuery({
    queryKey: [QueryKey.Datasets, page],
    queryFn: async () => {
      const res = client.api.v1.dataset.$get({
        query: {
          page: page.toString(),
        },
      })

      const json = await unwrapResponse(res)

      return json.data
    },
    placeholderData: keepPreviousData,
  })

  return (
    <div>
      <div className="flex justify-between">
        <h1 className="text-3xl font-medium mb-2">Datasets</h1>
        <DatasetForm
          key={`add-dataset-form-${isOpen}`}
          isOpen={isOpen}
          onOpen={() => setOpen(true)}
          onClose={() => setOpen(false)}
        >
          <Button>Add Dataset</Button>
        </DatasetForm>
      </div>
      <div className="mt-8">
        <DatasetTable data={data?.data || []} />
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

export default DatasetFeature
