'use client'

import {
  geometriesQuerySchema,
  geometriesRunQuerySchema,
  geometryOutputExportQuerySchema,
  geometryOutputQuerySchema,
} from '@repo/schemas/crud'
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { InferRequestType, InferResponseType } from 'hono/client'
import { useParams, useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { z } from 'zod'
import { Client, unwrapResponse } from '~/utils/apiClient'
import { getSearchParams } from '~/utils/browser'
import { useApiClient } from '../../../hooks/useApiClient'
import { useQueryWithSearchParams } from '../../../hooks/useSearchParams'
import {
  GEOMETRIES_BASE_PATH,
  GEOMETRIES_RUNS_BASE_PATH,
  GEOMETRIES_RUNS_OUTPUTS_BASE_PATH,
} from '../../../lib/paths'

export type GeometriesListItem = NonNullable<
  InferResponseType<Client['api']['v0']['geometries']['$get'], 200>['data']
>['data'][0]
export type GeometriesDetail = NonNullable<
  InferResponseType<
    Client['api']['v0']['geometries'][':id']['$get'],
    200
  >['data']
>

export type GeometriesRunListItem = NonNullable<
  InferResponseType<
    Client['api']['v0']['geometries'][':id']['runs']['$get'],
    200
  >['data']
>['data'][0]
export type GeometriesRunExportListItem = NonNullable<
  InferResponseType<
    Client['api']['v0']['geometries-run'][':id']['outputs']['export']['$get'],
    200
  >['data']
>['data'][0]
export type GeometriesRunDetail = NonNullable<
  InferResponseType<
    Client['api']['v0']['geometries-run'][':id']['$get'],
    200
  >['data']
>

export type GeometryOutputListItem = NonNullable<
  InferResponseType<
    Client['api']['v0']['geometries-run'][':id']['outputs']['$get'],
    200
  >['data']
>['data'][0]
export type GeometryOutputDetail = NonNullable<
  InferResponseType<
    Client['api']['v0']['geometry-output'][':id']['$get'],
    200
  >['data']
>

export type UpdateGeometriesPayload = NonNullable<
  InferRequestType<Client['api']['v0']['geometries'][':id']['$patch']>['json']
>

export type UpdateGeometriesRunPayload = NonNullable<
  InferRequestType<
    Client['api']['v0']['geometries-run'][':id']['$patch']
  >['json']
>

export type UpdateGeometryOutputPayload = NonNullable<
  InferRequestType<
    Client['api']['v0']['geometry-output'][':id']['$patch']
  >['json']
>

export type CreateGeometriesPayload = NonNullable<
  InferRequestType<Client['api']['v0']['geometries']['$post']>['json']
>

export type CreateGeometriesRunPayload = NonNullable<
  InferRequestType<Client['api']['v0']['geometries-run']['$post']>['json']
>

export type CreateGeometryOutputPayload = NonNullable<
  InferRequestType<Client['api']['v0']['geometry-output']['$post']>['json']
>

const geometriesParamsSchema = z.object({
  geometriesId: z.string().optional(),
  geometriesRunId: z.string().optional(),
  geometryOutputId: z.string().optional(),
})

export const geometriesQueryKeys = {
  all: ['geometries'] as const,
  list: (query: z.infer<typeof geometriesQuerySchema> | undefined) =>
    [...geometriesQueryKeys.all, 'list', { query }] as const,
  detail: (geometriesId: string | undefined) =>
    [...geometriesQueryKeys.all, 'detail', geometriesId] as const,
}

export const geometriesRunQueryKeys = {
  all: ['geometriesRun'] as const,
  scopeByGeometries: (geometriesId: string | undefined) =>
    [...geometriesRunQueryKeys.all, geometriesId] as const,
  list: (
    geometriesId: string | undefined,
    query: z.infer<typeof geometriesRunQuerySchema> | undefined,
  ) =>
    [
      ...geometriesRunQueryKeys.scopeByGeometries(geometriesId),
      'list',
      { query },
    ] as const,
  // Note: we don't know the geometriesId ahead of time, so we can't use the scopeByGeometries query key
  // This means we need to invalidate the geometriesRun.all query key when we create/delete a new geometries run
  detail: (geometriesRunId: string | undefined) =>
    [...geometriesRunQueryKeys.all, 'detail', geometriesRunId] as const,
}
const geometryOutputQueryKeys = {
  all: ['geometryOutput'] as const,
  scopeByGeometries: (geometriesId: string | undefined) =>
    [...geometryOutputQueryKeys.all, geometriesId] as const,
  scopeByGeometriesRun: (
    geometriesId: string | undefined,
    geometriesRunId: string | undefined,
  ) =>
    [
      ...geometryOutputQueryKeys.scopeByGeometries(geometriesId),
      geometriesRunId,
    ] as const,
  list: (
    geometriesId: string | undefined,
    geometriesRunId: string | undefined,
    query: z.infer<typeof geometryOutputQuerySchema> | undefined,
  ) =>
    [
      ...geometryOutputQueryKeys.scopeByGeometriesRun(
        geometriesId,
        geometriesRunId,
      ),
      'list',
      { query },
    ] as const,
  // Note: we don't know the geometriesId or geometriesRunId ahead of time, so we can't use the scopeByGeometriesRun query key
  // This means we need to invalidate the geometryOutput.all query key when we create/delete a new geometry output
  detail: (geometryOutputId: string | undefined) =>
    [...geometryOutputQueryKeys.all, 'detail', geometryOutputId] as const,
  exportList: (
    geometriesId: string | undefined,
    geometriesRunId: string | undefined,
    query: z.infer<typeof geometryOutputExportQuerySchema> | undefined,
  ) =>
    [
      ...geometryOutputQueryKeys.scopeByGeometriesRun(
        geometriesId,
        geometriesRunId,
      ),
      'export',
      { query },
    ] as const,
}

export const useGeometriesParams = (
  _geometriesId?: string,
  _geometriesRunId?: string,
  _geometryOutputId?: string,
) => {
  const params = useParams()
  const { geometriesId, geometriesRunId, geometryOutputId } =
    geometriesParamsSchema.parse(params)

  return {
    geometriesId: _geometriesId ?? geometriesId,
    geometriesRunId: _geometriesRunId ?? geometriesRunId,
    geometryOutputId: _geometryOutputId ?? geometryOutputId,
  }
}

export const useAllGeometries = (
  _query?: z.infer<typeof geometriesQuerySchema>,
  useSearchParams?: boolean,
) => {
  const client = useApiClient()
  const { query, setSearchParams } = useQueryWithSearchParams(
    geometriesQuerySchema,
    _query,
    useSearchParams,
  )

  const { data } = useQuery({
    queryKey: geometriesQueryKeys.list(query),
    queryFn: async () => {
      if (!query) return null
      const res = client.api.v0.geometries.$get({
        query,
      })

      const json = await unwrapResponse(res)

      return json.data
    },
    placeholderData: keepPreviousData,
    enabled: !!query,
  })

  return {
    data,
    query,
    setSearchParams,
  }
}

export const useGeometriesRuns = (
  _geometriesId?: string,
  _query?: z.infer<typeof geometriesRunQuerySchema>,
  useSearchParams?: boolean,
) => {
  const { geometriesId } = useGeometriesParams(_geometriesId)
  const client = useApiClient()
  const { query, setSearchParams } = useQueryWithSearchParams(
    geometriesRunQuerySchema,
    _query,
    useSearchParams,
  )

  const { data } = useQuery({
    queryKey: geometriesRunQueryKeys.list(geometriesId, query),
    queryFn: async () => {
      if (!geometriesId || !query) return null
      const res = client.api.v0['geometries'][':id']['runs'].$get({
        query,
        param: {
          id: geometriesId,
        },
      })

      const json = await unwrapResponse(res)

      return json.data
    },
    placeholderData: keepPreviousData,
    enabled: !!geometriesId && !!query,
  })

  return {
    data,
    query,
    setSearchParams,
  }
}

export const useGeometryOutputs = (
  _geometriesRunId?: string,
  _query?: z.infer<typeof geometryOutputQuerySchema>,
  useSearchParams?: boolean,
) => {
  const { geometriesRunId } = useGeometriesParams(undefined, _geometriesRunId)
  const { data: geometriesRun } = useGeometriesRun(geometriesRunId)
  const client = useApiClient()
  const { query, setSearchParams } = useQueryWithSearchParams(
    geometryOutputQuerySchema,
    _query,
    useSearchParams,
  )

  const queryResult = useQuery({
    queryKey: geometryOutputQueryKeys.list(
      geometriesRun?.geometries?.id,
      geometriesRun?.id,
      query,
    ),
    queryFn: async () => {
      if (!geometriesRun || !query) return null
      const res = client.api.v0['geometries-run'][':id']['outputs'].$get({
        query,
        param: {
          id: geometriesRun.id,
        },
      })

      const json = await unwrapResponse(res)

      return json.data
    },
    placeholderData: keepPreviousData,
    enabled: !!geometriesRun && !!query,
  })

  return {
    ...queryResult,
    query,
    setSearchParams,
  }
}

export const useGeometryOutputsExport = (
  _geometriesRunId?: string,
  _query?: z.infer<typeof geometryOutputExportQuerySchema>,
  useSearchParams?: boolean,
) => {
  const { geometriesRunId } = useGeometriesParams(undefined, _geometriesRunId)
  const { data: geometriesRun } = useGeometriesRun(geometriesRunId)
  const client = useApiClient()
  const { query, setSearchParams } = useQueryWithSearchParams(
    geometryOutputExportQuerySchema,
    _query,
    useSearchParams,
  )

  const queryResult = useQuery({
    queryKey: geometryOutputQueryKeys.exportList(
      geometriesRun?.geometries?.id,
      geometriesRun?.id,
      query,
    ),
    queryFn: async () => {
      if (!geometriesRun || !query) return null
      const res = client.api.v0['geometries-run'][':id']['outputs'][
        'export'
      ].$get({
        query,
        param: {
          id: geometriesRun.id,
        },
      })

      const json = await unwrapResponse(res)

      return json.data
    },
    placeholderData: keepPreviousData,
    enabled: !!geometriesRun && !!query,
  })

  return {
    ...queryResult,
    query,
    setSearchParams,
  }
}
export const useGeometries = (_geometriesId?: string) => {
  const { geometriesId } = useGeometriesParams(_geometriesId)
  const client = useApiClient()
  return useQuery({
    queryKey: geometriesQueryKeys.detail(geometriesId),
    queryFn: async () => {
      if (!geometriesId) return null
      const res = client.api.v0.geometries[':id'].$get({
        param: {
          id: geometriesId,
        },
      })

      const json = await unwrapResponse(res)

      return json.data
    },
    placeholderData: keepPreviousData,
    enabled: !!geometriesId,
  })
}

export const useGeometriesRun = (_geometriesRunId?: string) => {
  const { geometriesRunId } = useGeometriesParams(undefined, _geometriesRunId)
  const client = useApiClient()
  return useQuery({
    queryKey: geometriesRunQueryKeys.detail(geometriesRunId),
    queryFn: async () => {
      if (!geometriesRunId) return null
      const res = client.api.v0['geometries-run'][':id'].$get({
        param: {
          id: geometriesRunId,
        },
      })

      const json = await unwrapResponse(res)

      return json.data
    },
    placeholderData: keepPreviousData,
    enabled: !!geometriesRunId,
  })
}

export const useGeometryOutput = (_geometryOutputId?: string) => {
  const { geometryOutputId } = useGeometriesParams(
    undefined,
    undefined,
    _geometryOutputId,
  )
  const client = useApiClient()
  return useQuery({
    queryKey: geometryOutputQueryKeys.detail(geometryOutputId),
    queryFn: async () => {
      if (!geometryOutputId) return null
      const res = client.api.v0['geometry-output'][':id'].$get({
        param: {
          id: geometryOutputId,
        },
      })

      const json = await unwrapResponse(res)

      return json.data
    },
    placeholderData: keepPreviousData,
    enabled: !!geometryOutputId,
  })
}

export const useCreateGeometries = () => {
  const queryClient = useQueryClient()
  const client = useApiClient()
  return useMutation({
    mutationFn: async (data: CreateGeometriesPayload) => {
      const res = client.api.v0.geometries.$post({
        json: data,
      })
      await unwrapResponse(res, 201)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: geometriesQueryKeys.all,
      })
    },
  })
}

