import type { ApiRoutesType } from '@repo/server'
import { type ClientResponse, hc } from 'hono/client'

export const client = hc<ApiRoutesType>('/')

export function unwrapResponse<T>(f: Promise<ClientResponse<T>>): Promise<T> {
  return new Promise((resolve, reject) => {
    f.then(async (res) => {
      if (res.status >= 400) {
        reject((await res.json()) as T)
      } else {
        resolve((await res.json()) as T)
      }
    }).catch((err) => reject(err))
  })
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
