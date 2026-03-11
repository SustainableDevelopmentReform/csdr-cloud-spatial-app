import { describe, expect, it } from 'vitest'
import { setupIsolatedTestFile } from '~/test-utils/integration'
import { expectJsonResponse } from './test-helpers'

const { app } = await setupIsolatedTestFile(import.meta.url)

describe('app routes', () => {
  it('serves the OpenAPI and Scalar endpoints', async () => {
    const docResponse = await app.request(
      new Request('http://localhost/api/v0/doc'),
    )

    expect(docResponse.status).toBe(200)
    expect(docResponse.headers.get('content-type')).toContain(
      'application/json',
    )

    const docJson = (await docResponse.json()) as {
      openapi: string
      info: { title: string }
      servers: { url: string }[]
    }

    expect(docJson.openapi).toBe('3.0.0')
    expect(docJson.info.title).toBe('CSDR Cloud Spatial API')
    expect(docJson.servers[0]?.url).toBe('http://localhost')

    const scalarResponse = await app.request(
      new Request('http://localhost/api/v0/scalar'),
    )

    expect(scalarResponse.status).toBe(200)
    expect(scalarResponse.headers.get('content-type')).toContain('text/html')

    const scalarHtml = await scalarResponse.text()

    expect(scalarHtml).toContain('/api/v0/doc')
  })

  it('returns the global not-found response for unknown endpoints', async () => {
    const missingRouteJson = await expectJsonResponse<null>(
      await app.request(new Request('http://localhost/api/v0/does-not-exist')),
      {
        status: 404,
        message:
          "Endpoint you're looking for is not found: http://localhost/api/v0/does-not-exist",
      },
    )
    expect(missingRouteJson.data).toBeNull()
  })
})
