import { describe, expect, it } from 'vitest'
import { setupIsolatedTestFile } from '~/test-utils/integration'
import { expectJsonResponse } from './test-helpers'

const { createAppClient } = await setupIsolatedTestFile(import.meta.url)

describe('healthcheck route', () => {
  it('returns a healthy response message', async () => {
    const response = await createAppClient().api.v0.healthcheck.$get()

    const json = await expectJsonResponse<{ message: string }>(response, {
      status: 200,
      message: 'OK',
    })

    expect(json.data.message).toBe('OK')
  })
})
