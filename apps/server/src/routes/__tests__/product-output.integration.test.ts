import { beforeEach, describe, expect, it } from 'vitest'
import type { MultiPolygon } from 'geojson'
import {
  geometries,
  geometriesRun,
  geometryOutput,
  indicator,
  indicatorCategory,
  organization,
  productOutput,
} from '~/schemas/db'
import { seededIds, setupIsolatedTestFile } from '~/test-utils/integration'
import { expectJsonResponse } from './test-helpers'

const { createAppClient, createSessionHeaders, db } =
  await setupIsolatedTestFile(import.meta.url)

let adminClient: ReturnType<typeof createAppClient>
let memberClient: ReturnType<typeof createAppClient>

const testGeometry: MultiPolygon = {
  type: 'MultiPolygon',
  coordinates: [
    [
      [
        [0, 0],
        [0, 1],
        [1, 0],
        [0, 0],
      ],
    ],
  ],
}

const createForeignGeometryOutput = async (id: string) => {
  const now = new Date('2025-02-01T00:00:00.000Z')
  const geometriesId = `${id}-geometries`
  const geometriesRunId = `${id}-geometries-run`

  await db.insert(geometries).values({
    id: geometriesId,
    name: `${id} geometries`,
    description: null,
    metadata: null,
    organizationId: seededIds.organization,
    createdByUserId: seededIds.adminUser,
    visibility: 'private',
    createdAt: now,
    updatedAt: now,
    sourceUrl: null,
    sourceMetadataUrl: null,
    mainRunId: null,
  })

  await db.insert(geometriesRun).values({
    id: geometriesRunId,
    name: `${id} geometries run`,
    description: null,
    metadata: null,
    createdAt: now,
    updatedAt: now,
    geometriesId,
    imageCode: null,
    imageTag: null,
    provenanceJson: null,
    provenanceUrl: null,
    dataUrl: null,
    dataPmtilesUrl: null,
    dataType: 'geoparquet',
    dataSize: null,
    dataEtag: null,
  })

  await db.insert(geometryOutput).values({
    id,
    geometriesRunId,
    name: `${id} geometry output`,
    description: null,
    metadata: null,
    createdAt: now,
    updatedAt: now,
    properties: { localId: id },
    geometry: testGeometry,
  })

  return id
}

const createForeignPrivateIndicator = async () => {
  const now = new Date('2025-02-01T00:00:00.000Z')
  const organizationId = 'foreign-output-org'
  const categoryId = 'foreign-output-category'
  const indicatorId = 'foreign-output-indicator'

  await db.insert(organization).values({
    id: organizationId,
    slug: organizationId,
    name: 'Foreign Output Org',
    createdAt: now,
    metadata: '{}',
  })

  await db.insert(indicatorCategory).values({
    id: categoryId,
    name: 'Foreign Output Category',
    description: null,
    metadata: null,
    organizationId,
    createdByUserId: seededIds.adminUser,
    visibility: 'private',
    createdAt: now,
    updatedAt: now,
    parentId: null,
    displayOrder: 1,
  })

  await db.insert(indicator).values({
    id: indicatorId,
    name: 'Foreign Output Indicator',
    categoryId,
    description: null,
    unit: 'count',
    displayOrder: 1,
    metadata: null,
    organizationId,
    createdByUserId: seededIds.adminUser,
    visibility: 'private',
    createdAt: now,
    updatedAt: now,
  })

  return indicatorId
}

beforeEach(async () => {
  adminClient = createAppClient(
    await createSessionHeaders({
      email: 'product-output-admin@example.com',
      role: 'admin',
    }),
  )
  memberClient = createAppClient(
    await createSessionHeaders({
      email: 'product-output-user@example.com',
    }),
  )
})

