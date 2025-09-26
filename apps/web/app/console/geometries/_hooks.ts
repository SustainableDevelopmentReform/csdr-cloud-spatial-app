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

export type GeometriesListItem = NonNullable<
  InferResponseType<typeof client.api.v0.geometries.$get, 200>['data']
>['data'][0]
export type GeometriesDetail = NonNullable<
  InferResponseType<
    (typeof client.api.v0.geometries)[':id']['$get'],
    200
  >['data']
>

export type GeometriesRunListItem = NonNullable<
  InferResponseType<
    (typeof client.api.v0.geometries)[':id']['runs']['$get'],
    200
  >['data']
>['data'][0]
export type GeometriesRunDetail = NonNullable<
  InferResponseType<
    (typeof client.api.v0)['geometries-run'][':id']['$get'],
    200
  >['data']
>

export type GeometryOutputListItem = NonNullable<
  InferResponseType<
    (typeof client.api.v0)['geometries-run'][':id']['outputs']['$get'],
    200
  >['data']
>['data'][0]
export type GeometryOutputDetail = NonNullable<
  InferResponseType<
    (typeof client.api.v0)['geometry-output'][':id']['$get'],
    200
  >['data']
>

export type UpdateGeometriesPayload = NonNullable<
  InferRequestType<(typeof client.api.v0.geometries)[':id']['$patch']>['json']
>

export type UpdateGeometriesRunPayload = NonNullable<
  InferRequestType<
    (typeof client.api.v0)['geometries-run'][':id']['$patch']
  >['json']
>

export type UpdateGeometryOutputPayload = NonNullable<
  InferRequestType<
    (typeof client.api.v0)['geometry-output'][':id']['$patch']
  >['json']
>

export type CreateGeometriesPayload = NonNullable<
  InferRequestType<(typeof client.api.v0.geometries)['$post']>['json']
>

export type CreateGeometriesRunPayload = NonNullable<
  InferRequestType<(typeof client.api.v0)['geometries-run']['$post']>['json']
>

export type CreateGeometryOutputPayload = NonNullable<
  InferRequestType<(typeof client.api.v0)['geometry-output']['$post']>['json']
>

const geometriesParamsSchema = z.object({
  geometriesId: z.string().optional(),
  geometriesRunId: z.string().optional(),
  geometryOutputId: z.string().optional(),
})

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
  const [page, setPage] = useState(1)

  const { data } = useQuery({
    queryKey: [QueryKey.Geometries],
    queryFn: async () => {
      const res = client.api.v0.geometries.$get({
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

export const useGeometriesRuns = (_geometriesId?: string) => {
  const { geometriesId } = useGeometriesParams(_geometriesId)

  const [page, setPage] = useState(1)

  const { data } = useQuery({
    queryKey: [QueryKey.GeometriesRun, geometriesId],
    queryFn: async () => {
      if (!geometriesId) return null
      const res = client.api.v0['geometries'][':id']['runs'].$get({
        query: {
          page,
        },
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
    page,
    setPage,
  }
}

export const useGeometryOutputs = (_geometriesRunId?: string) => {
  const { geometriesRunId } = useGeometriesParams(undefined, _geometriesRunId)

  const [page, setPage] = useState(1)

  const { data } = useQuery({
    queryKey: [QueryKey.GeometryOutput, geometriesRunId],
    queryFn: async () => {
      if (!geometriesRunId) return null
      const res = client.api.v0['geometries-run'][':id']['outputs'].$get({
        query: {
          page,
        },
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
    page,
    setPage,
  }
}

export const useGeometries = (_geometriesId?: string) => {
  const { geometriesId } = useGeometriesParams(_geometriesId)

  return useQuery({
    queryKey: [QueryKey.Geometries, geometriesId],
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

  return useQuery({
    queryKey: [QueryKey.GeometriesRun, geometriesRunId],
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

  return useQuery({
    queryKey: [QueryKey.GeometryOutput, geometryOutputId],
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
  return useMutation({
    mutationFn: async (data: CreateGeometriesPayload) => {
      const res = client.api.v0.geometries.$post({
        json: data,
      })
      await unwrapResponse(res, 201)

      queryClient.invalidateQueries({
        queryKey: [QueryKey.Geometries],
      })
    },
  })
}

export const useCreateGeometriesRun = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateGeometriesRunPayload) => {
      const res = client.api.v0['geometries-run'].$post({
        json: data,
      })
      await unwrapResponse(res, 201)
      queryClient.invalidateQueries({
        queryKey: [QueryKey.GeometriesRun],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Geometries, data.geometriesId],
      })
    },
  })
}

export const useCreateGeometryOutput = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateGeometryOutputPayload) => {
      const res = client.api.v0['geometry-output'].$post({
        json: data,
      })
      await unwrapResponse(res, 201)
      queryClient.invalidateQueries({
        queryKey: [QueryKey.GeometryOutput],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.GeometriesRun, data.geometriesRunId],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.GeometriesRun],
      })
      // queryClient.invalidateQueries({
      //   queryKey: [QueryKey.Geometries, data.geom.geometriesId],
      // })
    },
  })
}

export const useUpdateGeometries = (_geometriesId?: string) => {
  const { geometriesId } = useGeometriesParams(_geometriesId)
  const queryClient = useQueryClient()

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
        queryKey: [QueryKey.Geometries, geometriesId],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Geometries],
      })
    },
  })
}

export const useUpdateGeometriesRun = (_geometriesRunId?: string) => {
  const { geometriesRunId } = useGeometriesParams(undefined, _geometriesRunId)
  const queryClient = useQueryClient()

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
        queryKey: [QueryKey.GeometriesRun, geometriesRunId],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.GeometriesRun],
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
        queryKey: [QueryKey.GeometryOutput, geometryOutputId],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.GeometryOutput],
      })
    },
  })
}

export const useSetGeometriesMainRun = (
  run?: GeometriesRunLinkParams | null,
) => {
  const queryClient = useQueryClient()

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
        queryKey: [QueryKey.GeometriesRun, run?.id],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.GeometriesRun],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Geometries, run?.geometries.id],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Geometries],
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
        queryKey: [QueryKey.Geometries],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Geometries, geometriesId],
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
        queryKey: [QueryKey.GeometriesRun],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Geometries, geometriesRunId],
      })
      if (redirect) {
        router.push(redirect)
      }
    },
  })
}

export type GeometriesLinkParams = Pick<GeometriesListItem, 'id' | 'name'>

export const useGeometriesLink = () =>
  useCallback(
    (geometries: GeometriesLinkParams) =>
      `/console/geometries/${geometries.id}`,
    [],
  )

export const useGeometriesRunsLink = () =>
  useCallback(
    (geometries: GeometriesLinkParams) =>
      `/console/geometries/${geometries.id}/runs`,
    [],
  )

export type GeometriesRunLinkParams = Pick<
  GeometriesRunDetail,
  'id' | 'name' | 'geometries'
>

export const useGeometriesRunLink = () =>
  useCallback(
    (geometriesRun: GeometriesRunLinkParams) =>
      `/console/geometries/${geometriesRun.geometries.id}/runs/${geometriesRun.id}`,
    [],
  )

export type GeometryOutputLinkParams = Pick<
  GeometryOutputDetail,
  'id' | 'geometriesRun' | 'name'
>

export const useGeometryOutputLink = () =>
  useCallback(
    (geometryOutput: GeometryOutputLinkParams) =>
      `/console/geometries/${geometryOutput.geometriesRun.geometries.id}/runs/${geometryOutput.geometriesRun.id}/outputs/${geometryOutput.id}`,
    [],
  )
