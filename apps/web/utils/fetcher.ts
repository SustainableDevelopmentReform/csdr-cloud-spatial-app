import { type ClientResponse, hc } from 'hono/client'
import type { ApiRoutesType } from '@repo/server/app'
import { StatusCode } from 'hono/utils/http-status'

export type Client = ReturnType<typeof hc<ApiRoutesType>>

export const hcWithType = (...args: Parameters<typeof hc>): Client =>
  hc<ApiRoutesType>(...args)

export const client = hcWithType('/')

export async function unwrapResponse<
  Res extends ClientResponse<unknown, number, 'json'>,
  OKStatus extends StatusCode = 200,
>(f: Promise<Res>, okStatus: OKStatus = 200) {
  type SuccessResponse = Extract<Res, ClientResponse<unknown, OKStatus, 'json'>>
  type ErrorResponse = Exclude<Res, ClientResponse<unknown, OKStatus, 'json'>>
  type SuccessPayload<T> =
    T extends ClientResponse<infer Json, OKStatus, 'json'> ? Json : never
  type ErrorPayload<T> =
    T extends ClientResponse<infer Json, number, 'json'> ? Json : never

  const res = await f
  const payload = await res.json()

  if (res.status === okStatus) {
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