export const useCreateGeometriesRun = () => {
  const queryClient = useQueryClient()
  const client = useApiClient()
  return useMutation({
    mutationFn: async (data: CreateGeometriesRunPayload) => {
      const res = client.api.v0['geometries-run'].$post({
        json: data,
      })
      return await unwrapResponse(res, 201)
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({
        queryKey: geometriesQueryKeys.detail(response?.data?.geometries?.id),
      })
      queryClient.invalidateQueries({
        queryKey: geometriesRunQueryKeys.scopeByGeometries(
          response?.data?.geometries?.id,
        ),
      })
    },
  })
}

export const useCreateGeometryOutput = () => {
  const queryClient = useQueryClient()
  const client = useApiClient()
  return useMutation({
    mutationFn: async (data: CreateGeometryOutputPayload) => {
      const res = client.api.v0['geometry-output'].$post({
        json: data,
      })
      return await unwrapResponse(res, 201)
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({
        queryKey: geometryOutputQueryKeys.scopeByGeometriesRun(
          response?.data?.geometriesRun?.geometries?.id,
          response?.data?.geometriesRun?.id,
        ),
      })
      queryClient.invalidateQueries({
        queryKey: geometriesRunQueryKeys.detail(
          response?.data?.geometriesRun?.id,
        ),
      })
      queryClient.invalidateQueries({
        queryKey: geometriesQueryKeys.detail(
          response?.data?.geometriesRun?.geometries?.id,
        ),
      })
    },
  })
}

