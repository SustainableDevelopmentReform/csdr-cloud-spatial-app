import { beforeEach, describe, expect, it } from 'vitest'
import { seededIds, setupIsolatedTestFile } from '~/test-utils/integration'
import {
  expectJsonResponse,
  noMatchBoundsFilter,
  seededTasmaniaBounds,
  tasmaniaBoundsFilter,
} from './test-helpers'

const { createAppClient, createSessionHeaders } = await setupIsolatedTestFile(
  import.meta.url,
)

let adminClient: ReturnType<typeof createAppClient>
let memberClient: ReturnType<typeof createAppClient>

type DataLibraryResourceType = 'dataset' | 'boundary' | 'product'
type DataLibraryTestItem = {
  id: string
  name: string
  resourceType: DataLibraryResourceType
}
type DataLibraryTestResponse = {
  data: DataLibraryTestItem[]
  pageCount: number
  totalCount: number
}

beforeEach(async () => {
  adminClient = createAppClient(
    await createSessionHeaders({
      email: 'data-library-admin@example.com',
      role: 'admin',
    }),
  )
  memberClient = createAppClient(
    await createSessionHeaders({
      email: 'data-library-user@example.com',
    }),
  )
})

describe('data library route', () => {
  it('lists datasets, boundaries, and products for members', async () => {
    const anonymousListJson = await expectJsonResponse<DataLibraryTestResponse>(
      await createAppClient().api.v0['data-library'].$get({ query: {} }),
      {
        status: 200,
        message: 'OK',
      },
    )
    expect(anonymousListJson.data.totalCount).toBe(0)
    expect(anonymousListJson.data.data).toEqual([])

    const listJson = await expectJsonResponse<DataLibraryTestResponse>(
      await memberClient.api.v0['data-library'].$get({ query: {} }),
      {
        status: 200,
        message: 'OK',
      },
    )

    expect(listJson.data.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: seededIds.dataset,
          resourceType: 'dataset',
        }),
        expect.objectContaining({
          id: seededIds.geometries,
          resourceType: 'boundary',
        }),
        expect.objectContaining({
          id: seededIds.product,
          resourceType: 'product',
        }),
      ]),
    )
  })

  it('filters resources by type', async () => {
    const listJson = await expectJsonResponse<DataLibraryTestResponse>(
      await memberClient.api.v0['data-library'].$get({
        query: {
          resourceType: 'boundary',
        },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    expect(listJson.data.data.length).toBeGreaterThanOrEqual(1)
    expect(
      listJson.data.data.every((item) => item.resourceType === 'boundary'),
    ).toBe(true)
    expect(listJson.data.data.map((item) => item.id)).toContain(
      seededIds.geometries,
    )
    expect(listJson.data.data.map((item) => item.id)).not.toContain(
      seededIds.dataset,
    )
  })

  it('searches resources by name and description', async () => {
    const listJson = await expectJsonResponse<DataLibraryTestResponse>(
      await memberClient.api.v0['data-library'].$get({
        query: {
          search: 'Some Forest Cover Data',
        },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    const returnedIds = listJson.data.data.map((item) => item.id)
    expect(returnedIds).toContain(seededIds.dataset)
    expect(returnedIds).not.toContain(seededIds.geometries)
  })

  it('filters resources by area', async () => {
    await expectJsonResponse(
      await adminClient.api.v0['dataset-run'][':id'].$patch({
        param: { id: seededIds.datasetRun },
        json: {
          bounds: seededTasmaniaBounds,
        },
      }),
      {
        status: 200,
        message: 'Dataset run updated',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0['product-run'][':id']['refresh-summary'].$post({
        param: { id: seededIds.productRun },
      }),
      {
        status: 200,
        message: 'Product run summary refreshed',
      },
    )

    const matchingJson = await expectJsonResponse<DataLibraryTestResponse>(
      await memberClient.api.v0['data-library'].$get({
        query: tasmaniaBoundsFilter,
      }),
      {
        status: 200,
        message: 'OK',
      },
    )
    const matchingIds = matchingJson.data.data.map((item) => item.id)

    expect(matchingIds).toContain(seededIds.dataset)
    expect(matchingIds).toContain(seededIds.geometries)
    expect(matchingIds).toContain(seededIds.product)

    const noMatchJson = await expectJsonResponse<DataLibraryTestResponse>(
      await memberClient.api.v0['data-library'].$get({
        query: noMatchBoundsFilter,
      }),
      {
        status: 200,
        message: 'OK',
      },
    )
    const noMatchIds = noMatchJson.data.data.map((item) => item.id)

    expect(noMatchIds).not.toContain(seededIds.dataset)
    expect(noMatchIds).not.toContain(seededIds.geometries)
    expect(noMatchIds).not.toContain(seededIds.product)
  })

  it('sorts and paginates across mixed resource types', async () => {
    const firstPageJson = await expectJsonResponse<DataLibraryTestResponse>(
      await memberClient.api.v0['data-library'].$get({
        query: {
          sort: 'name',
          order: 'asc',
          size: 2,
        },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    expect(firstPageJson.data.totalCount).toBe(3)
    expect(firstPageJson.data.pageCount).toBe(2)
    expect(firstPageJson.data.data.map((item) => item.id)).toEqual([
      seededIds.geometries,
      seededIds.dataset,
    ])

    const secondPageJson = await expectJsonResponse<DataLibraryTestResponse>(
      await memberClient.api.v0['data-library'].$get({
        query: {
          sort: 'name',
          order: 'asc',
          size: 2,
          page: 2,
        },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )

    expect(secondPageJson.data.data.map((item) => item.id)).toEqual([
      seededIds.product,
    ])
  })
})