describe('product-output route', () => {
  it('returns read responses with expected messages', async () => {
    await expectJsonResponse(
      await createAppClient().api.v0['product-output'][':id'].$get({
        param: { id: seededIds.productOutputTasmania2021 },
      }),
      {
        status: 404,
        message: 'Failed to get productOutput',
        description: "productOutput you're looking for is not found",
      },
    )

    const detailJson = await expectJsonResponse<{
      id: string
      indicator: { id: string } | null
    }>(
      await memberClient.api.v0['product-output'][':id'].$get({
        param: { id: seededIds.productOutputTasmania2021 },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )
    expect(detailJson.data.id).toBe(seededIds.productOutputTasmania2021)
    expect(detailJson.data.indicator?.id).toBe(seededIds.indicator)

    await expectJsonResponse(
      await memberClient.api.v0['product-output'][':id'].$get({
        param: { id: 'missing-product-output' },
      }),
      {
        status: 404,
        message: 'Failed to get productOutput',
        description: "productOutput you're looking for is not found",
      },
    )
  })

  it('returns write auth and success messages', async () => {
    await expectJsonResponse(
      await memberClient.api.v0['product-output'].$post({
        json: {
          productRunId: seededIds.productRun,
          geometryOutputId: seededIds.tasmaniaGeometryOutput,
          indicatorId: seededIds.indicator,
          timePoint: '2023-01-01T00:00:00.000Z',
          value: 123,
        },
      }),
      {
        status: 403,
        message: 'User is not authorized',
        description: null,
      },
    )

    const createdJson = await expectJsonResponse<{ id: string }>(
      await adminClient.api.v0['product-output'].$post({
        json: {
          productRunId: seededIds.productRun,
          geometryOutputId: seededIds.tasmaniaGeometryOutput,
          indicatorId: seededIds.indicator,
          timePoint: '2023-01-01T00:00:00.000Z',
          value: 123,
        },
      }),
      {
        status: 201,
        message: 'Product output created',
      },
    )

    const bulkJson = await expectJsonResponse<{ id: string }[]>(
      await adminClient.api.v0['product-output'].bulk.$post({
        json: {
          productRunId: seededIds.productRun,
          indicatorId: seededIds.indicator,
          timePoint: '2024-01-01T00:00:00.000Z',
          outputs: [
            {
              geometryOutputId: seededIds.tasmaniaGeometryOutput,
              value: 500,
            },
            {
              geometryOutputId: seededIds.mainlandGeometryOutput,
              value: 600,
            },
          ],
        },
      }),
      {
        status: 201,
        message: 'Product output created',
      },
    )
    expect(bulkJson.data).toHaveLength(2)

    await expectJsonResponse(
      await adminClient.api.v0['product-output'][':id'].$patch({
        param: { id: createdJson.data.id },
        json: {
          description: 'Updated product output',
        },
      }),
      {
        status: 200,
        message: 'Product output updated',
      },
    )

    const importJson = await expectJsonResponse<{
      insertedCount: number
      warnings: { message: string }[]
    }>(
      await adminClient.api.v0['product-output'].import.$post({
        form: {
          productRunId: seededIds.productRun,
          geometryColumn: 'geometryId',
          indicatorMappings: JSON.stringify([
            {
              column: 'forest_area',
              indicatorId: seededIds.indicator,
              timePoint: '2025-01-01T00:00:00.000Z',
            },
          ]),
          csvFile: new File(
            [
              ['geometryId,forest_area', 'tasmania,111', 'mainland,222'].join(
                '\n',
              ),
            ],
            'outputs.csv',
            { type: 'text/csv' },
          ),
        },
      }),
      {
        status: 201,
        message: 'Product outputs imported successfully',
      },
    )
    expect(importJson.data.insertedCount).toBe(2)
    expect(importJson.data.warnings).toEqual([])
  })

  it('rejects product output references outside the target product run graph', async () => {
    const foreignGeometryOutputId = await createForeignGeometryOutput(
      'foreign-product-output-geometry',
    )

    await expectJsonResponse(
      await adminClient.api.v0['product-output'].$post({
        json: {
          productRunId: seededIds.productRun,
          geometryOutputId: foreignGeometryOutputId,
          indicatorId: seededIds.indicator,
          timePoint: '2026-01-01T00:00:00.000Z',
          value: 10,
        },
      }),
      {
        status: 400,
        message: 'Failed to create productOutput',
        description:
          'Geometry output must belong to the product run geometries run.',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0['product-output'].bulk.$post({
        json: {
          productRunId: seededIds.productRun,
          indicatorId: seededIds.indicator,
          timePoint: '2026-01-01T00:00:00.000Z',
          outputs: [
            {
              geometryOutputId: foreignGeometryOutputId,
              value: 20,
            },
          ],
        },
      }),
      {
        status: 400,
        message: 'Failed to create productOutput',
        description:
          'Geometry output must belong to the product run geometries run.',
      },
    )

    const maliciousPrefixedGeometryOutputId = await createForeignGeometryOutput(
      `${seededIds.geometriesRun}-foreign`,
    )
    expect(maliciousPrefixedGeometryOutputId).toBe(
      `${seededIds.geometriesRun}-foreign`,
    )

    await expectJsonResponse(
      await adminClient.api.v0['product-output'].import.$post({
        form: {
          productRunId: seededIds.productRun,
          geometryColumn: 'geometryId',
          indicatorMappings: JSON.stringify([
            {
              column: 'forest_area',
              indicatorId: seededIds.indicator,
              timePoint: '2026-01-01T00:00:00.000Z',
            },
          ]),
          csvFile: new File(
            [['geometryId,forest_area', 'foreign,111'].join('\n')],
            'outputs.csv',
            { type: 'text/csv' },
          ),
        },
      }),
      {
        status: 400,
        message: 'Failed to import product outputs',
      },
    )

    const foreignIndicatorId = await createForeignPrivateIndicator()

    await expectJsonResponse(
      await adminClient.api.v0['product-output'].$post({
        json: {
          productRunId: seededIds.productRun,
          geometryOutputId: seededIds.tasmaniaGeometryOutput,
          indicatorId: foreignIndicatorId,
          timePoint: '2026-01-01T00:00:00.000Z',
          value: 10,
        },
      }),
      {
        status: 404,
        message: 'Failed to get productOutput',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0['product-output'].import.$post({
        form: {
          productRunId: seededIds.productRun,
          geometryColumn: 'geometryId',
          indicatorMappings: JSON.stringify([
            {
              column: 'forest_area',
              indicatorId: foreignIndicatorId,
              timePoint: '2026-01-01T00:00:00.000Z',
            },
          ]),
          csvFile: new File(
            [['geometryId,forest_area', 'tasmania,111'].join('\n')],
            'outputs.csv',
            { type: 'text/csv' },
          ),
        },
      }),
      {
        status: 404,
        message: 'Failed to get productOutput',
      },
    )
  })

  it('does not hydrate legacy product outputs with foreign geometry rows', async () => {
    const foreignGeometryOutputId = await createForeignGeometryOutput(
      'legacy-foreign-product-output-geometry',
    )
    const now = new Date('2025-02-01T00:00:00.000Z')
    const legacyOutputId = 'legacy-invalid-product-output'

    await db.insert(productOutput).values({
      id: legacyOutputId,
      name: 'Legacy invalid product output',
      description: null,
      metadata: null,
      createdAt: now,
      updatedAt: now,
      productRunId: seededIds.productRun,
      geometryOutputId: foreignGeometryOutputId,
      timePoint: new Date('2026-01-01T00:00:00.000Z'),
      value: 50,
      indicatorId: seededIds.indicator,
      derivedIndicatorId: null,
    })

    await expectJsonResponse(
      await memberClient.api.v0['product-output'][':id'].$get({
        param: { id: legacyOutputId },
      }),
      {
        status: 404,
        message: 'Failed to get productOutput',
      },
    )
  })
})