export const useUpdateGeometries = (_geometriesId?: string) => {
  const { geometriesId } = useGeometriesParams(_geometriesId)
  const queryClient = useQueryClient()
  const client = useApiClient()
  return useMutation({
    mutationFn: async (payload: UpdateGeometriesPayload) => {
      if (!geometriesId) return
      const res = client.api.v0.geometries[':id'].$patch({
        param: { id: geometriesId },
        json: payload,
      })
      return await unwrapResponse(res)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: geometriesQueryKeys.all,
      })
    },
  })
}

export const useUpdateGeometriesRun = (_geometriesRunId?: string) => {
  const { geometriesRunId } = useGeometriesParams(undefined, _geometriesRunId)
  const queryClient = useQueryClient()
  const client = useApiClient()
  return useMutation({
    mutationFn: async (payload: UpdateGeometriesRunPayload) => {
      if (!geometriesRunId) return
      const res = client.api.v0['geometries-run'][':id'].$patch({
        param: { id: geometriesRunId },
        json: payload,
      })
      return await unwrapResponse(res)
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({
        queryKey: geometriesRunQueryKeys.detail(response?.data?.id),
      })
      queryClient.invalidateQueries({
        queryKey: geometriesRunQueryKeys.detail(response?.data?.id),
      })
      queryClient.invalidateQueries({
        queryKey: geometriesRunQueryKeys.scopeByGeometries(
          response?.data?.geometries?.id,
        ),
      })
    },
  })
}

