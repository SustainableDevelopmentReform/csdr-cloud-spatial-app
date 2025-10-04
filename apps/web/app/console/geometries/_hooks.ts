'use client'

import {
  geometriesQuerySchema,
  geometriesRunQuerySchema,
  geometryOutputQuerySchema,
} from '@repo/schemas/crud'
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

const queryKeys = {
  geometriesAll: ['geometries'] as const,
  geometriesDetail: (geometriesId: string | undefined) =>
    [...queryKeys.geometriesAll, geometriesId] as const,
  geometriesList: (query: z.infer<typeof geometriesQuerySchema>) =>
    [...queryKeys.geometriesAll, { query }] as const,
  geometriesRunAll: ['geometriesRun'] as const,
  geometriesRunDetail: (geometriesRunId: string | undefined) =>
    [...queryKeys.geometriesRunAll, geometriesRunId] as const,
  geometriesRunList: (
    geometriesId: string | undefined,
    query: z.infer<typeof geometriesRunQuerySchema>,
  ) => [...queryKeys.geometriesRunAll, geometriesId, { query }] as const,
  geometryOutputAll: ['geometryOutput'] as const,
  geometryOutputDetail: (geometryOutputId: string | undefined) =>
    [...queryKeys.geometryOutputAll, geometryOutputId] as const,
  geometryOutputList: (
    geometriesRunId: string | undefined,
    query: z.infer<typeof geometryOutputQuerySchema>,
  ) => [...queryKeys.geometryOutputAll, geometriesRunId, { query }] as const,
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

export const useAllGeometries = () => {
  const client = useApiClient()
  const { query, setSearchParams } = useQueryWithSearchParams(
    geometriesQuerySchema,
  )

  const { data } = useQuery({
    queryKey: queryKeys.geometriesList(query),
    queryFn: async () => {
      const res = client.api.v0.geometries.$get({
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

export const useGeometriesRuns = (_geometriesId?: string) => {
  const { geometriesId } = useGeometriesParams(_geometriesId)
  const client = useApiClient()
  const { query, setSearchParams } = useQueryWithSearchParams(
    geometriesRunQuerySchema,
  )

  const { data } = useQuery({
    queryKey: queryKeys.geometriesRunList(geometriesId, query),
    queryFn: async () => {
      if (!geometriesId) return null
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
  })

  return {
    data,
    query,
    setSearchParams,
  }
}

export const useGeometryOutputs = (_geometriesRunId?: string) => {
  const { geometriesRunId } = useGeometriesParams(undefined, _geometriesRunId)
  const client = useApiClient()
  const { query, setSearchParams } = useQueryWithSearchParams(
    geometryOutputQuerySchema,
  )

  const { data } = useQuery({
    queryKey: queryKeys.geometryOutputList(geometriesRunId, query),
    queryFn: async () => {
      if (!geometriesRunId) return null
      const res = client.api.v0['geometries-run'][':id']['outputs'].$get({
        query,
        param: {
          id: geometriesRunId,
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

export const useGeometries = (_geometriesId?: string) => {
  const { geometriesId } = useGeometriesParams(_geometriesId)
  const client = useApiClient()
  return useQuery({
    queryKey: queryKeys.geometriesDetail(geometriesId),
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
  })
}

export const useGeometriesRun = (_geometriesRunId?: string) => {
  const { geometriesRunId } = useGeometriesParams(undefined, _geometriesRunId)
  const client = useApiClient()
  return useQuery({
    queryKey: queryKeys.geometriesRunDetail(geometriesRunId),
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
    queryKey: queryKeys.geometryOutputDetail(geometryOutputId),
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

      queryClient.invalidateQueries({
        queryKey: queryKeys.geometriesAll,
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
      await unwrapResponse(res, 201)
      queryClient.invalidateQueries({
        queryKey: queryKeys.geometriesRunAll,
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.geometriesDetail(data.geometriesId),
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
      await unwrapResponse(res, 201)
      queryClient.invalidateQueries({
        queryKey: queryKeys.geometryOutputAll,
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.geometriesRunDetail(data.geometriesRunId),
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
        queryKey: queryKeys.geometriesAll,
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
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.geometriesRunAll,
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
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.geometryOutputAll,
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
      queryClient.invalidateQueries({
        queryKey: queryKeys.geometriesRunAll,
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.geometriesAll,
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
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.geometriesAll,
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
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.geometriesRunAll,
      })
      if (redirect) {
        router.push(redirect)
      }
    },
  })
}

export type GeometriesLinkParams = Pick<GeometriesListItem, 'id' | 'name'>

export const GEOMETRIES_BASE_PATH = '/console/geometries'

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

export const GEOMETRIES_RUNS_BASE_PATH = `/console/geometries-run`

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

export const GEOMETRIES_RUNS_OUTPUTS_BASE_PATH = `/console/geometry-output`

export const useGeometryOutputLink = () =>
  useCallback(
    (geometryOutput: GeometryOutputLinkParams) =>
      `${GEOMETRIES_RUNS_OUTPUTS_BASE_PATH}/${geometryOutput.id}`,
    [],
  )
