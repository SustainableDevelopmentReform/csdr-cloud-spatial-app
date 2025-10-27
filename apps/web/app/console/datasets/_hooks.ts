'use client'

import { datasetQuerySchema, datasetRunQuerySchema } from '@repo/schemas/crud'
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { InferRequestType, InferResponseType } from 'hono/client'
import { useCallback } from 'react'
import { z } from 'zod'
import { Client, unwrapResponse } from '~/utils/apiClient'
import { useParams, useRouter } from 'next/navigation'
import { useApiClient } from '../../../hooks/useApiClient'
import { useQueryWithSearchParams } from '../../../hooks/useSearchParams'
import { getSearchParams } from '~/utils/browser'

export type DatasetListItem = NonNullable<
  InferResponseType<Client['api']['v0']['dataset']['$get'], 200>['data']
>['data'][0]
export type DatasetDetail = NonNullable<
  InferResponseType<Client['api']['v0']['dataset'][':id']['$get'], 200>['data']
>

export type DatasetRunListItem = NonNullable<
  InferResponseType<
    Client['api']['v0']['dataset'][':id']['runs']['$get'],
    200
  >['data']
>['data'][0]
export type DatasetRunDetail = NonNullable<
  InferResponseType<
    Client['api']['v0']['dataset-run'][':id']['$get'],
    200
  >['data']
>

export type UpdateDatasetPayload = NonNullable<
  InferRequestType<Client['api']['v0']['dataset'][':id']['$patch']>['json']
>
export type UpdateDatasetRunPayload = NonNullable<
  InferRequestType<Client['api']['v0']['dataset-run'][':id']['$patch']>['json']
>

export type CreateDatasetPayload = NonNullable<
  InferRequestType<Client['api']['v0']['dataset']['$post']>['json']
>
export type CreateDatasetRunPayload = NonNullable<
  InferRequestType<Client['api']['v0']['dataset-run']['$post']>['json']
>

const datasetParamsSchema = z.object({
  datasetId: z.string().optional(),
  datasetRunId: z.string().optional(),
})

const queryKeys = {
  datasetAll: ['dataset'] as const,
  datasetDetail: (datasetId: string | undefined) =>
    [...queryKeys.datasetAll, datasetId] as const,
  datasetList: (query: z.infer<typeof datasetQuerySchema> | undefined) =>
    [...queryKeys.datasetAll, { query }] as const,
  datasetRunAll: ['datasetRun'] as const,
  datasetRunDetail: (datasetRunId: string | undefined) =>
    [...queryKeys.datasetRunAll, datasetRunId] as const,
  datasetRunList: (query: z.infer<typeof datasetRunQuerySchema> | undefined) =>
    [...queryKeys.datasetRunAll, { query }] as const,
}

const useDatasetParams = (_datasetId?: string, _datasetRunId?: string) => {
  const params = useParams()
  const { datasetId, datasetRunId } = datasetParamsSchema.parse(params)

  return {
    datasetId: _datasetId ?? datasetId,
    datasetRunId: _datasetRunId ?? datasetRunId,
  }
}

export const useDatasets = (
  _query?: z.infer<typeof datasetQuerySchema>,
  useSearchParams?: boolean,
) => {
  const client = useApiClient()

  const { query, setSearchParams } = useQueryWithSearchParams(
    datasetQuerySchema,
    _query,
    useSearchParams,
  )

  const { data } = useQuery({
    queryKey: queryKeys.datasetList(query),
    queryFn: async () => {
      if (!query) return null
      const res = client.api.v0.dataset.$get({
        query,
      })

      const json = await unwrapResponse(res)

      return json.data
    },
    placeholderData: keepPreviousData,
  })

  return {
    data,
    query,
    setSearchParams,
  }
}

export const useDatasetRuns = (
  _datasetId?: string,
  _query?: z.infer<typeof datasetRunQuerySchema>,
  useSearchParams?: boolean,
) => {
  const { datasetId } = useDatasetParams(_datasetId)
  const client = useApiClient()
  const { query, setSearchParams } = useQueryWithSearchParams(
    datasetRunQuerySchema,
    _query,
    useSearchParams,
  )

  const { data } = useQuery({
    queryKey: queryKeys.datasetRunList(query),
    queryFn: async () => {
      if (!datasetId || !query) return null
      const res = client.api.v0['dataset'][':id']['runs'].$get({
        query,
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
    query,
    setSearchParams,
  }
}

export const useDataset = (id?: string) => {
  const { datasetId } = useDatasetParams(id)
  const client = useApiClient()
  return useQuery({
    queryKey: queryKeys.datasetDetail(datasetId),
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
  const client = useApiClient()
  return useQuery({
    queryKey: queryKeys.datasetRunDetail(datasetRunId),
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
  const client = useApiClient()
  return useMutation({
    mutationFn: async (data: CreateDatasetPayload) => {
      const res = client.api.v0.dataset.$post({
        json: data,
      })
      await unwrapResponse(res, 201)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.datasetAll,
      })
    },
  })
}

export const useCreateDatasetRun = () => {
  const queryClient = useQueryClient()
  const client = useApiClient()
  return useMutation({
    mutationFn: async (data: CreateDatasetRunPayload) => {
      const res = client.api.v0['dataset-run'].$post({
        json: data,
      })
      await unwrapResponse(res, 201)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.datasetRunAll,
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.datasetDetail(variables.datasetId),
      })
    },
  })
}

export const useUpdateDataset = (_datasetId?: string) => {
  const { datasetId } = useDatasetParams(_datasetId)
  const queryClient = useQueryClient()
  const client = useApiClient()
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
        queryKey: queryKeys.datasetAll,
      })
    },
  })
}

export const useUpdateDatasetRun = (_datasetRunId?: string) => {
  const { datasetRunId } = useDatasetParams(undefined, _datasetRunId)
  const queryClient = useQueryClient()
  const client = useApiClient()
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
        queryKey: queryKeys.datasetRunAll,
      })
    },
  })
}

export const useSetDatasetMainRun = (run?: DatasetRunLinkParams | null) => {
  const queryClient = useQueryClient()
  const client = useApiClient()
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
        queryKey: queryKeys.datasetRunAll,
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.datasetAll,
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
  const client = useApiClient()
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
        queryKey: queryKeys.datasetAll,
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
  const client = useApiClient()
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
        queryKey: queryKeys.datasetRunAll,
      })
      if (redirect) {
        router.push(redirect)
      }
    },
  })
}

export type DatasetLinkParams = Pick<DatasetListItem, 'id' | 'name'>

export const DATASETS_BASE_PATH = '/console/datasets'

export const useDatasetsLink = () =>
  useCallback(
    (query?: z.infer<typeof datasetQuerySchema>) =>
      `${DATASETS_BASE_PATH}?${getSearchParams(query ?? {})}`,
    [],
  )

export const useDatasetLink = () =>
  useCallback(
    (dataset: DatasetLinkParams) => `${DATASETS_BASE_PATH}/${dataset.id}`,
    [],
  )

export const useDatasetRunsLink = () =>
  useCallback(
    (
      dataset: DatasetLinkParams | null,
      query?: z.infer<typeof datasetRunQuerySchema>,
    ) =>
      `${DATASETS_BASE_PATH}/${dataset?.id ?? '*'}/runs?${getSearchParams(query ?? {})}`,
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