export const useUpdateGeometryOutput = (_geometryOutputId?: string) => {
  const { geometryOutputId } = useGeometriesParams(
    undefined,
    undefined,
    _geometryOutputId,
  )
  const queryClient = useQueryClient()
  const client = useApiClient()
  return useMutation({
    mutationFn: async (payload: UpdateGeometryOutputPayload) => {
      if (!geometryOutputId) return
      const res = client.api.v0['geometry-output'][':id'].$patch({
        param: { id: geometryOutputId },
        json: payload,
      })
      return await unwrapResponse(res)
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({
        queryKey: geometryOutputQueryKeys.detail(response?.data?.id),
      })
      queryClient.invalidateQueries({
        queryKey: geometriesRunQueryKeys.detail(
          response?.data?.geometriesRun?.id,
        ),
      })
      queryClient.invalidateQueries({
        queryKey: geometryOutputQueryKeys.detail(response?.data?.id),
      })
      queryClient.invalidateQueries({
        queryKey: geometryOutputQueryKeys.scopeByGeometriesRun(
          response?.data?.geometriesRun?.geometries?.id,
          response?.data?.geometriesRun?.id,
        ),
      })
    },
  })
}

export const useSetGeometriesMainRun = (
  run?: GeometriesRunLinkParams | null,
) => {
  const queryClient = useQueryClient()
  const client = useApiClient()
  return useMutation({
    mutationFn: async () => {
      if (!run) return
      const res = client.api.v0['geometries-run'][':id'][
        'set-as-main-run'
      ].$post({
        param: { id: run.id },
      })
      return await unwrapResponse(res)
    },
    onSuccess: () => {
      if (!run) return
      queryClient.invalidateQueries({
        queryKey: geometriesRunQueryKeys.detail(run.id),
      })
      queryClient.invalidateQueries({
        queryKey: geometriesRunQueryKeys.scopeByGeometries(run.geometries?.id),
      })
      queryClient.invalidateQueries({
        queryKey: geometriesQueryKeys.detail(run.geometries?.id),
      })
    },
  })
}

