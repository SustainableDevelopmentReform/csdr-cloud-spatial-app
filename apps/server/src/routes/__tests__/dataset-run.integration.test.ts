import { beforeEach, describe, expect, it } from 'vitest'
import { seededIds, setupIsolatedTestFile } from '~/test-utils/integration'
import { expectJsonResponse } from './test-helpers'

const { createAppClient, createSessionHeaders } = await setupIsolatedTestFile(
  import.meta.url,
)

let adminClient: ReturnType<typeof createAppClient>
let memberClient: ReturnType<typeof createAppClient>

beforeEach(async () => {
  adminClient = createAppClient(
    await createSessionHeaders({
      email: 'dataset-run-admin@example.com',
      role: 'admin',
    }),
  )
  memberClient = createAppClient(
    await createSessionHeaders({
      email: 'dataset-run-user@example.com',
    }),
  )
})

describe('dataset-run route', () => {
  it('returns read responses with expected messages', async () => {
    await expectJsonResponse(
      await createAppClient().api.v0['dataset-run'][':id'].$get({
        param: { id: seededIds.datasetRun },
      }),
      {
        status: 401,
        message: 'User is not authenticated',
        description: null,
      },
    )

    const detailJson = await expectJsonResponse<{
      id: string
      dataset: { id: string }
      productRunCount: number
    }>(
      await memberClient.api.v0['dataset-run'][':id'].$get({
        param: { id: seededIds.datasetRun },
      }),
      {
        status: 200,
        message: 'OK',
      },
    )
    expect(detailJson.data.id).toBe(seededIds.datasetRun)
    expect(detailJson.data.dataset.id).toBe(seededIds.dataset)
    expect(detailJson.data.productRunCount).toBe(1)

    await expectJsonResponse(
      await memberClient.api.v0['dataset-run'][':id'].$get({
        param: { id: 'missing-dataset-run' },
      }),
      {
        status: 404,
        message: 'Failed to get datasetRun',
      },
    )
  })

  it('returns write auth and success messages', async () => {
    await expectJsonResponse(
      await memberClient.api.v0['dataset-run'].$post({
        json: {
          datasetId: seededIds.dataset,
          name: 'Forbidden dataset run',
        },
      }),
      {
        status: 403,
        message: 'User is not authorized',
        description: null,
      },
    )

    const createdJson = await expectJsonResponse<{ id: string }>(
      await adminClient.api.v0['dataset-run'].$post({
        json: {
          datasetId: seededIds.dataset,
          name: 'Created dataset run',
        },
      }),
      {
        status: 201,
        message: 'Dataset run created',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0['dataset-run'][':id'].$patch({
        param: { id: createdJson.data.id },
        json: {
          description: 'Updated dataset run',
        },
      }),
      {
        status: 200,
        message: 'Dataset run updated',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0['dataset-run'][':id']['set-as-main-run'].$post({
        param: { id: createdJson.data.id },
      }),
      {
        status: 200,
        message: 'Dataset run set as main',
      },
    )

    const deleteTargetJson = await expectJsonResponse<{ id: string }>(
      await adminClient.api.v0['dataset-run'].$post({
        json: {
          datasetId: seededIds.dataset,
          name: 'Delete dataset run',
        },
      }),
      {
        status: 201,
        message: 'Dataset run created',
      },
    )

    await expectJsonResponse(
      await adminClient.api.v0['dataset-run'][':id'].$delete({
        param: { id: deleteTargetJson.data.id },
      }),
      {
        status: 200,
        message: 'Dataset run deleted',
      },
    )
  })
})
