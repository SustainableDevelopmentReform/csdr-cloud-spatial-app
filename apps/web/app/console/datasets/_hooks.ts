'use client'

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

export type DatasetListItem = NonNullable<
  InferResponseType<typeof client.api.v0.dataset.$get, 200>['data']
>['data'][0]
export type DatasetDetail = NonNullable<
  InferResponseType<(typeof client.api.v0.dataset)[':id']['$get'], 200>['data']
>

export type DatasetRunListItem = NonNullable<
  InferResponseType<
    (typeof client.api.v0.dataset)[':id']['runs']['$get'],
    200
  >['data']
>['data'][0]
export type DatasetRunDetail = NonNullable<
  InferResponseType<
    (typeof client.api.v0)['dataset-run'][':id']['$get'],
    200
  >['data']
>

export type UpdateDatasetPayload = NonNullable<
  InferRequestType<(typeof client.api.v0.dataset)[':id']['$patch']>['json']
>
export type UpdateDatasetRunPayload = NonNullable<
  InferRequestType<
    (typeof client.api.v0)['dataset-run'][':id']['$patch']
  >['json']
>

export type CreateDatasetPayload = NonNullable<
  InferRequestType<(typeof client.api.v0.dataset)['$post']>['json']
>
export type CreateDatasetRunPayload = NonNullable<
  InferRequestType<(typeof client.api.v0)['dataset-run']['$post']>['json']
>

const datasetParamsSchema = z.object({
  datasetId: z.string().optional(),
  datasetRunId: z.string().optional(),
})

export const useDatasetParams = (
  _datasetId?: string,
  _datasetRunId?: string,
) => {
  const params = useParams()
  const { datasetId, datasetRunId } = datasetParamsSchema.parse(params)

  return {
    datasetId: _datasetId ?? datasetId,
    datasetRunId: _datasetRunId ?? datasetRunId,
  }
}

export const useDatasets = () => {
  const [page, setPage] = useState(1)

  const { data } = useQuery({
    queryKey: [QueryKey.Dataset],
    queryFn: async () => {
      const res = client.api.v0.dataset.$get({
        query: {
          page,
        },
      })

      const json = await unwrapResponse(res)

      return json.data
    },
    placeholderData: keepPreviousData,
  })

  return {
    data,
    page,
    setPage,
  }
}

export const useDatasetRuns = (_datasetId?: string) => {
  const { datasetId } = useDatasetParams(_datasetId)

  const [page, setPage] = useState(1)

  const { data } = useQuery({
    queryKey: [QueryKey.DatasetRun, datasetId],
    queryFn: async () => {
      if (!datasetId) return null
      const res = client.api.v0['dataset'][':id']['runs'].$get({
        query: {
          page,
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
    page,
    setPage,
  }
}

export const useDataset = (id?: string) => {
  const { datasetId } = useDatasetParams(id)

  return useQuery({
    queryKey: [QueryKey.Dataset, datasetId],
    queryFn: async () => {
      if (!datasetId) return null
      const res = client.api.v0.dataset[':id'].$get({
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
  const { datasetRunId } = useDatasetParams(undefined, _datasetRunId)

  return useQuery({
    queryKey: [QueryKey.DatasetRun, datasetRunId],
    queryFn: async () => {
      if (!datasetRunId) return null
      const res = client.api.v0['dataset-run'][':id'].$get({
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
      const res = client.api.v0.dataset.$post({
        json: data,
      })
      await unwrapResponse(res, 201)

      queryClient.invalidateQueries({
        queryKey: [QueryKey.Dataset],
      })
    },
  })
}

export const useCreateDatasetRun = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateDatasetRunPayload) => {
      const res = client.api.v0['dataset-run'].$post({
        json: data,
      })
      await unwrapResponse(res, 201)

      queryClient.invalidateQueries({
        queryKey: [QueryKey.DatasetRun],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Dataset, data.datasetId],
      })
    },
  })
}

export const useUpdateDataset = (_datasetId?: string) => {
  const { datasetId } = useDatasetParams(_datasetId)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: UpdateDatasetPayload) => {
      if (!datasetId) return
      const res = client.api.v0.dataset[':id'].$patch({
        param: { id: datasetId },
        json: payload,
      })
      return await unwrapResponse(res)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Dataset, datasetId],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Dataset],
      })
    },
  })
}

export const useUpdateDatasetRun = (_datasetRunId?: string) => {
  const { datasetRunId } = useDatasetParams(undefined, _datasetRunId)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: UpdateDatasetRunPayload) => {
      if (!datasetRunId) return
      const res = client.api.v0['dataset-run'][':id'].$patch({
        param: { id: datasetRunId },
        json: payload,
      })
      return await unwrapResponse(res)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryKey.DatasetRun, datasetRunId],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.DatasetRun],
      })
    },
  })
}

export const useSetDatasetMainRun = (run?: DatasetRunLinkParams | null) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!run) return
      const res = client.api.v0['dataset-run'][':id']['set-as-main-run'].$post({
        param: { id: run.id },
      })
      return await unwrapResponse(res)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryKey.DatasetRun, run?.id],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.DatasetRun],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Dataset, run?.dataset.id],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Dataset],
      })
    },
  })
}

export const useDeleteDataset = (
  _datasetId?: string,
  redirect: string | null = null,
) => {
  const { datasetId } = useDatasetParams(_datasetId)
  const queryClient = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: async () => {
      if (!datasetId) return
      const res = client.api.v0.dataset[':id'].$delete({
        param: {
          id: datasetId,
        },
      })

      return await unwrapResponse(res)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Dataset],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Dataset, datasetId],
      })
      if (redirect) {
        router.push(redirect)
      }
    },
  })
}

export const useDeleteDatasetRun = (
  _datasetRunId?: string,
  redirect: string | null = null,
) => {
  const { datasetRunId } = useDatasetParams(undefined, _datasetRunId)
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async () => {
      if (!datasetRunId) return
      const res = client.api.v0['dataset-run'][':id'].$delete({
        param: {
          id: datasetRunId,
        },
      })

      return await unwrapResponse(res)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryKey.DatasetRun],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Dataset, datasetRunId],
      })
      if (redirect) {
        router.push(redirect)
      }
    },
  })
}

export type DatasetLinkParams = Pick<DatasetListItem, 'id' | 'name'>

export const DATASETS_BASE_PATH = '/console/datasets'

export const useDatasetLink = () =>
  useCallback(
    (dataset: DatasetLinkParams) => `${DATASETS_BASE_PATH}/${dataset.id}`,
    [],
  )

export const useDatasetRunsLink = () =>
  useCallback(
    (dataset: DatasetLinkParams) => `${DATASETS_BASE_PATH}/${dataset.id}/runs`,
    [],
  )

export type DatasetRunLinkParams = Pick<
  DatasetRunListItem,
  'id' | 'name' | 'dataset'
>

export const DATASETS_RUNS_BASE_PATH = '/console/dataset-run'
export const useDatasetRunLink = () =>
  useCallback(
    (datasetRun: DatasetRunLinkParams) =>
      `${DATASETS_RUNS_BASE_PATH}/${datasetRun.id}`,
    [],
  )
