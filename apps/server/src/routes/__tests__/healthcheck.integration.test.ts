import { describe, expect, it } from 'vitest'
import { setupIsolatedTestFile } from '~/test-utils/integration'
import { expectJsonResponse } from './test-helpers'

const { createAppClient } = await setupIsolatedTestFile(import.meta.url)

describe('healthcheck route', () => {
  it('returns a healthy response message', async () => {
    const response = await createAppClient().api.v0.healthcheck.$get()

    const json = await expectJsonResponse<{
      message: string
      build: {
        name: string
        version: string
      }
    }>(response, {
      status: 200,
      message: 'OK',
    })

    expect(json.data.message).toBe('OK')
    expect(json.data.build.name).toBe('csdr-cloud-spatial-app')
    expect(json.data.build.version).toBeTruthy()
  })

  it('returns readiness when dependencies are reachable', async () => {
    const response = await createAppClient().api.v0.readiness.$get()

    const json = await expectJsonResponse<{
      status: string
      checks: {
        database: string
      }
    }>(response, {
      status: 200,
      message: 'OK',
    })

    expect(json.data.status).toBe('ready')
    expect(json.data.checks.database).toBe('ok')
  })
})