export const useDeleteGeometries = (
  _geometriesId?: string,
  redirect: string | null = null,
) => {
  const { geometriesId } = useGeometriesParams(_geometriesId)
  const queryClient = useQueryClient()
  const router = useRouter()
  const client = useApiClient()
  return useMutation({
    mutationFn: async () => {
      if (!geometriesId) return
      const res = client.api.v0.geometries[':id'].$delete({
        param: {
          id: geometriesId,
        },
      })

      return await unwrapResponse(res)
    },
    onSuccess: (response) => {
      queryClient.removeQueries({
        queryKey: geometriesQueryKeys.detail(response?.data?.id),
      })
      queryClient.removeQueries({
        queryKey: geometriesRunQueryKeys.scopeByGeometries(response?.data?.id),
      })
      queryClient.removeQueries({
        queryKey: geometryOutputQueryKeys.scopeByGeometries(response?.data?.id),
      })

      queryClient.invalidateQueries({
        queryKey: geometriesQueryKeys.all,
      })
      queryClient.invalidateQueries({
        queryKey: geometriesRunQueryKeys.all,
      })
      queryClient.invalidateQueries({
        queryKey: geometryOutputQueryKeys.all,
      })
      if (redirect) {
        router.push(redirect)
      }
    },
  })
}

export const useDeleteGeometriesRun = (
  _geometriesRunId?: string,
  redirect: string | null = null,
) => {
  const { geometriesRunId } = useGeometriesParams(undefined, _geometriesRunId)
  const queryClient = useQueryClient()
  const router = useRouter()
  const client = useApiClient()
  return useMutation({
    mutationFn: async () => {
      if (!geometriesRunId) return
      const res = client.api.v0['geometries-run'][':id'].$delete({
        param: {
          id: geometriesRunId,
        },
      })

      return await unwrapResponse(res)
    },
    onSuccess: (response) => {
      queryClient.removeQueries({
        queryKey: geometryOutputQueryKeys.scopeByGeometriesRun(
          response?.data?.geometries?.id,
          response?.data?.id,
        ),
      })

      queryClient.removeQueries({
        queryKey: geometriesRunQueryKeys.detail(response?.data?.id),
      })

      queryClient.invalidateQueries({
        queryKey: geometriesRunQueryKeys.scopeByGeometries(
          response?.data?.geometries?.id,
        ),
      })
      queryClient.invalidateQueries({
        queryKey: geometriesQueryKeys.detail(response?.data?.geometries?.id),
      })

      if (redirect) {
        router.push(redirect)
      }
    },
  })
}

export type GeometriesLinkParams = Pick<GeometriesListItem, 'id' | 'name'>

export const useAllGeometriesLink = () =>
  useCallback(
    (query?: z.infer<typeof geometriesQuerySchema>) =>
      `${GEOMETRIES_BASE_PATH}?${getSearchParams(query ?? {})}`,
    [],
  )

export const useGeometriesLink = () =>
  useCallback(
    (geometries: GeometriesLinkParams) =>
      `${GEOMETRIES_BASE_PATH}/${geometries.id}`,
    [],
  )

export const useGeometriesRunsLink = () =>
  useCallback(
    (
      geometries: GeometriesLinkParams | null,
      query?: z.infer<typeof geometriesRunQuerySchema>,
    ) =>
      `${GEOMETRIES_BASE_PATH}/${geometries?.id ?? '*'}/runs?${getSearchParams(query ?? {})}`,
    [],
  )

export type GeometriesRunLinkParams = Pick<
  GeometriesRunDetail,
  'id' | 'name' | 'geometries'
>

export const useGeometriesRunLink = () =>
  useCallback(
    (geometriesRun: GeometriesRunLinkParams) =>
      `${GEOMETRIES_RUNS_BASE_PATH}/${geometriesRun.id}`,
    [],
  )

export const useGeometryRunOutputsLink = () =>
  useCallback(
    (
      geometriesRun: GeometriesRunLinkParams,
      query?: z.infer<typeof geometryOutputQuerySchema>,
    ) =>
      `${GEOMETRIES_RUNS_BASE_PATH}/${geometriesRun.id}/outputs?${getSearchParams(query ?? {})}`,
    [],
  )

export type GeometryOutputLinkParams = Pick<
  GeometryOutputDetail,
  'id' | 'geometriesRun' | 'name'
>

export const useGeometryOutputLink = () =>
  useCallback(
    (geometryOutput: GeometryOutputLinkParams) =>
      `${GEOMETRIES_RUNS_OUTPUTS_BASE_PATH}/${geometryOutput.id}`,
    [],
  )
