import type { ApiRoutesType } from '@repo/server'
import { type ClientResponse, hc } from 'hono/client'

export const client = hc<ApiRoutesType>('/')

export async function unwrapResponse<
  Res extends ClientResponse<unknown, number, 'json'>,
>(f: Promise<Res>) {
  type SuccessResponse = Extract<Res, ClientResponse<unknown, 200, 'json'>>
  type ErrorResponse = Exclude<Res, ClientResponse<unknown, 200, 'json'>>
  type SuccessPayload<T> =
    T extends ClientResponse<infer Json, 200, 'json'> ? Json : never
  type ErrorPayload<T> =
    T extends ClientResponse<infer Json, number, 'json'> ? Json : never

  const res = await f
  const payload = await res.json()

  if (res.status === 200) {
    return payload as SuccessPayload<SuccessResponse>
  }

  throw payload as ErrorPayload<ErrorResponse>
}

export enum QueryKey {
  Dataset = 'dataset',
  DatasetRun = 'dataset-run',
  Geometries = 'geometries',
  GeometriesRun = 'geometries-run',
  GeometryOutput = 'geometry-output',
  Product = 'product',
  ProductOutput = 'product-output',
  ProductRun = 'product-run',
  Users = 'users',
  ApiKeys = 'api-keys',
  UserProfile = 'user-profile',
  Variable = 'variable',
  VariableCategory = 'variable-category',
}
