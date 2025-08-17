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

export type Geometries = NonNullable<
  InferResponseType<typeof client.api.v1.geometries.$get, 200>['data']
>['data'][0]

export type UpdateGeometriesPayload = NonNullable<
  InferRequestType<(typeof client.api.v1.geometries)[':id']['$patch']>['json']
>

export type CreateGeometriesPayload = NonNullable<
  InferRequestType<(typeof client.api.v1.geometries)['$post']>['json']
>

const geometriesIdSchema = z.object({
  geometriesId: z.string().optional(),
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

export const useGeometries = (id?: string) => {
  const { geometriesId } = id
    ? { geometriesId: id }
    : geometriesIdSchema.parse(useParams())

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
export const useDeleteGeometries = (redirect: string | null = null) => {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async (geometries: Geometries) => {
      const res = client.api.v1.geometries[':id'].$delete({
        param: {
          id: geometries.id,
        },
      })

      await unwrapResponse(res)
      return geometries
    },
    onSuccess: (geometries) => {
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Geometries],
      })
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Geometries, geometries.id],
      })
      if (redirect) {
        router.push(redirect)
      }
    },
  })
}

export const useGeometriesLink = () =>
  useCallback(
    (geometries: Pick<Geometries, 'id'>) =>
      `/console/geometries/${geometries.id}`,
    [],
  )
