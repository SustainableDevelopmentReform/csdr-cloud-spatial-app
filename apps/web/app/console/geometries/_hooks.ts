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
  InferResponseType<typeof client.api.v1.geometries.$get, 200>['data']
>['data'][0]
export type GeometriesDetail = NonNullable<
  InferResponseType<
    (typeof client.api.v1.geometries)[':id']['$get'],
    200
  >['data']
>

export type GeometriesRunListItem = NonNullable<
  InferResponseType<
    (typeof client.api.v1.geometries)[':id']['runs']['$get'],
    200
  >['data']
>['data'][0]
export type GeometriesRunDetail = NonNullable<
  InferResponseType<
    (typeof client.api.v1)['geometries-run'][':id']['$get'],
    200
  >['data']
>

export type GeometryOutputListItem = NonNullable<
  InferResponseType<
    (typeof client.api.v1)['geometries-run'][':id']['outputs']['$get'],
    200
  >['data']
>['data'][0]
export type GeometryOutputDetail = NonNullable<
  InferResponseType<
    (typeof client.api.v1)['geometry-output'][':id']['$get'],
    200
  >['data']
>

export type UpdateGeometriesPayload = NonNullable<
  InferRequestType<(typeof client.api.v1.geometries)[':id']['$patch']>['json']
>

export type UpdateGeometriesRunPayload = NonNullable<
  InferRequestType<
    (typeof client.api.v1)['geometries-run'][':id']['$patch']
  >['json']
>

export type UpdateGeometryOutputPayload = NonNullable<
  InferRequestType<
    (typeof client.api.v1)['geometry-output'][':id']['$patch']
  >['json']
>

export type CreateGeometriesPayload = NonNullable<
  InferRequestType<(typeof client.api.v1.geometries)['$post']>['json']
>

export type CreateGeometriesRunPayload = NonNullable<
  InferRequestType<(typeof client.api.v1)['geometries-run']['$post']>['json']
>

export type CreateGeometryOutputPayload = NonNullable<
  InferRequestType<(typeof client.api.v1)['geometry-output']['$post']>['json']
>

const geometriesParamsSchema = z.object({
  geometriesId: z.string().optional(),
  geometriesRunId: z.string().optional(),
  geometryOutputId: z.string().optional(),
})

export const useAllGeometries = () => {
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

  return {
    data,
    isOpen,
    setOpen,
    page,
    setPage,
  }
}

export const useGeometriesRuns = (_geometriesId?: string) => {
  const params = useParams()
  const { geometriesId } = _geometriesId
    ? { geometriesId: _geometriesId }
    : geometriesParamsSchema.parse(params)

  const [isOpen, setOpen] = useState(false)
  const [page, setPage] = useState(1)

  const { data } = useQuery({
    queryKey: [QueryKey.GeometriesRun, geometriesId],
    queryFn: async () => {
      if (!geometriesId) return null
      const res = client.api.v1['geometries'][':id']['runs'].$get({
        query: {
          page: page.toString(),
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
    isOpen,
    setOpen,
    page,
    setPage,
  }
}

export const useGeometryOutputs = (_geometriesRunId?: string) => {
  const params = useParams()
  const { geometriesRunId } = _geometriesRunId
    ? { geometriesRunId: _geometriesRunId }
    : geometriesParamsSchema.parse(params)

  const [isOpen, setOpen] = useState(false)
  const [page, setPage] = useState(1)

  const { data } = useQuery({
    queryKey: [QueryKey.GeometryOutput],
    queryFn: async () => {
      if (!geometriesRunId) return null
      const res = client.api.v1['geometries-run'][':id']['outputs'].$get({
        query: {
          page: page.toString(),
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
    isOpen,
    setOpen,
    page,
    setPage,
  }
}

export const useGeometries = (id?: string) => {
  const params = useParams()
  const { geometriesId } = id
    ? { geometriesId: id }
    : geometriesParamsSchema.parse(params)

  return useQuery({
    queryKey: [QueryKey.Geometries, geometriesId],
    queryFn: async () => {
      if (!geometriesId) return null
      const res = client.api.v1.geometries[':id'].$get({
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
  const params = useParams()
  const { geometriesRunId } = _geometriesRunId
    ? { geometriesRunId: _geometriesRunId }
    : geometriesParamsSchema.parse(params)

  return useQuery({
    queryKey: [QueryKey.GeometriesRun, geometriesRunId],
    queryFn: async () => {
      if (!geometriesRunId) return null
      const res = client.api.v1['geometries-run'][':id'].$get({
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
  const params = useParams()
  const { geometryOutputId } = _geometryOutputId
    ? { geometryOutputId: _geometryOutputId }
    : geometriesParamsSchema.parse(params)

  return useQuery({
    queryKey: [QueryKey.GeometryOutput, geometryOutputId],
    queryFn: async () => {
      if (!geometryOutputId) return null
      const res = client.api.v1['geometry-output'][':id'].$get({
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
      const res = client.api.v1.geometries.$post({
        json: data,
      })
      await unwrapResponse(res)

      queryClient.invalidateQueries({
        queryKey: [QueryKey.Geometries],
      })
    },
  })
}

export const useUpdateGeometries = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: { id: string } & UpdateGeometriesPayload) => {
      const res = client.api.v1.geometries[':id'].$patch({
        param: { id },
        json: payload,
      })
      return await unwrapResponse(res)
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Geometries, id],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Geometries],
      })
    },
  })
}

export const useUpdateGeometriesRun = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: { id: string } & UpdateGeometriesRunPayload) => {
      const res = client.api.v1['geometries-run'][':id'].$patch({
        param: { id },
        json: payload,
      })
      return await unwrapResponse(res)
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: [QueryKey.GeometriesRun, id],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.GeometriesRun],
      })
    },
  })
}

export const useUpdateGeometryOutput = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: { id: string } & UpdateGeometryOutputPayload) => {
      const res = client.api.v1['geometry-output'][':id'].$patch({
        param: { id },
        json: payload,
      })
      return await unwrapResponse(res)
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: [QueryKey.GeometryOutput, id],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.GeometryOutput],
      })
    },
  })
}

export const useDeleteGeometries = (redirect: string | null = null) => {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const res = client.api.v1.geometries[':id'].$delete({
        param: {
          id,
        },
      })

      return await unwrapResponse(res)
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Geometries],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Geometries, id],
      })
      if (redirect) {
        router.push(redirect)
      }
    },
  })
}

export const useDeleteGeometriesRun = (redirect: string | null = null) => {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const res = client.api.v1['geometries-run'][':id'].$delete({
        param: {
          id,
        },
      })

      return await unwrapResponse(res)
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: [QueryKey.GeometriesRun],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Geometries, id],
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
      `/console/geometries/${geometryOutput.geometriesRun.geometriesId}/runs/${geometryOutput.geometriesRun.id}/outputs/${geometryOutput.id}`,
    [],
  )
