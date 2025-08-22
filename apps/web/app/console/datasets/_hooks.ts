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

const datasetParamsSchema = z.object({
  datasetId: z.string().optional(),
  datasetRunId: z.string().optional(),
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

export const useDatasetRuns = (_datasetId?: string) => {
  const params = useParams()
  const { datasetId } = _datasetId
    ? { datasetId: _datasetId }
    : datasetParamsSchema.parse(params)

  const [isOpen, setOpen] = useState(false)
  const [page, setPage] = useState(1)

  const { data } = useQuery({
    queryKey: [QueryKey.DatasetRun],
    queryFn: async () => {
      if (!datasetId) return null
      const res = client.api.v1['dataset'][':id']['runs'].$get({
        query: {
          page: page.toString(),
        },
        param: {
          id: datasetId,
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
  const params = useParams()
  const { datasetId } = id
    ? { datasetId: id }
    : datasetParamsSchema.parse(params)

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

export const useDatasetRun = (_datasetRunId?: string) => {
  const params = useParams()
  const { datasetRunId } = _datasetRunId
    ? { datasetRunId: _datasetRunId }
    : datasetParamsSchema.parse(params)

  return useQuery({
    queryKey: [QueryKey.DatasetRun, datasetRunId],
    queryFn: async () => {
      if (!datasetRunId) return null
      const res = client.api.v1['dataset-run'][':id'].$get({
        param: {
          id: datasetRunId,
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

export const useCreateDatasetRun = () => {
  return useMutation({
    mutationFn: async (data: CreateDatasetRunPayload) => {
      const res = client.api.v1['dataset-run'].$post({
        json: data,
      })
      await unwrapResponse(res)
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

export const useUpdateDatasetRun = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: { id: string } & UpdateDatasetRunPayload) => {
      const res = client.api.v1['dataset-run'][':id'].$patch({
        param: { id },
        json: payload,
      })
      return await unwrapResponse(res)
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: [QueryKey.DatasetRun, id],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.DatasetRun],
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

export const useDeleteDatasetRun = (redirect: string | null = null) => {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async (datasetRun: DatasetRun) => {
      const res = client.api.v1['dataset-run'][':id'].$delete({
        param: {
          id: datasetRun.id,
        },
      })

      await unwrapResponse(res)
      return datasetRun
    },
    onSuccess: (datasetRun) => {
      queryClient.invalidateQueries({
        queryKey: [QueryKey.DatasetRun],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Dataset, datasetRun.id],
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

export const useDatasetRunLink = () =>
  useCallback(
    (datasetRun: Pick<DatasetRun, 'id' | 'dataset'>) =>
      `/console/datasets/${datasetRun.dataset.id}/runs/${datasetRun.id}`,
    [],
  )

export const useDatasetRunsLink = () =>
  useCallback(
    (dataset: Pick<Dataset, 'id'>) => `/console/datasets/${dataset.id}/runs`,
    [],
  )
