import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { InferRequestType, InferResponseType } from 'hono/client'
import { useCallback, useState } from 'react'
import { z } from 'zod'
import { client, QueryKey, unwrapResponse } from '~/utils/fetcher'
import { useParams, useRouter } from 'next/navigation'

export type Dataset = NonNullable<
  InferResponseType<typeof client.api.v1.dataset.$get, 200>['data']
>['data'][0]
export type DatasetRun = NonNullable<
  InferResponseType<
    (typeof client.api.v1)['dataset-run'][':id']['$get'],
    200
  >['data']
>

export type UpdateDatasetPayload = NonNullable<
  InferRequestType<(typeof client.api.v1.dataset)[':id']['$patch']>['json']
>
export type UpdateDatasetRunPayload = NonNullable<
  InferRequestType<
    (typeof client.api.v1)['dataset-run'][':id']['$patch']
  >['json']
>

export type CreateDatasetPayload = NonNullable<
  InferRequestType<(typeof client.api.v1.dataset)['$post']>['json']
>
export type CreateDatasetRunPayload = NonNullable<
  InferRequestType<(typeof client.api.v1)['dataset-run']['$post']>['json']
>

const datasetIdSchema = z.object({
  datasetId: z.string().optional(),
})

export const useDatasets = () => {
  const [isOpen, setOpen] = useState(false)
  const [page, setPage] = useState(1)

  const { data } = useQuery({
    queryKey: [QueryKey.Dataset],
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

  return {
    data,
    isOpen,
    setOpen,
    page,
    setPage,
  }
}

export const useDataset = (id?: string) => {
  const { datasetId } = id
    ? { datasetId: id }
    : datasetIdSchema.parse(useParams())

  return useQuery({
    queryKey: [QueryKey.Dataset, datasetId],
    queryFn: async () => {
      if (!datasetId) return null
      const res = client.api.v1.dataset[':id'].$get({
        param: {
          id: datasetId,
        },
      })

      const json = await unwrapResponse(res)

      return json.data
    },
    placeholderData: keepPreviousData,
  })
}

export const useCreateDataset = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateDatasetPayload) => {
      const res = client.api.v1.dataset.$post({
        json: data,
      })
      await unwrapResponse(res)

      queryClient.invalidateQueries({
        queryKey: [QueryKey.Dataset],
      })
    },
  })
}

export const useUpdateDataset = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: { id: string } & UpdateDatasetPayload) => {
      const res = client.api.v1.dataset[':id'].$patch({
        param: { id },
        json: payload,
      })
      return await unwrapResponse(res)
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Dataset, id],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Dataset],
      })
    },
  })
}
export const useDeleteDataset = (redirect: string | null = null) => {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async (dataset: Dataset) => {
      const res = client.api.v1.dataset[':id'].$delete({
        param: {
          id: dataset.id,
        },
      })

      await unwrapResponse(res)
      return dataset
    },
    onSuccess: (dataset) => {
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Dataset],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Dataset, dataset.id],
      })
      if (redirect) {
        router.push(redirect)
      }
    },
  })
}

export const useDatasetLink = () =>
  useCallback(
    (dataset: Pick<Dataset, 'id'>) => `/console/datasets/${dataset.id}`,
    [],
  )
